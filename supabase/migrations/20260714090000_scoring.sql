-- =====================================================================
-- TVS · 0010 · Bodovanje: tablice + „ZAVRŠI TURNIR" obračun (Faza 3)
-- Tablica bodova je PODATAK (koordinator je menja); obračun je
-- SECURITY DEFINER funkcija — transakciona, radi je staff ili direktor.
-- =====================================================================

-- ---------- scoring_tables ----------
create table public.scoring_tables (
  id         uuid primary key default gen_random_uuid(),
  model      public.scoring_model not null default 'klasicni',
  kostur     int not null,                -- 8/16/32/64/128 (grupe koriste 8)
  serija     public.tournament_series not null,
  kolo       text not null,               -- dostignuto kolo (vidi check)
  bodovi     int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (model, kostur, serija, kolo),
  constraint scoring_kolo_chk check (kolo in (
    'pobednik','finale','polufinale','cetvrtfinale','osmina',
    'sesnaestina','tridesetdvojina','sezdesetcetvrtina','utesni'
  )),
  constraint scoring_kostur_chk check (kostur in (8, 16, 32, 64, 128))
);
alter table public.scoring_tables enable row level security;
create trigger trg_scoring_tables_updated_at before update on public.scoring_tables
  for each row execute function public.set_updated_at();

create policy "scoring: public read" on public.scoring_tables
  for select to anon, authenticated using (true);
create policy "scoring: staff write" on public.scoring_tables
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- podrazumevane tablice (klasicni model) ----------
-- Kostur 32 tačno iz specifikacije; ostali kosturi izvedeni istim
-- obrascem (koordinator ih koriguje po pravilniku kroz panel — Faza 4).
with serije as (
  select * from (values
    ('s2000'::public.tournament_series, array[2000,1200,720,360,180,90,45,22], 30),
    ('s1000',                           array[1000, 600,360,180, 90,45,22,11], 15),
    ('s500',                            array[ 500, 300,180, 90, 45,20,10, 5],  5),
    ('s250',                            array[ 250, 150, 90, 45, 20,10, 5, 2],  0)
  ) as v(serija, bodovi, utesni)
),
kosturi as (
  select * from (values (8, 4), (16, 5), (32, 6), (64, 7), (128, 8)) as v(kostur, n_kola)
),
kola as (
  select * from unnest(array[
    'pobednik','finale','polufinale','cetvrtfinale','osmina',
    'sesnaestina','tridesetdvojina','sezdesetcetvrtina'
  ]) with ordinality as v(kolo, pos)
)
insert into public.scoring_tables (model, kostur, serija, kolo, bodovi)
select 'klasicni'::public.scoring_model, k.kostur, s.serija, ko.kolo, s.bodovi[ko.pos]
from kosturi k
cross join serije s
join kola ko on ko.pos <= k.n_kola
union all
select 'klasicni'::public.scoring_model, k.kostur, s.serija, 'utesni', s.utesni
from kosturi k cross join serije s;

-- ---------- finish_tournament ----------
create or replace function public.finish_tournament(_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour record;
  v_draw record;
  v_week date := date_trunc('week', now())::date;
  v_n_best int;
  v_aktivno_do date;
  v_pair record;
begin
  -- autorizacija
  if not (public.is_staff() or public.is_tournament_director(_tournament_id)) then
    raise exception 'forbidden';
  end if;

  select t.* into v_tour from public.tournaments t where t.id = _tournament_id;
  if v_tour is null then raise exception 'tournament_not_found'; end if;
  if v_tour.status = 'zavrsen' then raise exception 'already_finished'; end if;

  -- validacija: nema radnih žrebova; svi mečevi objavljenih žrebova rešeni
  if exists (
    select 1 from public.draws d
    join public.tournament_events te on te.id = d.event_id
    where te.turnir_id = _tournament_id and d.status = 'radna'
  ) then raise exception 'working_draw_exists'; end if;

  if exists (
    select 1 from public.matches m
    join public.draws d on d.id = m.draw_id
    join public.tournament_events te on te.id = d.event_id
    where te.turnir_id = _tournament_id
      and d.status in ('objavljen', 'zakljucan')
      and m.winner_slot is null
  ) then raise exception 'unresolved_matches'; end if;

  if not exists (
    select 1 from public.draws d
    join public.tournament_events te on te.id = d.event_id
    where te.turnir_id = _tournament_id and d.status in ('objavljen', 'zakljucan')
  ) then raise exception 'no_published_draws'; end if;

  v_aktivno_do := coalesce(v_tour.datum_do, v_tour.datum_od, current_date) + 364;

  -- idempotentnost pri ispravkama: obriši stare bodove ovog turnira
  delete from public.ranking_points where tournament_id = _tournament_id;

  -- obračun po žrebu
  for v_draw in
    select d.id, d.tip, coalesce(d.kostur, 8) as kostur, te.kategorija, te.disciplina
    from public.draws d
    join public.tournament_events te on te.id = d.event_id
    where te.turnir_id = _tournament_id and d.status in ('objavljen', 'zakljucan')
  loop
    insert into public.ranking_points (player_id, tournament_id, kategorija, disciplina, bodovi, aktivno_do)
    select dostignuca.player_id, _tournament_id, v_draw.kategorija, v_draw.disciplina, st.bodovi, v_aktivno_do
    from (
      -- dostignuto kolo po igraču ovog žreba
      with mecevi as (
        select m.* from public.matches m where m.draw_id = v_draw.id
      ),
      ucesnici as (
        select distinct p as player_id
        from mecevi m, lateral (values (m.player1_id), (m.player2_id)) as u(p)
        where p is not null
      ),
      pobede as (
        select case when m.winner_slot = 1 then m.player1_id else m.player2_id end as player_id,
               count(*) as broj
        from mecevi m
        where m.winner_slot is not null and m.status <> 'bye'
        group by 1
      ),
      poslednje_kolo as (
        select u.player_id,
               max(m.kolo) as kolo
        from ucesnici u
        join mecevi m on (m.player1_id = u.player_id or m.player2_id = u.player_id)
        group by u.player_id
      ),
      finale as (
        -- pobednik završnice (samo eliminaciona kola; čista grupa nema finale)
        select case when m.winner_slot = 1 then m.player1_id else m.player2_id end as pobednik_id
        from mecevi m
        where m.kolo > 0 and m.kolo = (select max(kolo) from mecevi where kolo > 0)
          and m.pozicija = 1 and m.winner_slot is not null
        limit 1
      )
      select
        u.player_id,
        case
          -- pobednik celog žreba
          when u.player_id = (select pobednik_id from finale) then 'pobednik'
          -- eliminacija: oznaka po broju preostalih u poslednjem kolu igrača
          when v_draw.tip = 'eliminacija' then
            case
              when pk.kolo = 0 then 'utesni'  -- ispao u predkolu
              when pk.kolo = 1 and coalesce(pb.broj, 0) = 0 then 'utesni'  -- poraz u 1. kolu bez pobede
              else case v_draw.kostur / (2 ^ (pk.kolo - 1))::int
                when 2 then 'finale'
                when 4 then 'polufinale'
                when 8 then 'cetvrtfinale'
                when 16 then 'osmina'
                when 32 then 'sesnaestina'
                when 64 then 'tridesetdvojina'
                when 128 then 'sezdesetcetvrtina'
                else 'utesni'
              end
            end
          -- grupe sa završnicom (grupa5 / dve grupe): PF gubitnici =
          -- polufinale, finalista = finale; ostali iz grupe = cetvrtfinale
          when pk.kolo = 2 then 'finale'
          when pk.kolo = 1 then 'polufinale'
          else case
            -- čista grupa (3–4, bez završnice): rang po pobedama
            when not exists (select 1 from mecevi where kolo > 0) then
              case (select count(*) from pobede pb2
                    where pb2.broj > coalesce(pb.broj, 0)
                       or (pb2.broj = coalesce(pb.broj, 0) and pb2.player_id < u.player_id))
                when 0 then 'pobednik'
                when 1 then 'finale'
                when 2 then 'polufinale'
                else 'cetvrtfinale'
              end
            else 'cetvrtfinale'
          end
        end as kolo_label
      from ucesnici u
      join poslednje_kolo pk on pk.player_id = u.player_id
      left join pobede pb on pb.player_id = u.player_id
    ) as dostignuca
    join public.scoring_tables st
      on st.model = coalesce(v_tour.scoring_model, 'klasicni')
     and st.kostur = v_draw.kostur
     and st.serija = v_tour.serija
     and st.kolo = dostignuca.kolo_label
    where st.bodovi > 0;
  end loop;

  -- status turnira
  update public.tournaments set status = 'zavrsen' where id = _tournament_id;

  -- nedeljni rang za pogođene (kategorija × disciplina)
  select coalesce((select n_best from public.seasons where aktivna limit 1), 8) into v_n_best;

  for v_pair in
    select distinct te.kategorija, te.disciplina
    from public.tournament_events te where te.turnir_id = _tournament_id
  loop
    delete from public.rankings
    where kategorija = v_pair.kategorija and disciplina = v_pair.disciplina and nedelja = v_week;

    insert into public.rankings (player_id, kategorija, disciplina, bodovi, mesto, broj_turnira, nedelja)
    select player_id, v_pair.kategorija, v_pair.disciplina, bodovi,
           rank() over (order by bodovi desc), broj_turnira, v_week
    from (
      select player_id, sum(bodovi) as bodovi, count(*) as broj_turnira
      from (
        select player_id, bodovi,
               row_number() over (partition by player_id order by bodovi desc) as rn
        from public.ranking_points
        where kategorija = v_pair.kategorija and disciplina = v_pair.disciplina
          and (aktivno_do is null or aktivno_do >= current_date)
      ) rp
      where rn <= v_n_best
      group by player_id
    ) sums;
  end loop;
end;
$$;

revoke execute on function public.finish_tournament(uuid) from public, anon;
grant execute on function public.finish_tournament(uuid) to authenticated;

comment on function public.finish_tournament is
  '„ZAVRŠI TURNIR": validira žrebove, obračunava bodove po dostignutom kolu (scoring_tables), upisuje ranking_points i nedeljni rang. Staff ili direktor turnira.';

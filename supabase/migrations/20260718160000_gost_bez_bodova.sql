-- =====================================================================
-- TVS · 0026 · Gost ne dobija bodove — bodovi se prenose niz kostur
-- Pravilo saveza: gost (obično stranac; prijava status 'gost' ili legacy
-- 'gost-%') ne osvaja bodove. Njegova pozicija se prenosi na članove koje
-- je pobedio: poslednji pobeđeni nasleđuje gostov plasman, pretposlednji
-- upražnjeni plasman prethodnog, itd. (kaskada duž gostove putanje).
-- Gost pobeđen od gosta se preskače (bolja prečka ide sledećem članu).
-- U čistoj grupi (3–4, bez završnice) plasman se računa samo među
-- članovima. Gostu se ne upisuje nijedan red u ranking_points.
-- =====================================================================

-- redosled prečki (manji broj = bolji plasman) — za kaskadu
create or replace function public.scoring_kolo_rank(_kolo text)
returns int
language sql
immutable
as $$
  select case _kolo
    when 'pobednik' then 1
    when 'finale' then 2
    when 'polufinale' then 3
    when 'cetvrtfinale' then 4
    when 'osmina' then 5
    when 'sesnaestina' then 6
    when 'tridesetdvojina' then 7
    when 'sezdesetcetvrtina' then 8
    else 9  -- utesni
  end;
$$;

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
  v_model public.scoring_model;
  v_missing text;
  v_bez int;
  v_pw int;
  v_gost record;
  v_victim record;
  v_carry text;
  v_vlabel text;
  v_vgost boolean;
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

  -- model bodovanja: override na turniru → default sezone turnira → klasični
  v_model := coalesce(
    v_tour.scoring_model,
    (select s.default_scoring from public.seasons s where s.id = v_tour.season_id),
    'klasicni'::public.scoring_model
  );

  -- N najboljih: sezona turnira → aktivna sezona → 8
  v_n_best := coalesce(
    (select s.n_best from public.seasons s where s.id = v_tour.season_id),
    (select s.n_best from public.seasons s where s.aktivna limit 1),
    8
  );

  v_aktivno_do := coalesce(v_tour.datum_do, v_tour.datum_od, current_date) + 364;

  -- idempotentnost pri ispravkama: obriši stare bodove ovog turnira
  delete from public.ranking_points where tournament_id = _tournament_id;

  -- obračun po žrebu
  for v_draw in
    select d.id, d.tip, coalesce(d.kostur, 8) as kostur, te.id as event_id,
           te.kategorija, te.disciplina
    from public.draws d
    join public.tournament_events te on te.id = d.event_id
    where te.turnir_id = _tournament_id and d.status in ('objavljen', 'zakljucan')
  loop
    -- dostignuće po učesniku (kolo_label) + broj pobeda + oznaka gosta
    drop table if exists _ft_dostignuca;
    create temp table _ft_dostignuca on commit drop as
    with mecevi as (
      select m.* from public.matches m where m.draw_id = v_draw.id
    ),
    ucesnici as (
      select distinct p as player_id
      from mecevi m, lateral (values (m.player1_id), (m.player2_id)) as u(p)
      where p is not null
    ),
    gosti as (
      select u.player_id,
             (exists (
                select 1 from public.entries e
                where e.event_id = v_draw.event_id and e.player_id = u.player_id
                  and e.status = 'gost')
              or exists (
                select 1 from public.players p
                where p.id = u.player_id and p.legacy_id like 'gost-%')
             ) as gost
      from ucesnici u
    ),
    pobede as (
      select case when m.winner_slot = 1 then m.player1_id else m.player2_id end as player_id,
             count(*) as broj
      from mecevi m
      where m.winner_slot is not null and m.status <> 'bye'
      group by 1
    ),
    -- pobede „pre završnice": grupe → kolo 0; eliminacija → kola pre polufinala
    pobede_pre as (
      select case when m.winner_slot = 1 then m.player1_id else m.player2_id end as player_id,
             count(*) as broj
      from mecevi m
      where m.winner_slot is not null and m.status <> 'bye'
        and (
          (v_draw.tip <> 'eliminacija' and m.kolo = 0)
          or (v_draw.tip = 'eliminacija'
              and m.kolo <= coalesce((select max(kolo) from mecevi where kolo > 0), 0) - 2)
        )
      group by 1
    ),
    poslednje_kolo as (
      select u.player_id, max(m.kolo) as kolo
      from ucesnici u
      join mecevi m on (m.player1_id = u.player_id or m.player2_id = u.player_id)
      group by u.player_id
    ),
    finale as (
      select case when m.winner_slot = 1 then m.player1_id else m.player2_id end as pobednik_id
      from mecevi m
      where m.kolo > 0 and m.kolo = (select max(kolo) from mecevi where kolo > 0)
        and m.pozicija = 1 and m.winner_slot is not null
      limit 1
    )
    select
      u.player_id,
      g.gost,
      case
        when u.player_id = (select pobednik_id from finale) then 'pobednik'
        when v_draw.tip = 'eliminacija' then
          case
            when pk.kolo = 0 then 'utesni'
            when pk.kolo = 1 and coalesce(pb.broj, 0) = 0 then 'utesni'
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
        when pk.kolo = 2 then 'finale'
        when pk.kolo = 1 then 'polufinale'
        else case
          -- čista grupa (3–4, bez završnice): plasman SAMO među članovima
          when not exists (select 1 from mecevi where kolo > 0) then
            case (select count(*) from pobede pb2
                  join gosti g2 on g2.player_id = pb2.player_id
                  where not g2.gost
                    and (pb2.broj > coalesce(pb.broj, 0)
                         or (pb2.broj = coalesce(pb.broj, 0) and pb2.player_id < u.player_id)))
              when 0 then 'pobednik'
              when 1 then 'finale'
              when 2 then 'polufinale'
              else 'cetvrtfinale'
            end
          else 'cetvrtfinale'
        end
      end as kolo_label,
      coalesce(pb.broj, 0) as ukupno_pobeda,
      coalesce(pp.broj, 0) as pobeda_pre
    from ucesnici u
    join gosti g on g.player_id = u.player_id
    join poslednje_kolo pk on pk.player_id = u.player_id
    left join pobede pb on pb.player_id = u.player_id
    left join pobede_pre pp on pp.player_id = u.player_id;

    -- ---- gost ne dobija bodove: plasman se prenosi niz kostur ----
    -- Za svakog gosta: pobeđeni u poslednjem meču nasleđuje gostov plasman,
    -- prethodni pobeđeni upražnjeni plasman prethodnog, itd. (samo završnica,
    -- kolo > 0). Gost pobeđen od gosta se preskače — bolja prečka ide dalje.
    for v_gost in
      select d.player_id, d.kolo_label from _ft_dostignuca d where d.gost
      order by public.scoring_kolo_rank(d.kolo_label)
    loop
      v_carry := v_gost.kolo_label;
      for v_victim in
        select case when m.winner_slot = 1 then m.player2_id else m.player1_id end as player_id
        from public.matches m
        where m.draw_id = v_draw.id and m.kolo > 0
          and m.winner_slot is not null and m.status <> 'bye'
          and (case when m.winner_slot = 1 then m.player1_id else m.player2_id end) = v_gost.player_id
          and (case when m.winner_slot = 1 then m.player2_id else m.player1_id end) is not null
        order by m.kolo desc
      loop
        select d.kolo_label, d.gost into v_vlabel, v_vgost
        from _ft_dostignuca d where d.player_id = v_victim.player_id;
        if v_vlabel is null then continue; end if;
        if v_vgost then
          continue; -- gost ne prima; prečka ide sledećem članu
        end if;
        if public.scoring_kolo_rank(v_carry) < public.scoring_kolo_rank(v_vlabel) then
          update _ft_dostignuca set kolo_label = v_carry
          where player_id = v_victim.player_id;
        end if;
        v_carry := v_vlabel; -- upražnjena prečka za sledećeg pobeđenog
      end loop;
    end loop;

    if v_model = 'klasicni' then
      -- validacija: svako dostignuto kolo (članova) mora imati ćeliju u tablici
      select string_agg(distinct d.kolo_label, ', ') into v_missing
      from _ft_dostignuca d
      where not d.gost and not exists (
        select 1 from public.scoring_tables st
        where st.model = 'klasicni' and st.kostur = v_draw.kostur
          and st.serija = v_tour.serija and st.kolo = d.kolo_label
      );
      if v_missing is not null then
        raise exception 'missing_scoring_cell:%:%:%', v_tour.serija, v_draw.kostur, v_missing;
      end if;

      insert into public.ranking_points (player_id, tournament_id, kategorija, disciplina, bodovi, aktivno_do)
      select d.player_id, _tournament_id, v_draw.kategorija, v_draw.disciplina, st.bodovi, v_aktivno_do
      from _ft_dostignuca d
      join public.scoring_tables st
        on st.model = 'klasicni' and st.kostur = v_draw.kostur
       and st.serija = v_tour.serija and st.kolo = d.kolo_label
      where not d.gost and st.bodovi > 0;
    else
      -- svi_boduju: plasman (pobednik/finale/polufinale) + pobede pre završnice
      -- × „pobeda_u_grupi"; donja granica za svakog ČLANA = „bez_pobede".
      select string_agg(distinct req.kolo, ', ') into v_missing
      from (
        select unnest(array['pobeda_u_grupi', 'bez_pobede']) as kolo
        union
        select d.kolo_label from _ft_dostignuca d
        where not d.gost and d.kolo_label in ('pobednik', 'finale', 'polufinale')
      ) req
      where not exists (
        select 1 from public.scoring_tables st
        where st.model = 'svi_boduju' and st.kostur = 8
          and st.serija = v_tour.serija and st.kolo = req.kolo
      );
      if v_missing is not null then
        raise exception 'missing_scoring_cell:%:%:%', v_tour.serija, 8, v_missing;
      end if;

      select bodovi into v_bez from public.scoring_tables
      where model = 'svi_boduju' and kostur = 8 and serija = v_tour.serija and kolo = 'bez_pobede';
      select bodovi into v_pw from public.scoring_tables
      where model = 'svi_boduju' and kostur = 8 and serija = v_tour.serija and kolo = 'pobeda_u_grupi';

      insert into public.ranking_points (player_id, tournament_id, kategorija, disciplina, bodovi, aktivno_do)
      select d.player_id, _tournament_id, v_draw.kategorija, v_draw.disciplina, b.bodovi, v_aktivno_do
      from _ft_dostignuca d
      left join public.scoring_tables st
        on st.model = 'svi_boduju' and st.kostur = 8
       and st.serija = v_tour.serija and st.kolo = d.kolo_label
       and d.kolo_label in ('pobednik', 'finale', 'polufinale')
      cross join lateral (values (
        greatest(coalesce(st.bodovi, 0) + d.pobeda_pre * v_pw, v_bez)
      )) as b(bodovi)
      where not d.gost and b.bodovi > 0;
    end if;
  end loop;

  drop table if exists _ft_dostignuca;

  -- status turnira
  update public.tournaments set status = 'zavrsen' where id = _tournament_id;

  -- nedeljni rang za pogođene (kategorija × disciplina)
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
  '„ZAVRŠI TURNIR": validira žrebove i tablicu, obračunava bodove (gost ne dobija bodove — plasman se prenosi niz kostur na pobeđene članove), upisuje ranking_points i nedeljni rang. Model i n_best iz sezone turnira. Staff ili direktor.';

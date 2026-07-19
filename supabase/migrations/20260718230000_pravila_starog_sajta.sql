-- =====================================================================
-- TVS · 0030 · Usklađivanje pravila sa starim sajtom (teniskiveteranisrbije.com)
-- 1) UTEŠNI bodovi zavise od KOSTURA: bodovi 1. kola ÷ 3 (potvrđeno na
--    stotinama uvezenih redova istorije: s1000 → 60/30/15 za kosture
--    8/16/32; s2000 → 120/60/30) — do sada fiksno po seriji.
-- 2) Rang lista = 13 NAJBOLJIH rezultata (FAQ starog sajta; spec dozvoljava
--    8/10/13, koordinator može promeniti) — n_best 8→13 + preračun.
-- 3) Propozicije: „predaja meča = igrač gubi sve poene turnira" —
--    finish_tournament v6 isključuje igrača koji je IZGUBIO meč predajom.
--    'retiranje' (povreda tokom meča) i dalje boduje; kazne za
--    nepojavljivanje (walkover) su posebna evidencija (disciplinska).
-- 4) Kategorije (pravilnik): zahtev za promenu SAMO ka jačoj (I najjača;
--    ka slabijoj odlučuje komisija ručno) + najviše JEDNA odobrena
--    promena godišnje; početni izbor uz starosne minimume
--    (II≥35, III≥45, IV≥50, V≥60).
-- =====================================================================

-- ---------- 1) utešni po kosturu (bodovi 1. kola ÷ 3) ----------
update public.scoring_tables u
set bodovi = round(fr.bodovi / 3.0)
from public.scoring_tables fr
where u.model = 'klasicni' and u.kolo = 'utesni'
  and fr.model = 'klasicni' and fr.serija = u.serija and fr.kostur = u.kostur
  and fr.kolo = case u.kostur
    when 8 then 'cetvrtfinale'
    when 16 then 'osmina'
    when 32 then 'sesnaestina'
    when 64 then 'tridesetdvojina'
    when 128 then 'sezdesetcetvrtina'
  end;

-- ---------- 2) 13 najboljih ----------
update public.seasons set n_best = 13 where aktivna;

-- ---------- 4) promena kategorije: samo ka jačoj, jednom godišnje ----------
create or replace function public.request_category_change(
  _trazena public.quality_category, _obrazlozenje text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pid uuid := public.my_player_id();
  v_trenutna public.quality_category;
  v_godiste int;
  v_starost int;
begin
  if v_pid is null then raise exception 'no_player'; end if;

  select kategorija, godiste into v_trenutna, v_godiste from public.players where id = v_pid;
  if v_trenutna is not distinct from _trazena then raise exception 'same_category'; end if;

  -- samo ka JAČOJ kategoriji (enum redosled I<II<III<IV<V; I najjača)
  if v_trenutna is not null and _trazena > v_trenutna then
    raise exception 'only_stronger';
  end if;

  -- početni izbor (bez kategorije): starosni minimumi po pravilniku
  if v_trenutna is null and v_godiste is not null then
    v_starost := extract(year from current_date)::int - v_godiste;
    if (_trazena = 'II' and v_starost < 35)
       or (_trazena = 'III' and v_starost < 45)
       or (_trazena = 'IV' and v_starost < 50)
       or (_trazena = 'V' and v_starost < 60) then
      raise exception 'age_minimum';
    end if;
  end if;

  -- najviše jedna ODOBRENA promena godišnje
  if exists (
    select 1 from public.category_change_requests r
    where r.player_id = v_pid and r.status = 'odobren'
      and extract(year from r.created_at) = extract(year from current_date)
  ) then
    raise exception 'yearly_limit';
  end if;

  begin
    insert into public.category_change_requests (player_id, trenutna_kat, trazena_kat, obrazlozenje)
    values (v_pid, v_trenutna, _trazena, nullif(btrim(_obrazlozenje), ''));
  exception when unique_violation then
    raise exception 'pending_exists';
  end;
end;
$$;
revoke execute on function public.request_category_change(public.quality_category, text) from public, anon;
grant execute on function public.request_category_change(public.quality_category, text) to authenticated;

-- ---------- 3) finish_tournament v6: predaja = 0 poena ----------
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
  v_solo_ev record;
  v_solo_bodovi int;
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
  ) and not exists (
    -- turnir sme da se završi i kad ima SAMO solo kategorije (singl,
    -- nikad nije imala žreb, tačno 1 prijavljen član)
    select 1 from public.tournament_events te
    where te.turnir_id = _tournament_id
      and te.disciplina = 'singl'
      and not exists (select 1 from public.draws d where d.event_id = te.id)
      and (select count(*) from public.entries e
           where e.event_id = te.id and e.status in ('prijavljen', 'gost')) = 1
      and (select count(*) from public.entries e
           where e.event_id = te.id and e.status = 'prijavljen') = 1
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
    ),
    -- čista grupa: statistika za tie-break (setovi/gemovi iz match_sets)
    grupa_stats as (
      select u.player_id,
             coalesce(pb.broj, 0) as pobede,
             coalesce(s.setw, 0) - coalesce(s.setl, 0) as set_razlika,
             coalesce(s.gemw, 0) - coalesce(s.geml, 0) as gem_razlika
      from ucesnici u
      left join pobede pb on pb.player_id = u.player_id
      left join lateral (
        select
          sum(case when (m.player1_id = u.player_id and ms.gem1 > ms.gem2)
                     or (m.player2_id = u.player_id and ms.gem2 > ms.gem1) then 1 else 0 end) as setw,
          sum(case when (m.player1_id = u.player_id and ms.gem1 < ms.gem2)
                     or (m.player2_id = u.player_id and ms.gem2 < ms.gem1) then 1 else 0 end) as setl,
          sum(case when m.player1_id = u.player_id then ms.gem1 else ms.gem2 end) as gemw,
          sum(case when m.player1_id = u.player_id then ms.gem2 else ms.gem1 end) as geml
        from mecevi m
        join public.match_sets ms on ms.match_id = m.id
        where m.kolo = 0 and (m.player1_id = u.player_id or m.player2_id = u.player_id)
      ) s on true
    ),
    -- međusobni duel: samo kad su TAČNO DVA člana izjednačena po pobedama
    grupa_h2h as (
      select a.player_id,
             case when exists (
               select 1 from mecevi m
               where m.kolo = 0 and m.winner_slot is not null
                 and ((m.player1_id = a.player_id and m.player2_id = b.player_id and m.winner_slot = 1)
                   or (m.player2_id = a.player_id and m.player1_id = b.player_id and m.winner_slot = 2))
             ) then 0 else 1 end as h2h
      from grupa_stats a
      join gosti ga on ga.player_id = a.player_id and not ga.gost
      join grupa_stats b on b.player_id <> a.player_id and b.pobede = a.pobede
      join gosti gb on gb.player_id = b.player_id and not gb.gost
      where (select count(*) from grupa_stats c
             join gosti gc on gc.player_id = c.player_id
             where not gc.gost and c.pobede = a.pobede) = 2
    ),
    -- konačan plasman u čistoj grupi (samo članovi):
    -- pobede → h2h → set-razlika → gem-razlika → determinizam
    grupa_rang as (
      select gs.player_id,
             row_number() over (
               order by gs.pobede desc, coalesce(h.h2h, 0),
                        gs.set_razlika desc, gs.gem_razlika desc, gs.player_id
             ) - 1 as rang
      from grupa_stats gs
      join gosti g on g.player_id = gs.player_id and not g.gost
      left join grupa_h2h h on h.player_id = gs.player_id
    )
    select
      u.player_id,
      g.gost,
      exists (
        select 1 from mecevi m
        where m.status = 'predaja' and m.winner_slot is not null
          and (case when m.winner_slot = 1 then m.player2_id else m.player1_id end) = u.player_id
      ) as predao,
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
          -- čista grupa (bez završnice): plasman SAMO među članovima,
          -- tie-break: pobede → h2h → setovi → gemovi
          when not exists (select 1 from mecevi where kolo > 0) then
            case coalesce((select gr.rang from grupa_rang gr where gr.player_id = u.player_id), 3)
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
      where not d.gost and not d.predao and st.bodovi > 0;
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
      where not d.gost and not d.predao and b.bodovi > 0;
    end if;
  end loop;

  drop table if exists _ft_dostignuca;

  -- kategorija sa samo jednim prijavljenim ČLANOM (bez objavljenog žreba):
  -- pobednik „bez borbe" — bodovi pobednika za kostur 8 svoje kategorije.
  for v_solo_ev in
    select te.id, te.kategorija, te.disciplina,
           (select e.player_id from public.entries e
            where e.event_id = te.id and e.status = 'prijavljen' limit 1) as pid
    from public.tournament_events te
    where te.turnir_id = _tournament_id
      and te.disciplina = 'singl'
      and not exists (select 1 from public.draws d where d.event_id = te.id)
      and (select count(*) from public.entries e
           where e.event_id = te.id and e.status in ('prijavljen', 'gost')) = 1
      and (select count(*) from public.entries e
           where e.event_id = te.id and e.status = 'prijavljen') = 1
  loop
    -- gost kao jedini prijavljen ne dobija ništa (uslovi gore ga isključuju);
    -- 'gost-%' legacy igrač sa statusom 'prijavljen' takođe ne dobija
    if exists (select 1 from public.players p
               where p.id = v_solo_ev.pid and p.legacy_id like 'gost-%') then
      continue;
    end if;

    select bodovi into v_solo_bodovi from public.scoring_tables
    where model = v_model and kostur = 8 and serija = v_tour.serija and kolo = 'pobednik';
    if v_solo_bodovi is null then
      raise exception 'missing_scoring_cell:%:%:pobednik', v_tour.serija, 8;
    end if;

    insert into public.ranking_points (player_id, tournament_id, kategorija, disciplina, bodovi, aktivno_do)
    values (v_solo_ev.pid, _tournament_id, v_solo_ev.kategorija, v_solo_ev.disciplina,
            v_solo_bodovi, v_aktivno_do);
  end loop;

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
  '„ZAVRŠI TURNIR“: obračun bodova (gost bez bodova — prenos niz kostur; predaja meča = 0 poena na turniru; solo kategorija = pobednik bez borbe; čista grupa tie-break po spec-u), ranking_points + nedeljni rang. Staff ili direktor.';

select public.recalc_weekly_rankings();

-- =====================================================================
-- TVS · 0012 · View plasmana (1/2/3. mesto) po konkurenciji
-- Služi za: pobednike na kartici turnira (kalendar/arhiva) i
-- trofeje na profilu igrača. security_invoker → poštuje RLS (samo
-- objavljeni/zaključani žrebovi vidljivi javnosti).
-- =====================================================================

create or replace view public.player_podiums
with (security_invoker = on)
as
with draw_max as (
  select m.draw_id, max(m.kolo) as maxk
  from public.matches m
  join public.draws d on d.id = m.draw_id
  where d.status in ('objavljen', 'zakljucan') and m.kolo > 0
  group by m.draw_id
),
placed as (
  -- pobednik finala = 1. mesto
  select m.draw_id,
         case when m.winner_slot = 1 then m.player1_id else m.player2_id end as pid,
         1 as mesto
  from public.matches m
  join draw_max dm on dm.draw_id = m.draw_id and dm.maxk = m.kolo
  where m.pozicija = 1 and m.winner_slot is not null and m.status <> 'bye'
  union all
  -- poraženi u finalu = 2. mesto
  select m.draw_id,
         case when m.winner_slot = 1 then m.player2_id else m.player1_id end as pid,
         2 as mesto
  from public.matches m
  join draw_max dm on dm.draw_id = m.draw_id and dm.maxk = m.kolo
  where m.pozicija = 1 and m.winner_slot is not null and m.status <> 'bye'
  union all
  -- poraženi u polufinalu = 3. mesto (samo ako postoji kolo ispod finala)
  select m.draw_id,
         case when m.winner_slot = 1 then m.player2_id else m.player1_id end as pid,
         3 as mesto
  from public.matches m
  join draw_max dm on dm.draw_id = m.draw_id and dm.maxk = m.kolo + 1
  where m.winner_slot is not null and m.status <> 'bye' and dm.maxk >= 2
)
select p.pid as player_id,
       te.turnir_id,
       te.id as event_id,
       te.kategorija,
       te.disciplina,
       p.mesto
from placed p
join public.draws d on d.id = p.draw_id
join public.tournament_events te on te.id = d.event_id
where p.pid is not null;

grant select on public.player_podiums to anon, authenticated;

comment on view public.player_podiums is
  'Plasman 1/2/3 po konkurenciji (finale pobednik/poraženi, polufinale poraženi). Za pobednike turnira i trofeje igrača.';

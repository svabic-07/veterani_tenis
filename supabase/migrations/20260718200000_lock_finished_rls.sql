-- =====================================================================
-- TVS · 0028 · Zaključavanje završenog turnira i u RLS sloju
-- (Codex+Claude revizija, nalaz #1): guardOpen u server akcijama je
-- popravljen da status čita iz entiteta, ali je RLS dozvoljavao
-- direktoru/staffu da PostgREST-om direktno menja prijave/žrebove/mečeve
-- završenog turnira. can_edit_event = can_manage_event + turnir nije
-- završen; primenjeno na SVE „manager write" politike. Čitanje netaknuto.
-- Koordinatorske ispravke idu kroz SECURITY DEFINER funkcije
-- (revoke_draw / clear_match_result / reopen_tournament) — RLS ih ne dira.
-- =====================================================================

create or replace function public.can_edit_event(_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_event(_event_id) and not exists (
    select 1
    from public.tournament_events te
    join public.tournaments t on t.id = te.turnir_id
    where te.id = _event_id and t.status = 'zavrsen'
  );
$$;
revoke execute on function public.can_edit_event(uuid) from public, anon;
grant execute on function public.can_edit_event(uuid) to authenticated;
comment on function public.can_edit_event is
  'can_manage_event + turnir nije završen — za RLS politike pisanja.';

alter policy "entries: manager write" on public.entries
  using (public.can_edit_event(event_id))
  with check (public.can_edit_event(event_id));

alter policy "draws: manager write" on public.draws
  using (public.can_edit_event(event_id))
  with check (public.can_edit_event(event_id));

alter policy "matches: manager write" on public.matches
  using (exists (
    select 1 from public.draws d
    where d.id = draw_id and public.can_edit_event(d.event_id)
  ))
  with check (exists (
    select 1 from public.draws d
    where d.id = draw_id and public.can_edit_event(d.event_id)
  ));

alter policy "match_sets: manager write" on public.match_sets
  using (exists (
    select 1 from public.matches m
    join public.draws d on d.id = m.draw_id
    where m.id = match_id and public.can_edit_event(d.event_id)
  ))
  with check (exists (
    select 1 from public.matches m
    join public.draws d on d.id = m.draw_id
    where m.id = match_id and public.can_edit_event(d.event_id)
  ));

-- direktor ne menja podatke svog ZAVRŠENOG turnira (staff politika ostaje
-- šira — koordinatorske korekcije; UI akcije su ionako zaključane)
alter policy "tournaments: director update own" on public.tournaments
  using (public.is_referee() and public.is_tournament_director(id) and status <> 'zavrsen')
  with check (public.is_referee() and public.is_tournament_director(id));

alter policy "events: director write own" on public.tournament_events
  using (public.is_referee() and public.is_tournament_director(turnir_id)
         and not exists (select 1 from public.tournaments t
                         where t.id = turnir_id and t.status = 'zavrsen'))
  with check (public.is_referee() and public.is_tournament_director(turnir_id)
              and not exists (select 1 from public.tournaments t
                              where t.id = turnir_id and t.status = 'zavrsen'));

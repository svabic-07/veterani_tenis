-- =====================================================================
-- Samostalna prijava igrača (singl) — igrački portal
-- Igrač sa povezanim profilom (profiles.player_id) sam upisuje i povlači
-- SVOJU prijavu u singl konkurenciju turnira koji je predstojeći (po datumu),
-- u roku prijave i pre objave žreba. Bodovi za nošenje se pune triggerom,
-- tako da se ne mogu lažirati pri samoprijavi.
-- Original (draws migracija) je ovo i najavio: "Samostalna prijava — kasnije."
-- =====================================================================

-- player_id povezan sa nalogom (auth.uid())
create or replace function public.my_player_id()
returns uuid
language sql stable security definer set search_path = 'public'
as $$
  select player_id from public.profiles where id = auth.uid();
$$;

-- Da li konkurencija prima samostalnu prijavu:
--   singl · turnir predstojeći (po datumu) · u roku · bez objavljenog žreba
create or replace function public.can_self_enter_event(_event_id uuid)
returns boolean
language sql stable security definer set search_path = 'public'
as $$
  select exists (
    select 1
    from public.tournament_events te
    join public.tournaments t on t.id = te.turnir_id
    where te.id = _event_id
      and te.disciplina = 'singl'
      and coalesce(t.datum_do, t.datum_od) >= current_date
      and (t.rok_prijave is null or now() <= t.rok_prijave)
      and not exists (
        select 1 from public.draws d
        where d.event_id = te.id and d.status in ('objavljen', 'zakljucan')
      )
  );
$$;

-- Bodovi za nošenje (snapshot) — UVEK se preračunavaju iz rankings po
-- (kategorija, disciplina), da igrač ne može da ih lažira pri samoprijavi.
-- Isti izvor koji koristi i direktorov unos, pa je vrednost konzistentna.
create or replace function public.entries_fill_snapshot()
returns trigger
language plpgsql security definer set search_path = 'public'
as $$
declare
  ev  record;
  pts int;
begin
  select kategorija, disciplina into ev
  from public.tournament_events where id = new.event_id;
  if not found then
    return new;
  end if;
  select bodovi into pts
  from public.rankings
  where player_id = new.player_id
    and kategorija = ev.kategorija
    and disciplina = ev.disciplina
  order by nedelja desc
  limit 1;
  new.bodovi_snapshot := pts;  -- null ako igrač nema rang u toj konkurenciji
  return new;
end;
$$;

drop trigger if exists trg_entries_fill_snapshot on public.entries;
create trigger trg_entries_fill_snapshot
  before insert on public.entries
  for each row execute function public.entries_fill_snapshot();

-- RLS: igrač upisuje SVOJU singl prijavu (prijavljen, bez partnera/nosioca)
create policy "entries: self enter" on public.entries
  for insert to authenticated
  with check (
    player_id = public.my_player_id()
    and player_id is not null
    and partner_id is null
    and seed is null
    and status = 'prijavljen'
    and public.can_self_enter_event(event_id)
  );

-- RLS: igrač povlači SVOJU prijavu dok su prijave otvorene (pre žreba/roka)
create policy "entries: self withdraw" on public.entries
  for delete to authenticated
  using (
    player_id = public.my_player_id()
    and status = 'prijavljen'
    and public.can_self_enter_event(event_id)
  );

-- Definer funkcije dostupne samo prijavljenima (u skladu sa hardening migracijom)
revoke execute on function public.my_player_id() from anon;
revoke execute on function public.can_self_enter_event(uuid) from anon;

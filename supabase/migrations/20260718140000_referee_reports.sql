-- =====================================================================
-- TVS · 0025 · Izveštaj sudije (evidencija loptica + sporne situacije)
-- Spec (Faza 3): „Dodeljene/potrošene loptice, prijava spornih situacija —
-- izveštaj koordinatoru saveza." Interni podatak (NE javno čitanje):
-- vidi/piše staff i direktor turnira; koordinator pregleda u panelu.
-- Izveštaj se piše NA KRAJU turnira, pa ostaje upisiv i posle „ZAVRŠI
-- TURNIR" (ne menja rezultate ni bodove).
-- =====================================================================

create table public.referee_reports (
  id                 uuid primary key default gen_random_uuid(),
  tournament_id      uuid not null unique references public.tournaments (id) on delete cascade,
  loptice_dodeljeno  int check (loptice_dodeljeno is null or loptice_dodeljeno >= 0),
  loptice_potroseno  int check (loptice_potroseno is null or loptice_potroseno >= 0),
  sporne             text,   -- sporne situacije / prigovori
  napomena           text,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index referee_reports_tournament_idx on public.referee_reports (tournament_id);
alter table public.referee_reports enable row level security;
create trigger trg_referee_reports_updated_at before update on public.referee_reports
  for each row execute function public.set_updated_at();

create policy "referee_reports: staff all" on public.referee_reports
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "referee_reports: director own" on public.referee_reports
  for all to authenticated
  using (public.is_tournament_director(tournament_id))
  with check (public.is_tournament_director(tournament_id));

comment on table public.referee_reports is
  'Izveštaj sudije po turniru: loptice (dodeljeno/potrošeno), sporne situacije, napomena — interno, za koordinatora.';

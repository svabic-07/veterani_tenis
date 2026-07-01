-- =====================================================================
-- TVS · 0006 · Bodovi i rang liste
-- =====================================================================

-- ranking_points: izvor bodova (po turniru/kategoriji/disciplini)
create table public.ranking_points (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players (id) on delete cascade,
  tournament_id uuid references public.tournaments (id) on delete set null,
  kategorija    text not null,
  disciplina    public.discipline not null,
  bodovi        int not null default 0,
  aktivno_do    date,               -- kada bodovi ispadaju (52 nedelje)
  created_at    timestamptz not null default now()
);
create index ranking_points_player_idx on public.ranking_points (player_id);
create index ranking_points_kat_disc_idx on public.ranking_points (kategorija, disciplina);
alter table public.ranking_points enable row level security;

-- rankings: nedeljni obračun (N najboljih)
create table public.rankings (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players (id) on delete cascade,
  kategorija   text not null,
  disciplina   public.discipline not null,
  bodovi       int not null default 0,
  mesto        int,
  broj_turnira int not null default 0,
  nedelja      date not null,       -- obračunska nedelja
  created_at   timestamptz not null default now(),
  unique (player_id, kategorija, disciplina, nedelja)
);
create index rankings_kat_disc_ned_idx on public.rankings (kategorija, disciplina, nedelja, mesto);
alter table public.rankings enable row level security;

-- RLS: javno čitanje; upis staff.
create policy "ranking_points: public read" on public.ranking_points for select to anon, authenticated using (true);
create policy "ranking_points: staff write" on public.ranking_points for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "rankings: public read" on public.rankings for select to anon, authenticated using (true);
create policy "rankings: staff write" on public.rankings for all to authenticated using (public.is_staff()) with check (public.is_staff());

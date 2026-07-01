-- =====================================================================
-- TVS · 0004 · Turniri i konkurencije (kalendar, javni read)
-- Žreb/mečevi/bodovanje dolaze u Fazi 3/4 (engine sa testovima).
-- =====================================================================

-- ---------- tournaments ----------
create table public.tournaments (
  id            uuid primary key default gen_random_uuid(),
  legacy_id     text unique,
  naziv         text not null,
  serija        public.tournament_series not null,
  sistem        public.competition_system not null default 'kvalitativni',
  season_id     uuid references public.seasons (id) on delete set null,
  klub_id       uuid references public.clubs (id) on delete set null,   -- domaćin
  direktor_id   uuid references public.players (id) on delete set null, -- sudija/direktor
  scoring_model public.scoring_model,       -- null → nasleđuje season.default_scoring
  mesto         text,
  lat           double precision,
  lng           double precision,
  datum_od      date,
  datum_do      date,
  rok_prijave   timestamptz,
  status        public.tournament_status not null default 'najava',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tournaments_datum_idx  on public.tournaments (datum_od);
create index tournaments_status_idx on public.tournaments (status);
create index tournaments_serija_idx on public.tournaments (serija);
create index tournaments_direktor_idx on public.tournaments (direktor_id);

alter table public.tournaments enable row level security;
create trigger trg_tournaments_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();

-- ---------- tournament_events (kategorija × disciplina) ----------
create table public.tournament_events (
  id         uuid primary key default gen_random_uuid(),
  turnir_id  uuid not null references public.tournaments (id) on delete cascade,
  kategorija text not null,                 -- 'I'..'V' ili '45+' (zavisi od sistema)
  disciplina public.discipline not null,
  created_at timestamptz not null default now(),
  unique (turnir_id, kategorija, disciplina)
);

create index tournament_events_turnir_idx on public.tournament_events (turnir_id);

alter table public.tournament_events enable row level security;

-- =====================================================================
-- RLS
-- =====================================================================

-- Pomoćni predikat: da li je trenutni korisnik direktor turnira.
create or replace function public.is_tournament_director(_tournament_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    join public.profiles p on p.player_id = t.direktor_id
    where t.id = _tournament_id and p.id = auth.uid()
  );
$$;

-- tournaments: javno čitanje; staff pun upis; direktor menja svoj turnir.
create policy "tournaments: public read" on public.tournaments for select to anon, authenticated using (true);
create policy "tournaments: staff write" on public.tournaments for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "tournaments: director update own"
  on public.tournaments for update to authenticated
  using (public.is_referee() and public.is_tournament_director(id))
  with check (public.is_referee() and public.is_tournament_director(id));

-- tournament_events: javno čitanje; staff i direktor turnira upisuju.
create policy "events: public read" on public.tournament_events for select to anon, authenticated using (true);
create policy "events: staff write" on public.tournament_events for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "events: director write own"
  on public.tournament_events for all to authenticated
  using (public.is_referee() and public.is_tournament_director(turnir_id))
  with check (public.is_referee() and public.is_tournament_director(turnir_id));

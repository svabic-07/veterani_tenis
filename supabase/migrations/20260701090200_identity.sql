-- =====================================================================
-- TVS · 0003 · Identitet: klubovi, igrači, privatni podaci, sezone
-- =====================================================================

-- ---------- clubs ----------
create table public.clubs (
  id         uuid primary key default gen_random_uuid(),
  legacy_id  text unique,                  -- ID sa aktuelnog sajta (migracija)
  naziv      text not null,
  grad       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clubs enable row level security;
create trigger trg_clubs_updated_at before update on public.clubs
  for each row execute function public.set_updated_at();

-- ---------- players (javno bezbedni podaci) ----------
create table public.players (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,                 -- stari ID radi povezivanja pri migraciji
  ime         text not null,
  prezime     text not null,
  pol         public.gender,
  godiste     int,                         -- godina rođenja
  klub_id     uuid references public.clubs (id) on delete set null,
  kategorija  public.quality_category,     -- kvalitativna I–V
  drzava      text not null default 'RS',  -- ISO-2 (RS, HR, ...)
  itf_ipin    text,
  foto_url    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint players_godiste_chk check (godiste is null or godiste between 1900 and 2100)
);

create index players_klub_idx on public.players (klub_id);
create index players_kategorija_idx on public.players (kategorija);
create index players_prezime_idx on public.players (prezime);

alter table public.players enable row level security;
create trigger trg_players_updated_at before update on public.players
  for each row execute function public.set_updated_at();

-- ---------- player_private (JMBG i kontakt — nikada javno) ----------
create table public.player_private (
  player_id  uuid primary key references public.players (id) on delete cascade,
  email      citext,
  telefon    text,
  jmbg_enc   bytea,                         -- enkriptovan JMBG (pgcrypto)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_private enable row level security;
create trigger trg_player_private_updated_at before update on public.player_private
  for each row execute function public.set_updated_at();

-- ---------- seasons ----------
create table public.seasons (
  id              uuid primary key default gen_random_uuid(),
  naziv           text not null,
  n_best          int not null default 8,          -- N najboljih (8/10/13)
  default_scoring public.scoring_model not null default 'klasicni',
  aktivna         boolean not null default false,
  pocetak         date,
  kraj            date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint seasons_n_best_chk check (n_best in (8, 10, 13))
);

-- Samo jedna aktivna sezona.
create unique index seasons_one_active_idx on public.seasons (aktivna) where aktivna;

alter table public.seasons enable row level security;
create trigger trg_seasons_updated_at before update on public.seasons
  for each row execute function public.set_updated_at();

-- ---------- FK profiles.player_id → players ----------
alter table public.profiles
  add constraint profiles_player_id_fkey
  foreign key (player_id) references public.players (id) on delete set null;

-- =====================================================================
-- RLS politike
-- =====================================================================

-- clubs: javno čitanje; upis staff.
create policy "clubs: public read"   on public.clubs for select to anon, authenticated using (true);
create policy "clubs: staff write"   on public.clubs for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- players: javno čitanje; upis staff (kasnije: sudija za svoj turnir, igrač svoj profil).
create policy "players: public read" on public.players for select to anon, authenticated using (true);
create policy "players: staff write" on public.players for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- player_private: NIKAD javno. Vidi/menja staff ili vlasnik naloga povezan sa igračem.
create policy "player_private: owner or staff read"
  on public.player_private for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.player_id = player_private.player_id
    )
  );
create policy "player_private: staff write"
  on public.player_private for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- seasons: javno čitanje; upis staff.
create policy "seasons: public read" on public.seasons for select to anon, authenticated using (true);
create policy "seasons: staff write" on public.seasons for all to authenticated using (public.is_staff()) with check (public.is_staff());

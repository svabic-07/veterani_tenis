-- =====================================================================
-- TVS · 0009 · Žreb: prijave, žrebovi, mečevi, setovi (Faza 3)
-- Javno čitanje samo objavljenih žrebova; piše staff ili direktor turnira.
-- =====================================================================

-- ---------- enumi ----------
create type public.draw_type as enum ('eliminacija', 'grupa', 'grupa5');
create type public.draw_status as enum ('radna', 'objavljen', 'zakljucan', 'opozvan');

-- ---------- helper: da li trenutni korisnik sme da menja konkurenciju ----------
create or replace function public.can_manage_event(_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() or exists (
    select 1 from public.tournament_events te
    where te.id = _event_id and public.is_tournament_director(te.turnir_id)
  );
$$;

revoke execute on function public.can_manage_event(uuid) from public, anon;
grant execute on function public.can_manage_event(uuid) to authenticated;

-- ---------- entries (prijave po konkurenciji) ----------
create table public.entries (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.tournament_events (id) on delete cascade,
  player_id       uuid not null references public.players (id) on delete cascade,
  partner_id      uuid references public.players (id) on delete set null,  -- dubl/miks
  status          public.entry_status not null default 'prijavljen',
  seed            int,             -- dodeljen nosilac (snapshot pri žrebu)
  bodovi_snapshot int,             -- bodovi na dan žreba (izvor nošenja)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (event_id, player_id)
);
create index entries_event_idx on public.entries (event_id);
create index entries_player_idx on public.entries (player_id);
alter table public.entries enable row level security;
create trigger trg_entries_updated_at before update on public.entries
  for each row execute function public.set_updated_at();

-- ---------- draws (žreb po konkurenciji) ----------
create table public.draws (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null unique references public.tournament_events (id) on delete cascade,
  tip           public.draw_type not null,
  kostur        int,               -- 8/16/32/64/128 (eliminacija); null za grupe
  broj_nosilaca int not null default 0,
  status        public.draw_status not null default 'radna',
  seed_izvor    jsonb,             -- snapshot nošenja (rang na dan žreba) — reproduktivnost
  rng_seed      text,              -- seed generatora — reproduktivnost
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint draws_kostur_chk check (kostur is null or kostur in (8, 16, 32, 64, 128))
);
alter table public.draws enable row level security;
create trigger trg_draws_updated_at before update on public.draws
  for each row execute function public.set_updated_at();

-- ---------- matches ----------
create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  draw_id       uuid not null references public.draws (id) on delete cascade,
  kolo          int not null,      -- 1 = prvo kolo … poslednje = finale; 0 = grupa (RR)
  pozicija      int not null,      -- redosled unutar kola / grupe
  grupa         text,              -- oznaka grupe (A/B) za RR mečeve
  player1_id    uuid references public.players (id) on delete set null,
  player2_id    uuid references public.players (id) on delete set null,
  partner1_id   uuid references public.players (id) on delete set null,
  partner2_id   uuid references public.players (id) on delete set null,
  seed1         int,
  seed2         int,
  status        public.match_status not null default 'zakazan',
  winner_slot   smallint,          -- 1 | 2
  next_match_id uuid references public.matches (id) on delete set null,
  next_slot     smallint,          -- u koji slot sledećeg meča ide pobednik
  termin        timestamptz,       -- satnica (kasnije u Fazi 3)
  teren         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (draw_id, kolo, pozicija),
  constraint matches_winner_slot_chk check (winner_slot is null or winner_slot in (1, 2)),
  constraint matches_next_slot_chk check (next_slot is null or next_slot in (1, 2))
);
create index matches_draw_idx on public.matches (draw_id, kolo, pozicija);
create index matches_players_idx on public.matches (player1_id, player2_id);
alter table public.matches enable row level security;
create trigger trg_matches_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

-- ---------- match_sets ----------
create table public.match_sets (
  id       uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  set_no   smallint not null,
  gem1     smallint not null,
  gem2     smallint not null,
  tb1      smallint,              -- tie-break poeni (opciono)
  tb2      smallint,
  unique (match_id, set_no),
  constraint match_sets_set_no_chk check (set_no between 1 and 5)
);
alter table public.match_sets enable row level security;

-- =====================================================================
-- RLS
-- =====================================================================

-- entries: javno čitanje (lista prijavljenih je javna po spec-u);
-- piše staff/direktor. (Samostalna prijava igrača — igrački portal, kasnije.)
create policy "entries: public read" on public.entries
  for select to anon, authenticated using (true);
create policy "entries: manager write" on public.entries
  for all to authenticated
  using (public.can_manage_event(event_id))
  with check (public.can_manage_event(event_id));

-- draws: javno se vide samo objavljeni/zaključani; menadžer vidi i radne.
create policy "draws: public read published" on public.draws
  for select to anon, authenticated
  using (status in ('objavljen', 'zakljucan'));
create policy "draws: manager read" on public.draws
  for select to authenticated using (public.can_manage_event(event_id));
create policy "draws: manager write" on public.draws
  for all to authenticated
  using (public.can_manage_event(event_id))
  with check (public.can_manage_event(event_id));

-- matches: prate vidljivost svog žreba.
create policy "matches: public read published" on public.matches
  for select to anon, authenticated
  using (exists (
    select 1 from public.draws d
    where d.id = draw_id and d.status in ('objavljen', 'zakljucan')
  ));
create policy "matches: manager read" on public.matches
  for select to authenticated
  using (exists (
    select 1 from public.draws d
    where d.id = draw_id and public.can_manage_event(d.event_id)
  ));
create policy "matches: manager write" on public.matches
  for all to authenticated
  using (exists (
    select 1 from public.draws d
    where d.id = draw_id and public.can_manage_event(d.event_id)
  ))
  with check (exists (
    select 1 from public.draws d
    where d.id = draw_id and public.can_manage_event(d.event_id)
  ));

-- match_sets: prate meč.
create policy "match_sets: public read published" on public.match_sets
  for select to anon, authenticated
  using (exists (
    select 1 from public.matches m
    join public.draws d on d.id = m.draw_id
    where m.id = match_id and d.status in ('objavljen', 'zakljucan')
  ));
create policy "match_sets: manager write" on public.match_sets
  for all to authenticated
  using (exists (
    select 1 from public.matches m
    join public.draws d on d.id = m.draw_id
    where m.id = match_id and public.can_manage_event(d.event_id)
  ))
  with check (exists (
    select 1 from public.matches m
    join public.draws d on d.id = m.draw_id
    where m.id = match_id and public.can_manage_event(d.event_id)
  ));

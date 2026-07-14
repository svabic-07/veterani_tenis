-- =====================================================================
-- TVS · SEED · Sezona 2026 + klubovi + uzorak kalendara (iz specifikacije)
-- Idempotentno (on conflict po legacy_id / jedinstvenom polju).
-- Primenjuje se preko execute_sql ili `supabase db reset` (posle migracija).
-- =====================================================================

-- ---------- Sezona ----------
insert into public.seasons (naziv, n_best, default_scoring, aktivna, pocetak, kraj)
values ('Sezona 2026', 8, 'klasicni', true, '2026-01-01', '2026-12-31')
on conflict do nothing;

-- ---------- Klubovi ----------
insert into public.clubs (legacy_id, naziv, grad) values
  ('tc-popcourt',   'TC PopCOURT',  'Pančevo'),
  ('tk-top-tenis',  'TK Top Tenis', 'Kraljevo'),
  ('tk-toplicanin', 'TK Topličanin','Prokuplje'),
  ('tk-takovo',     'TK Takovo',    'Gornji Milanovac'),
  ('tk-spartak',    'TK Spartak',   'Subotica'),
  ('tk-sloboda',    'TK Sloboda',   'Čačak'),
  ('tk-elteks',     'TK Elteks',    'Kruševac'),
  ('tk-vrsac',      'TK Vršac',     'Vršac')
on conflict (legacy_id) do nothing;

-- ---------- Turniri / konkurencije ----------
-- Nema uzorka turnira u seed-u: pravi podaci dolaze iz migracije istorije
-- (turniri 'ist-%', mečevi, bodovi), a novi turniri se prave kroz
-- koordinatorski panel. Ranije su ovde bili demo turniri + fejk direktori
-- ('dir-%') — obrisani 2026-07-14 kad su stigli pravi podaci.

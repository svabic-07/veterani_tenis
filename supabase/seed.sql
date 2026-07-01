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

-- ---------- Direktori (uneti kao igrači radi direktor_id) ----------
insert into public.players (legacy_id, ime, prezime, drzava) values
  ('dir-vladimir-popovic',   'Vladimir', 'Popović',    'RS'),
  ('dir-boris-premovic',     'Boris',    'Premović',   'RS'),
  ('dir-zika-manic',         'Žika',     'Manić',      'RS'),
  ('dir-nemanja-blagojevic', 'Nemanja',  'Blagojević', 'RS'),
  ('dir-zoran-trivunov',     'Zoran',    'Trivunov',   'RS'),
  ('dir-neso-puzic',         'Nešo',     'Puzić',      'RS'),
  ('dir-milan-beader',       'Milan',    'Beader',     'RS'),
  ('dir-goran-lonec',        'Goran',    'Lonec',      'RS')
on conflict (legacy_id) do nothing;

-- ---------- Turniri (uzorak · Serija 1000, sezona 2026) ----------
insert into public.tournaments
  (legacy_id, naziv, serija, sistem, season_id, klub_id, direktor_id, mesto, datum_od, datum_do, rok_prijave, status)
select v.legacy_id, v.naziv, 's1000'::public.tournament_series, v.sistem::public.competition_system,
       (select id from public.seasons where naziv = 'Sezona 2026'),
       (select id from public.clubs where legacy_id = v.club_legacy),
       (select id from public.players where legacy_id = v.dir_legacy),
       v.mesto, v.datum_od::date, v.datum_do::date, v.rok::timestamptz, v.status::public.tournament_status
from (values
  ('oktagon-open-2026',      'Oktagon Open',        'kvalitativni', 'tc-popcourt',   'dir-vladimir-popovic',   'Pančevo',          '2026-07-11','2026-07-12','2026-07-09 20:00+02','prijave'),
  ('kraljevo-open-2026',     'Kraljevo Open',       'kvalitativni', 'tk-top-tenis',  'dir-boris-premovic',     'Kraljevo',         '2026-07-18','2026-07-19','2026-07-16 20:00+02','prijave'),
  ('dodijev-memorijal-2026', 'Dodijev Memorijal',   'kvalitativni', 'tk-toplicanin', 'dir-zika-manic',         'Prokuplje',        '2026-07-25','2026-07-26','2026-07-23 20:00+02','najava'),
  ('gm-open-2026',           'GM Open',             'kvalitativni', 'tk-takovo',     'dir-nemanja-blagojevic', 'Gornji Milanovac', '2026-08-01','2026-08-02','2026-07-30 20:00+02','najava'),
  ('spartak-open-2026',      'Spartak Open',        'starosni',     'tk-spartak',    'dir-zoran-trivunov',     'Subotica',         '2026-08-08','2026-08-09','2026-08-06 20:00+02','najava'),
  ('plazina-memorijal-2026', 'Plazina Memorijal',   'kvalitativni', 'tk-sloboda',    'dir-neso-puzic',         'Čačak',            '2026-08-22','2026-08-23','2026-08-20 20:00+02','najava'),
  ('rasina-vina-open-2026',  'Rasina & Vina Open',  'kvalitativni', 'tk-elteks',     'dir-milan-beader',       'Kruševac',         '2026-08-29','2026-08-30','2026-08-27 20:00+02','najava'),
  ('dani-grozdja-2026',      'Dani Grožđa',         'kvalitativni', 'tk-vrsac',      'dir-goran-lonec',        'Vršac',            '2026-09-26','2026-09-27','2026-09-24 20:00+02','najava')
) as v(legacy_id, naziv, sistem, club_legacy, dir_legacy, mesto, datum_od, datum_do, rok, status)
on conflict (legacy_id) do nothing;

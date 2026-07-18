-- =====================================================================
-- TVS · 0017 · Kontakt-podaci turnira (domaćin, kontakt, lokacija)
-- Da stranica turnira prikazuje istu vrstu podataka kao stari sajt.
-- `mesto` = grad; `lokacija` = puna adresa. Domaćin = organizator (osoba/klub).
-- =====================================================================

alter table public.tournaments
  add column if not exists domacin  text,
  add column if not exists kontakt  text,
  add column if not exists lokacija text;

comment on column public.tournaments.domacin  is 'Domaćin/organizator (slobodan tekst).';
comment on column public.tournaments.kontakt  is 'Kontakt (telefon/email).';
comment on column public.tournaments.lokacija is 'Puna adresa/lokacija terena.';

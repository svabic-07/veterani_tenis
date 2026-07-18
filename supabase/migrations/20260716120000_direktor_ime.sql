-- =====================================================================
-- TVS · 0016 · Direktor kao slobodan tekst
-- Direktor turnira može biti bilo koje ime (i osoba koja nije registrovan
-- igrač). `direktor_id` (FK na players) ostaje opcion — vezuje se samo kad je
-- direktor igrač/nalog (za pristup sudijskom portalu preko is_tournament_director).
-- =====================================================================

alter table public.tournaments add column if not exists direktor_ime text;

comment on column public.tournaments.direktor_ime is
  'Ime direktora (slobodan tekst; može i ne-igrač). direktor_id se veže samo kad je direktor registrovan igrač.';

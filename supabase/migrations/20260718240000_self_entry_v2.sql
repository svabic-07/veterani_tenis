-- =====================================================================
-- TVS · 0031 · Samoprijava v2 (Codex revizija javnog dela, nalazi #1 #2 #8)
-- 1) Bilo koji AKTIVAN žreb (i radni) zatvara samoprijavu — do sada je
--    radni žreb dozvoljavao izmene prijava mimo generisanog kostura.
-- 2) Provera prava nastupa po pravilniku: kvalitativna kategorija —
--    igrač sme u SVOJU ili JAČU (I najjača), ne u slabiju; bez dodeljene
--    kategorije kvalitativne konkurencije nisu dozvoljene. Starosna
--    kategorija — starost (godina − godište) ≥ broj kategorije; bez
--    godišta starosne nisu dozvoljene.
-- 3) Datum poređenja po beogradskom kalendaru, ne UTC.
-- =====================================================================

create or replace function public.can_self_enter_event(_event_id uuid)
returns boolean
language sql stable security definer set search_path = 'public'
as $$
  select exists (
    select 1
    from public.tournament_events te
    join public.tournaments t on t.id = te.turnir_id
    join public.players p on p.id = public.my_player_id()
    where te.id = _event_id
      and te.disciplina = 'singl'
      and coalesce(t.datum_do, t.datum_od) >= (now() at time zone 'Europe/Belgrade')::date
      and (t.rok_prijave is null or now() <= t.rok_prijave)
      -- bilo koji aktivan žreb zatvara prijave (opozvan ne smeta)
      and not exists (
        select 1 from public.draws d
        where d.event_id = te.id and d.status in ('radna', 'objavljen', 'zakljucan')
      )
      -- pravo nastupa po pravilniku
      and (
        case
          -- kvalitativna (I–V): svoja ili JAČA (enum redosled I<II<…<V;
          -- jača konkurencija = manja vrednost)
          when te.kategorija in ('I','II','III','IV','V') then
            p.kategorija is not null
            and te.kategorija::public.quality_category <= p.kategorija
          -- starosna (npr. '50'): starost ≥ broj kategorije
          when te.kategorija ~ '^[0-9]+$' then
            p.godiste is not null
            and extract(year from (now() at time zone 'Europe/Belgrade'))::int - p.godiste
                >= te.kategorija::int
          else false
        end
      )
  );
$$;

comment on function public.can_self_enter_event is
  'Samoprijava (singl): rok + nema aktivnog žreba + pravo nastupa (kvalitativna svoja/jača; starosna po godištu). Beogradski datum.';

-- =====================================================================
-- TVS · 0001 · Ekstenzije, enumi, zajednički helperi
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid, crypt
create extension if not exists "citext";      -- case-insensitive tekst (email, nazivi)

-- ---------- Uloge (RBAC) ----------
-- Gost nije uloga u bazi (nema nalog); autentifikovane uloge:
create type public.app_role as enum ('igrac', 'sudija', 'koordinator', 'admin');

-- ---------- Domen: igrači i takmičenje ----------
create type public.gender as enum ('m', 'z');

-- Kvalitativne kategorije I–V
create type public.quality_category as enum ('I', 'II', 'III', 'IV', 'V');

-- Discipline: singl / dubl / miks
create type public.discipline as enum ('singl', 'dubl', 'miks');

-- Serije turnira + Master
create type public.tournament_series as enum ('s2000', 's1000', 's500', 's250', 'master');

-- Sistem svrstavanja na turniru
create type public.competition_system as enum ('kvalitativni', 'starosni');

-- Bodovni model (bira koordinator)
create type public.scoring_model as enum ('klasicni', 'svi_boduju');

-- Status turnira (tok life-cycle-a)
create type public.tournament_status as enum (
  'najava', 'prijave', 'zreb', 'u_toku', 'zavrsen', 'ponovo_otvoren'
);

-- Status prijave igrača/para
create type public.entry_status as enum (
  'prijavljen', 'na_cekanju', 'odjavljen', 'gost', 'odbijen'
);

-- Status meča
create type public.match_status as enum (
  'zakazan', 'u_toku', 'zavrsen', 'walkover', 'predaja', 'retiranje', 'bye'
);

-- Tip uplate
create type public.payment_type as enum ('clanarina', 'kotizacija');

-- Disciplinske sankcije
create type public.sanction_type as enum ('opomena', 'oduzimanje_bodova', 'iskljucenje');

-- ---------- Zajednički trigger: updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at is 'Trigger helper: postavlja updated_at = now() pri UPDATE.';

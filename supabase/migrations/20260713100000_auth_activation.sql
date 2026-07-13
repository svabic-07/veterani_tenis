-- =====================================================================
-- TVS · 0007 · Aktivacija naloga: povezivanje auth naloga sa igračem
-- Tok: korisnik se prijavi email-om (OTP/magic link) → kandidati po
-- poklapanju player_private.email → claim_player() veže profil.
-- =====================================================================

-- Jedan igrač može biti povezan sa najviše jednim nalogom.
create unique index profiles_player_id_unique
  on public.profiles (player_id)
  where player_id is not null;

-- ---------------------------------------------------------------------
-- Guard: "profiles: self update" RLS politika dozvoljava korisniku update
-- celog reda, pa bi bez ovoga mogao ručno da postavi player_id na bilo
-- kog igrača. player_id se menja isključivo kroz claim_player() (koja
-- postavlja lokalni GUC) ili od strane staff-a.
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_player_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.player_id is distinct from old.player_id
     and coalesce(current_setting('tvs.allow_player_link', true), '') <> 'on'
     and not public.is_staff() then
    raise exception 'player_id se menja samo preko claim_player() ili od strane staff-a';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_guard_player_link
  before update on public.profiles
  for each row execute function public.guard_profile_player_link();

-- ---------------------------------------------------------------------
-- Kandidati za povezivanje: igrači čiji se privatni email poklapa sa
-- email-om prijavljenog naloga. SECURITY DEFINER jer čita player_private
-- (RLS bi blokirao pre povezivanja). `zauzet` = već povezan sa drugim
-- nalogom (deljeni klupski emailovi).
-- ---------------------------------------------------------------------
create or replace function public.my_player_candidates()
returns table (
  player_id uuid,
  ime text,
  prezime text,
  godiste int,
  klub text,
  zauzet boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.ime,
         p.prezime,
         p.godiste,
         c.naziv,
         exists (
           select 1 from public.profiles pr
           where pr.player_id = p.id and pr.id <> auth.uid()
         )
  from public.player_private pp
  join public.players p on p.id = pp.player_id
  left join public.clubs c on c.id = p.klub_id
  where auth.uid() is not null
    and pp.email = nullif(auth.jwt() ->> 'email', '')::citext
  order by p.prezime, p.ime;
$$;

-- ---------------------------------------------------------------------
-- Povezivanje: dozvoljeno samo ako se email naloga poklapa sa privatnim
-- email-om igrača i igrač nije već zauzet drugim nalogom.
-- ---------------------------------------------------------------------
create or replace function public.claim_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email citext;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  v_email := nullif(auth.jwt() ->> 'email', '')::citext;
  if v_email is null then
    raise exception 'email_missing';
  end if;

  if not exists (
    select 1 from public.player_private pp
    where pp.player_id = p_player_id and pp.email = v_email
  ) then
    raise exception 'email_mismatch';
  end if;

  if exists (
    select 1 from public.profiles pr
    where pr.player_id = p_player_id and pr.id <> auth.uid()
  ) then
    raise exception 'player_taken';
  end if;

  -- dozvola za guard trigger, važi samo u ovoj transakciji
  perform set_config('tvs.allow_player_link', 'on', true);

  update public.profiles pr
     set player_id = p_player_id,
         full_name = (select p.ime || ' ' || p.prezime
                      from public.players p where p.id = p_player_id)
   where pr.id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------
-- Dozvole (obrazac iz 0005): samo authenticated poziva RPC-ove;
-- trigger funkcija nije pozivljiva preko REST-a.
-- ---------------------------------------------------------------------
revoke execute on function public.my_player_candidates() from public;
revoke execute on function public.claim_player(uuid) from public;
revoke execute on function public.guard_profile_player_link() from public;

grant execute on function public.my_player_candidates() to authenticated;
grant execute on function public.claim_player(uuid) to authenticated;

comment on function public.my_player_candidates is
  'Igrači čiji privatni email odgovara email-u prijavljenog naloga (za tok aktivacije).';
comment on function public.claim_player is
  'Veže profil prijavljenog korisnika za igrača, uz proveru email poklapanja i zauzetosti.';

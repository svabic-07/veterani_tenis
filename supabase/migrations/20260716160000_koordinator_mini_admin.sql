-- =====================================================================
-- TVS · 0019 · Koordinator mini-admin: dodela sudijske uloge
-- Koordinator (sekretar saveza) sme da dodeli/oduzme SAMO ulogu 'sudija'.
-- Admin i dalje upravlja svim ulogama (postojeća RLS politika).
-- =====================================================================

create or replace function public.set_referee_role(_user_id uuid, _grant boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'user_not_found';
  end if;

  if _grant then
    insert into public.user_roles (user_id, role) values (_user_id, 'sudija')
    on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user_id and role = 'sudija';
  end if;

  perform public.log_audit('set_referee_role', 'user_roles', _user_id,
    jsonb_build_object('grant', _grant));
end;
$$;
revoke execute on function public.set_referee_role(uuid, boolean) from public, anon;
grant execute on function public.set_referee_role(uuid, boolean) to authenticated;

comment on function public.set_referee_role is
  'Koordinator/admin dodeljuje ili oduzima ulogu sudija (uz audit).';

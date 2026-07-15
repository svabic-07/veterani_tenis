-- =====================================================================
-- TVS · 0014 · Koordinatorski alati: bodovne tablice + dodela sudije
-- Sve mutacije = SECURITY DEFINER, is_staff() gate, audit trag.
-- =====================================================================

-- ---------- update_scoring_points: batch izmena vrednosti bodova ----------
-- _updates: [{ "id": uuid, "bodovi": int }, …]  (koordinator uređuje tablice)
create or replace function public.update_scoring_points(_updates jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  if exists (
    select 1 from jsonb_to_recordset(_updates) as u(id uuid, bodovi int)
    where u.bodovi is null or u.bodovi < 0
  ) then raise exception 'invalid_points'; end if;

  update public.scoring_tables st
  set bodovi = u.bodovi
  from jsonb_to_recordset(_updates) as u(id uuid, bodovi int)
  where st.id = u.id and st.bodovi is distinct from u.bodovi;

  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform public.log_audit('edit_scoring', 'scoring_tables', null,
      jsonb_build_object('izmenjeno', v_count));
  end if;
  return v_count;
end;
$$;
revoke execute on function public.update_scoring_points(jsonb) from public, anon;
grant execute on function public.update_scoring_points(jsonb) to authenticated;

-- ---------- admin_list_referees: igrači sa nalogom + sudijskom ulogom ----------
-- Dodeljivi kao direktor/sudija turnira (imaju nalog i vode preko is_tournament_director).
create or replace function public.admin_list_referees()
returns table (player_id uuid, ime text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct pl.id, (pl.ime || ' ' || pl.prezime)::text, u.email::text
  from public.players pl
  join public.profiles p on p.player_id = pl.id
  join auth.users u on u.id = p.id
  join public.user_roles ur on ur.user_id = p.id and ur.role = 'sudija'
  where public.is_staff()
  order by 2;
$$;
revoke execute on function public.admin_list_referees() from public, anon;
grant execute on function public.admin_list_referees() to authenticated;

-- ---------- assign_tournament_director: dodela/skidanje sudije turniru ----------
-- _player_id NULL = skini sudiju.
create or replace function public.assign_tournament_director(_tournament_id uuid, _player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old uuid;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  select direktor_id into v_old from public.tournaments where id = _tournament_id;
  if not found then raise exception 'tournament_not_found'; end if;

  if _player_id is not null
     and not exists (select 1 from public.players where id = _player_id) then
    raise exception 'player_not_found';
  end if;

  update public.tournaments set direktor_id = _player_id where id = _tournament_id;

  perform public.log_audit('assign_director', 'tournaments', _tournament_id,
    jsonb_build_object('stari', v_old, 'novi', _player_id));
end;
$$;
revoke execute on function public.assign_tournament_director(uuid, uuid) from public, anon;
grant execute on function public.assign_tournament_director(uuid, uuid) to authenticated;

comment on function public.update_scoring_points is
  'Batch izmena scoring_tables.bodovi (koordinator uređuje tablice), uz audit.';
comment on function public.assign_tournament_director is
  'Dodela/skidanje sudije (direktora) turniru; is_staff, uz audit.';

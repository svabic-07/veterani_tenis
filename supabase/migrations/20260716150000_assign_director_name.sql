-- =====================================================================
-- TVS · 0018 · Dodela sudije + ime (direktor_ime)
-- Koordinator dodeljuje sudiju pretragom; upisuje se i ime (direktor_ime),
-- a direktor_id samo kad je izabran registrovan igrač (za pristup portalu).
-- =====================================================================

drop function if exists public.assign_tournament_director(uuid, uuid);

create or replace function public.assign_tournament_director(
  _tournament_id uuid, _player_id uuid, _direktor_ime text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_id uuid;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  select direktor_id into v_old_id from public.tournaments where id = _tournament_id;
  if not found then raise exception 'tournament_not_found'; end if;

  if _player_id is not null
     and not exists (select 1 from public.players where id = _player_id) then
    raise exception 'player_not_found';
  end if;

  update public.tournaments
  set direktor_id  = _player_id,
      direktor_ime = nullif(btrim(_direktor_ime), '')
  where id = _tournament_id;

  perform public.log_audit('assign_director', 'tournaments', _tournament_id,
    jsonb_build_object('stari', v_old_id, 'novi', _player_id, 'ime', _direktor_ime));
end;
$$;
revoke execute on function public.assign_tournament_director(uuid, uuid, text) from public, anon;
grant execute on function public.assign_tournament_director(uuid, uuid, text) to authenticated;

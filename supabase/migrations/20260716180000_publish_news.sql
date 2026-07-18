-- =====================================================================
-- TVS · 0021 · publish_news — objava vesti (staff ili direktor turnira)
-- Za automatski izveštaj sa turnira na „ZAVRŠI TURNIR".
-- =====================================================================

create or replace function public.publish_news(
  _naslov text, _sadrzaj text, _turnir_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_staff()
    or (_turnir_id is not null and public.is_tournament_director(_turnir_id))
  ) then
    raise exception 'forbidden';
  end if;
  if length(btrim(_naslov)) < 3 or length(btrim(_sadrzaj)) < 3 then
    raise exception 'bad_request';
  end if;

  insert into public.news (naslov, sadrzaj, autor)
  values (btrim(_naslov), btrim(_sadrzaj), auth.uid());
end;
$$;
revoke execute on function public.publish_news(text, text, uuid) from public, anon;
grant execute on function public.publish_news(text, text, uuid) to authenticated;

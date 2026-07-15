-- =====================================================================
-- TVS · 0013 · Zahtevi za promenu kategorije (igrač → koordinator)
-- „Promena kategorije = odluka koordinatora." Igrač podnosi zahtev; staff
-- odobrava (menja players.kategorija) ili odbija. Sve kroz SECURITY DEFINER
-- RPC uz audit trag. Upis u tabelu ide SAMO kroz funkcije (nema write RLS).
-- =====================================================================

create type public.request_status as enum ('na_cekanju', 'odobren', 'odbijen');

create table public.category_change_requests (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.players (id) on delete cascade,
  trenutna_kat public.quality_category,                 -- snapshot pri podnošenju
  trazena_kat  public.quality_category not null,
  obrazlozenje text,
  status       public.request_status not null default 'na_cekanju',
  resio_by     uuid references auth.users (id) on delete set null,
  reseno_at    timestamptz,
  created_at   timestamptz not null default now()
);

create index cat_req_player_idx on public.category_change_requests (player_id);
create index cat_req_status_idx on public.category_change_requests (status, created_at desc);

-- Najviše jedan aktivan (na_cekanju) zahtev po igraču.
create unique index cat_req_one_pending_idx
  on public.category_change_requests (player_id) where status = 'na_cekanju';

alter table public.category_change_requests enable row level security;

-- RLS: čita vlasnik (igrač povezan sa nalogom) ili staff; upis samo kroz definer RPC.
create policy "catreq: owner or staff read" on public.category_change_requests
  for select to authenticated
  using (public.is_staff() or player_id = public.my_player_id());

-- ---------- request_category_change (igrač podnosi svoj zahtev) ----------
create or replace function public.request_category_change(
  _trazena public.quality_category, _obrazlozenje text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pid uuid := public.my_player_id();
  v_trenutna public.quality_category;
begin
  if v_pid is null then raise exception 'no_player'; end if;

  select kategorija into v_trenutna from public.players where id = v_pid;
  if v_trenutna is not distinct from _trazena then raise exception 'same_category'; end if;

  begin
    insert into public.category_change_requests (player_id, trenutna_kat, trazena_kat, obrazlozenje)
    values (v_pid, v_trenutna, _trazena, nullif(btrim(_obrazlozenje), ''));
  exception when unique_violation then
    raise exception 'pending_exists';
  end;
end;
$$;
revoke execute on function public.request_category_change(public.quality_category, text) from public, anon;
grant execute on function public.request_category_change(public.quality_category, text) to authenticated;

-- ---------- resolve_category_change (koordinator odobrava/odbija) ----------
create or replace function public.resolve_category_change(_request_id uuid, _approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  select * into v_req from public.category_change_requests where id = _request_id;
  if v_req is null then raise exception 'request_not_found'; end if;
  if v_req.status <> 'na_cekanju' then raise exception 'not_pending'; end if;

  if _approve then
    update public.players set kategorija = v_req.trazena_kat where id = v_req.player_id;
  end if;

  update public.category_change_requests
  set status    = (case when _approve then 'odobren' else 'odbijen' end)::public.request_status,
      resio_by  = auth.uid(),
      reseno_at = now()
  where id = _request_id;

  perform public.log_audit(
    'resolve_category_change', 'players', v_req.player_id,
    jsonb_build_object(
      'request_id', _request_id,
      'iz', v_req.trenutna_kat,
      'u', v_req.trazena_kat,
      'odobreno', _approve
    )
  );
end;
$$;
revoke execute on function public.resolve_category_change(uuid, boolean) from public, anon;
grant execute on function public.resolve_category_change(uuid, boolean) to authenticated;

comment on table public.category_change_requests is
  'Zahtevi igrača za promenu kvalitativne kategorije. Upis samo kroz request_category_change; rešava staff kroz resolve_category_change (uz audit).';

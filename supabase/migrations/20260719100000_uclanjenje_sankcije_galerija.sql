-- =====================================================================
-- TVS · 0032 · Parnost sa starim sajtom: učlanjenje + sankcije + galerija
-- 1) membership_requests — javna forma za učlanjenje (stari sajt /register/);
--    koordinator odobrava → kreira igrača + kontakt (audit).
-- 2) sanctions — disciplinska evidencija v1 (opomena / oduzimanje bodova /
--    suspenzija; stari sajt: nepojavljivanje bez odjave). Suspenzija blokira
--    SAMOPRIJAVU (can_self_enter_event v3); ostalo sprovodi koordinator.
-- 3) galerija — storage bucket (javno čitanje, staff upload) + metapodaci.
-- =====================================================================

-- ---------- 1) zahtevi za učlanjenje ----------
create table public.membership_requests (
  id          uuid primary key default gen_random_uuid(),
  ime         text not null,
  prezime     text not null,
  godiste     int,
  grad        text,
  klub        text,
  kategorija  public.quality_category,
  email       citext not null,
  telefon     text,
  napomena    text,
  status      public.request_status not null default 'na_cekanju',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index membership_requests_status_idx on public.membership_requests (status, created_at);
alter table public.membership_requests enable row level security;

-- javna forma: svako može da PODNESE zahtev (bez čitanja tuđih podataka)
create policy "membership: public insert" on public.membership_requests
  for insert to anon, authenticated
  with check (status = 'na_cekanju' and resolved_by is null);
create policy "membership: staff all" on public.membership_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create or replace function public.resolve_membership_request(_request_id uuid, _approve boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_player_id uuid;
  v_klub_id uuid;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  select * into v_req from public.membership_requests
  where id = _request_id and status = 'na_cekanju' for update;
  if v_req is null then raise exception 'request_not_found'; end if;

  if not _approve then
    update public.membership_requests
    set status = 'odbijen', resolved_by = auth.uid(), resolved_at = now()
    where id = _request_id;
    perform public.log_audit('membership_reject', 'membership_requests', _request_id, null);
    return null;
  end if;

  -- klub po tačnom nazivu ako postoji (inače ostaje null + napomena)
  select id into v_klub_id from public.clubs where lower(naziv) = lower(coalesce(v_req.klub, '')) limit 1;

  insert into public.players (ime, prezime, godiste, kategorija, klub_id, is_active)
  values (v_req.ime, v_req.prezime, v_req.godiste, v_req.kategorija, v_klub_id, true)
  returning id into v_player_id;

  insert into public.player_private (player_id, email, telefon)
  values (v_player_id, v_req.email, v_req.telefon)
  on conflict (player_id) do update set email = excluded.email, telefon = excluded.telefon;

  update public.membership_requests
  set status = 'odobren', resolved_by = auth.uid(), resolved_at = now()
  where id = _request_id;

  perform public.log_audit('membership_approve', 'players', v_player_id,
    jsonb_build_object('request', _request_id));
  return v_player_id;
end;
$$;
revoke execute on function public.resolve_membership_request(uuid, boolean) from public, anon;
grant execute on function public.resolve_membership_request(uuid, boolean) to authenticated;

-- ---------- 2) sankcije ----------
create table public.sanctions (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players (id) on delete cascade,
  tip        text not null check (tip in ('opomena', 'oduzimanje_bodova', 'suspenzija')),
  razlog     text,
  vazi_do    date,             -- null = do opoziva (brisanjem)
  created_by uuid,
  created_at timestamptz not null default now()
);
create index sanctions_player_idx on public.sanctions (player_id, created_at desc);
alter table public.sanctions enable row level security;

create policy "sanctions: staff all" on public.sanctions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "sanctions: owner read" on public.sanctions
  for select to authenticated using (player_id = public.my_player_id());

comment on table public.sanctions is
  'Disciplinska evidencija: opomena → oduzimanje bodova → suspenzija (nepojavljivanje bez odjave i teža kršenja propozicija). Suspenzija blokira samoprijavu.';

-- samoprijava v3: suspendovan igrač ne može da se prijavi
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
      and not exists (
        select 1 from public.draws d
        where d.event_id = te.id and d.status in ('radna', 'objavljen', 'zakljucan')
      )
      and not exists (
        select 1 from public.sanctions s
        where s.player_id = p.id and s.tip = 'suspenzija'
          and (s.vazi_do is null or s.vazi_do >= (now() at time zone 'Europe/Belgrade')::date)
      )
      and (
        case
          when te.kategorija in ('I','II','III','IV','V') then
            p.kategorija is not null
            and te.kategorija::public.quality_category <= p.kategorija
          when te.kategorija ~ '^[0-9]+$' then
            p.godiste is not null
            and extract(year from (now() at time zone 'Europe/Belgrade'))::int - p.godiste
                >= te.kategorija::int
          else false
        end
      )
  );
$$;

-- ---------- 3) galerija ----------
create table public.gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  path       text not null unique,      -- putanja u storage bucket-u 'galerija'
  naslov     text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index gallery_photos_created_idx on public.gallery_photos (created_at desc);
alter table public.gallery_photos enable row level security;
create policy "gallery: public read" on public.gallery_photos
  for select to anon, authenticated using (true);
create policy "gallery: staff all" on public.gallery_photos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galerija', 'galerija', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "galerija: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'galerija');
create policy "galerija: staff insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'galerija' and public.is_staff());
create policy "galerija: staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'galerija' and public.is_staff());

-- =====================================================================
-- TVS · 0020 · Sekretar: uplate + vesti + spajanje duplikata igrača
-- =====================================================================

-- ---------- payments (članarine / kotizacije) ----------
create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players (id) on delete cascade,
  tip        public.payment_type not null,
  iznos      numeric(10,2) not null check (iznos >= 0),
  sezona     int not null,
  turnir_id  uuid references public.tournaments (id) on delete set null,
  datum      date not null default current_date,
  napomena   text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index payments_player_idx on public.payments (player_id, sezona);
alter table public.payments enable row level security;

create policy "payments: staff all" on public.payments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "payments: owner read" on public.payments
  for select to authenticated using (player_id = public.my_player_id());

-- ---------- news (vesti / obaveštenja) ----------
create table public.news (
  id         uuid primary key default gen_random_uuid(),
  naslov     text not null,
  sadrzaj    text not null,
  objavljena boolean not null default true,
  autor      uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_created_idx on public.news (created_at desc);
alter table public.news enable row level security;
create trigger trg_news_updated_at before update on public.news
  for each row execute function public.set_updated_at();

create policy "news: public read published" on public.news
  for select to anon, authenticated using (objavljena);
create policy "news: staff all" on public.news
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- merge_players (spajanje duplikata) ----------
-- Prebacuje sve reference sa duplikata na glavnog igrača pa briše duplikat.
create or replace function public.merge_players(_keep uuid, _dup uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if _keep = _dup then raise exception 'same_player'; end if;
  if not exists (select 1 from public.players where id = _keep) then raise exception 'keep_not_found'; end if;
  if not exists (select 1 from public.players where id = _dup) then raise exception 'dup_not_found'; end if;
  -- ako duplikat ima povezan nalog, ne spajaj automatski
  if exists (select 1 from public.profiles where player_id = _dup) then
    raise exception 'dup_has_account';
  end if;

  -- prijave: obriši kolizije (ista konkurencija), pa prebaci
  delete from public.entries e using public.entries k
    where e.player_id = _dup and k.player_id = _keep and k.event_id = e.event_id;
  update public.entries set player_id = _keep where player_id = _dup;
  update public.entries set partner_id = _keep where partner_id = _dup;

  -- mečevi
  update public.matches set player1_id = _keep where player1_id = _dup;
  update public.matches set player2_id = _keep where player2_id = _dup;
  update public.matches set partner1_id = _keep where partner1_id = _dup;
  update public.matches set partner2_id = _keep where partner2_id = _dup;

  -- bodovi i rang
  update public.ranking_points set player_id = _keep where player_id = _dup;
  delete from public.rankings r using public.rankings k
    where r.player_id = _dup and k.player_id = _keep
      and k.kategorija = r.kategorija and k.disciplina = r.disciplina and k.nedelja = r.nedelja;
  update public.rankings set player_id = _keep where player_id = _dup;

  -- ostalo
  update public.category_change_requests set player_id = _keep where player_id = _dup;
  update public.tournaments set direktor_id = _keep where direktor_id = _dup;
  update public.payments set player_id = _keep where player_id = _dup;

  -- kontakt: dopuni glavnog ako nema
  insert into public.player_private (player_id, email, telefon)
  select _keep, pp.email, pp.telefon from public.player_private pp where pp.player_id = _dup
  on conflict (player_id) do update
    set email = coalesce(public.player_private.email, excluded.email),
        telefon = coalesce(public.player_private.telefon, excluded.telefon);
  delete from public.player_private where player_id = _dup;

  delete from public.players where id = _dup;

  perform public.log_audit('merge_players', 'players', _keep, jsonb_build_object('dup', _dup));
end;
$$;
revoke execute on function public.merge_players(uuid, uuid) from public, anon;
grant execute on function public.merge_players(uuid, uuid) to authenticated;

comment on table public.payments is 'Evidencija uplata (članarina/kotizacija) — vodi sekretar.';
comment on table public.news is 'Vesti/obaveštenja saveza (CMS v1).';
comment on function public.merge_players is 'Spaja duplikat igrača u glavnog (sve reference), uz audit.';

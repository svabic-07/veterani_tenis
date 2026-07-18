-- =====================================================================
-- TVS · 0024 · Atomske korekcije (Codex nalazi #2, #12)
-- 1) admin_update_player: izmena igrača + kontakta u JEDNOJ transakciji
--    (do sada dva odvojena upita — pola izmene je moglo da ostane),
--    uz mogućnost ispravke imena/prezimena (migrirani podaci).
-- 2) merge_players v2: dedup ranking_points (isti turnir × kategorija ×
--    disciplina — ostaje red glavnog igrača) + preračun nedeljnog ranga,
--    da spajanje duplikata ne udvostruči bodove u N-najboljih.
-- =====================================================================

create or replace function public.admin_update_player(
  _player_id uuid,
  _ime text,
  _prezime text,
  _godiste int,
  _klub_id uuid,
  _kategorija public.quality_category,
  _is_active boolean,
  _email citext,
  _telefon text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  update public.players set
    ime      = coalesce(nullif(trim(_ime), ''), ime),
    prezime  = coalesce(nullif(trim(_prezime), ''), prezime),
    godiste  = _godiste,
    klub_id  = _klub_id,
    kategorija = _kategorija,
    is_active  = _is_active
  where id = _player_id;
  if not found then raise exception 'player_not_found'; end if;

  insert into public.player_private (player_id, email, telefon)
  values (_player_id, _email, _telefon)
  on conflict (player_id) do update
    set email = excluded.email, telefon = excluded.telefon;

  perform public.log_audit('update_player', 'players', _player_id, null);
end;
$$;
revoke execute on function public.admin_update_player(uuid, text, text, int, uuid, public.quality_category, boolean, citext, text) from public, anon;
grant execute on function public.admin_update_player(uuid, text, text, int, uuid, public.quality_category, boolean, citext, text) to authenticated;
comment on function public.admin_update_player is
  'Atomska izmena igrača (uklj. ime/prezime) + kontakta (player_private). Staff, uz audit.';

-- ---------- merge_players v2 ----------
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

  -- bodovi: kolizija (isti turnir × kategorija × disciplina) = ista osoba
  -- dva puta na istom turniru — ostaje red glavnog igrača, duplikat se briše
  -- (inače bi oba reda ušla u zbir N-najboljih)
  delete from public.ranking_points r using public.ranking_points k
    where r.player_id = _dup and k.player_id = _keep
      and k.tournament_id = r.tournament_id
      and k.kategorija = r.kategorija and k.disciplina = r.disciplina;
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

  -- tekuća nedelja ranga posle spajanja
  perform public.recalc_weekly_rankings();

  perform public.log_audit('merge_players', 'players', _keep, jsonb_build_object('dup', _dup));
end;
$$;

-- =====================================================================
-- TVS · 0011 · Koordinator: audit log + korekcije + pregled korisnika
-- Sve korekcije su SECURITY DEFINER funkcije koje upisuju audit trag.
-- =====================================================================

-- ---------- audit_log ----------
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid,                          -- auth.uid() izvršioca
  action     text not null,                 -- npr. 'revoke_draw'
  entity     text not null,                 -- npr. 'draws'
  entity_id  uuid,
  details    jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_created_idx on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;

-- Čita samo staff; direktan upis niko (samo kroz funkcije, kao definer).
create policy "audit: staff read" on public.audit_log
  for select to authenticated using (public.is_staff());

create or replace function public.log_audit(
  _action text, _entity text, _entity_id uuid, _details jsonb default null
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_log (actor, action, entity, entity_id, details)
  values (auth.uid(), _action, _entity, _entity_id, _details);
$$;
revoke execute on function public.log_audit(text, text, uuid, jsonb) from public, anon, authenticated;

-- ---------- opoziv objavljenog žreba (samo koordinator/admin) ----------
create or replace function public.revoke_draw(_draw_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draw record;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  select d.*, te.turnir_id into v_draw
  from public.draws d join public.tournament_events te on te.id = d.event_id
  where d.id = _draw_id;
  if v_draw is null then raise exception 'draw_not_found'; end if;
  if v_draw.status not in ('objavljen', 'zakljucan') then raise exception 'not_published'; end if;

  if exists (
    select 1 from public.tournaments t
    where t.id = v_draw.turnir_id and t.status = 'zavrsen'
  ) then raise exception 'tournament_finished'; end if;

  update public.draws set status = 'opozvan' where id = _draw_id;
  perform public.log_audit('revoke_draw', 'draws', _draw_id,
    jsonb_build_object('event_id', v_draw.event_id, 'prethodni_status', v_draw.status));
end;
$$;
revoke execute on function public.revoke_draw(uuid) from public, anon;
grant execute on function public.revoke_draw(uuid) to authenticated;

-- ---------- poništavanje rezultata meča (samo koordinator/admin) ----------
create or replace function public.clear_match_result(_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_winner uuid;
  v_draw record;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  select m.*, d.tip as draw_tip, d.event_id, te.turnir_id into v_match
  from public.matches m
  join public.draws d on d.id = m.draw_id
  join public.tournament_events te on te.id = d.event_id
  where m.id = _match_id;
  if v_match is null then raise exception 'match_not_found'; end if;
  if v_match.winner_slot is null then raise exception 'match_unresolved'; end if;
  if v_match.status = 'bye' then raise exception 'bye_match'; end if;

  if exists (
    select 1 from public.tournaments t
    where t.id = v_match.turnir_id and t.status = 'zavrsen'
  ) then raise exception 'tournament_finished'; end if;

  -- nizvodni meč ne sme biti rešen
  if v_match.next_match_id is not null and exists (
    select 1 from public.matches n
    where n.id = v_match.next_match_id and n.winner_slot is not null
  ) then raise exception 'downstream_resolved'; end if;

  -- grupni meč: PF (popunjena iz plasmana) ne smeju biti rešena; isprazni ih
  if v_match.kolo = 0 and v_match.grupa is not null then
    if exists (
      select 1 from public.matches n
      where n.draw_id = v_match.draw_id and n.kolo = 1 and n.winner_slot is not null
    ) then raise exception 'downstream_resolved'; end if;

    select * into v_draw from public.draws where id = v_match.draw_id;
    if v_draw.tip = 'grupa5' then
      update public.matches set player2_id = null, seed2 = null
      where draw_id = v_match.draw_id and kolo = 1;
    elsif v_draw.tip = 'grupa' then
      update public.matches set player1_id = null, player2_id = null, seed1 = null, seed2 = null
      where draw_id = v_match.draw_id and kolo = 1;
    end if;
  end if;

  -- ukloni propagiranog pobednika iz sledećeg meča
  if v_match.next_match_id is not null then
    v_winner := case when v_match.winner_slot = 1 then v_match.player1_id else v_match.player2_id end;
    update public.matches n set
      player1_id = case when n.player1_id = v_winner and v_match.next_slot = 1 then null else n.player1_id end,
      seed1      = case when n.player1_id = v_winner and v_match.next_slot = 1 then null else n.seed1 end,
      player2_id = case when n.player2_id = v_winner and v_match.next_slot = 2 then null else n.player2_id end,
      seed2      = case when n.player2_id = v_winner and v_match.next_slot = 2 then null else n.seed2 end
    where n.id = v_match.next_match_id;
  end if;

  delete from public.match_sets where match_id = _match_id;
  update public.matches set winner_slot = null, status = 'zakazan' where id = _match_id;

  perform public.log_audit('clear_match_result', 'matches', _match_id,
    jsonb_build_object('draw_id', v_match.draw_id, 'kolo', v_match.kolo, 'pozicija', v_match.pozicija));
end;
$$;
revoke execute on function public.clear_match_result(uuid) from public, anon;
grant execute on function public.clear_match_result(uuid) to authenticated;

-- ---------- ponovno otvaranje završenog turnira ----------
create or replace function public.reopen_tournament(_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week date := date_trunc('week', now())::date;
  v_n_best int;
  v_pair record;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;

  if not exists (
    select 1 from public.tournaments where id = _tournament_id and status = 'zavrsen'
  ) then raise exception 'not_finished'; end if;

  delete from public.ranking_points where tournament_id = _tournament_id;
  update public.tournaments set status = 'ponovo_otvoren' where id = _tournament_id;

  select coalesce((select n_best from public.seasons where aktivna limit 1), 8) into v_n_best;

  for v_pair in
    select distinct te.kategorija, te.disciplina
    from public.tournament_events te where te.turnir_id = _tournament_id
  loop
    delete from public.rankings
    where kategorija = v_pair.kategorija and disciplina = v_pair.disciplina and nedelja = v_week;

    insert into public.rankings (player_id, kategorija, disciplina, bodovi, mesto, broj_turnira, nedelja)
    select player_id, v_pair.kategorija, v_pair.disciplina, bodovi,
           rank() over (order by bodovi desc), broj_turnira, v_week
    from (
      select player_id, sum(bodovi) as bodovi, count(*) as broj_turnira
      from (
        select player_id, bodovi,
               row_number() over (partition by player_id order by bodovi desc) as rn
        from public.ranking_points
        where kategorija = v_pair.kategorija and disciplina = v_pair.disciplina
          and (aktivno_do is null or aktivno_do >= current_date)
      ) rp
      where rn <= v_n_best
      group by player_id
    ) sums;
  end loop;

  perform public.log_audit('reopen_tournament', 'tournaments', _tournament_id, null);
end;
$$;
revoke execute on function public.reopen_tournament(uuid) from public, anon;
grant execute on function public.reopen_tournament(uuid) to authenticated;

-- ---------- pregled korisnika i uloga (za panel) ----------
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  player_ime text,
  roles text[],
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id,
         u.email::text,
         p.full_name,
         case when pl.id is not null then pl.ime || ' ' || pl.prezime end,
         coalesce(array_agg(ur.role::text order by ur.role) filter (where ur.role is not null), '{}'),
         u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.players pl on pl.id = p.player_id
  left join public.user_roles ur on ur.user_id = u.id
  where public.is_staff()
  group by u.id, u.email, p.full_name, pl.id, pl.ime, pl.prezime, u.created_at
  order by u.created_at desc;
$$;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

comment on table public.audit_log is 'Trag koordinatorskih korekcija (upis samo kroz SECURITY DEFINER funkcije).';

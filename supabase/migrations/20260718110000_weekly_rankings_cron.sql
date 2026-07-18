-- =====================================================================
-- TVS · 0023 · Nedeljni obračun rang liste (pg_cron)
-- Rang je kliznih 52 nedelje — bodovi ističu i kad nema novih turnira,
-- pa se obračun ne sme oslanjati samo na „ZAVRŠI TURNIR".
-- recalc_weekly_rankings(): pun snapshot tekuće nedelje za SVE parove
-- (kategorija × disciplina) iz aktivnih bodova; n_best iz aktivne sezone.
-- Istorija nedelja se čuva (prikaz kretanja ↑↓ na profilu).
-- Cron: ponedeljak 03:00 UTC. Ručno pokretanje za staff:
-- admin_recalc_rankings() (uz audit).
-- =====================================================================

create or replace function public.recalc_weekly_rankings()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week date := date_trunc('week', now())::date;
  v_n_best int;
begin
  v_n_best := coalesce((select n_best from public.seasons where aktivna limit 1), 8);

  delete from public.rankings where nedelja = v_week;

  insert into public.rankings (player_id, kategorija, disciplina, bodovi, mesto, broj_turnira, nedelja)
  select player_id, kategorija, disciplina, bodovi,
         rank() over (partition by kategorija, disciplina order by bodovi desc),
         broj_turnira, v_week
  from (
    select player_id, kategorija, disciplina, sum(bodovi) as bodovi, count(*) as broj_turnira
    from (
      select player_id, kategorija, disciplina, bodovi,
             row_number() over (
               partition by player_id, kategorija, disciplina order by bodovi desc
             ) as rn
      from public.ranking_points
      where aktivno_do is null or aktivno_do >= current_date
    ) rp
    where rn <= v_n_best
    group by player_id, kategorija, disciplina
  ) sums;
end;
$$;

-- interna: poziva je cron (postgres) ili druge SECURITY DEFINER funkcije
revoke execute on function public.recalc_weekly_rankings() from public, anon, authenticated;

-- ručno pokretanje iz panela (staff, uz audit)
create or replace function public.admin_recalc_rankings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  perform public.recalc_weekly_rankings();
  perform public.log_audit('recalc_rankings', 'rankings', null::uuid);
end;
$$;
revoke execute on function public.admin_recalc_rankings() from public, anon;
grant execute on function public.admin_recalc_rankings() to authenticated;

-- ---------- pg_cron raspored ----------
create extension if not exists pg_cron;

select cron.schedule(
  'tvs-weekly-rankings',
  '0 3 * * 1',
  $$select public.recalc_weekly_rankings()$$
);

comment on function public.recalc_weekly_rankings is
  'Pun nedeljni snapshot rang liste (sve kategorije × discipline) iz aktivnih ranking_points; n_best iz aktivne sezone. Poziva pg_cron ponedeljkom 03:00 UTC.';
comment on function public.admin_recalc_rankings is
  'Ručni preračun nedeljnog ranga (staff, uz audit) — poziva recalc_weekly_rankings().';

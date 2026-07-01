-- =====================================================================
-- TVS · 0002 · RBAC: uloge, profili, helperi, RLS
-- Uloge se čuvaju odvojeno od profila (bezbednost — sprečava eskalaciju).
-- =====================================================================

-- ---------- user_roles ----------
create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

comment on table public.user_roles is 'Dodela RBAC uloga auth korisnicima. Menja samo admin (tehnički).';

alter table public.user_roles enable row level security;

-- ---------- Helperi (SECURITY DEFINER — zaobilaze RLS, bez rekurzije) ----------
create or replace function public.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = _role
  );
$$;

create or replace function public.is_coordinator()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('koordinator');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('admin');
$$;

create or replace function public.is_referee()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('sudija');
$$;

-- Podignuta prava: koordinator (takmičarski autoritet) + admin (tehnički).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('koordinator', 'admin')
  );
$$;

comment on function public.has_role is 'True ako trenutni korisnik ima tačno zadatu ulogu.';
comment on function public.is_staff is 'True za koordinatora ili admina (podignuta prava).';

-- RLS za user_roles: korisnik vidi svoje uloge; samo admin menja.
create policy "user_roles: self select"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "user_roles: admin manage"
  on public.user_roles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- profiles ----------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  player_id  uuid,                         -- FK na players dodaje se u 0003
  full_name  text,
  avatar_url text,
  locale     text not null default 'sr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil naloga (1:1 sa auth.users). Opcioni link na igrača (player_id).';

alter table public.profiles enable row level security;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS: svako vidi svoj profil; staff vidi sve; korisnik menja svoj (osim player_id).
create policy "profiles: public read basic"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles: self update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: staff manage"
  on public.profiles for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------- Auto-kreiranje profila pri registraciji ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

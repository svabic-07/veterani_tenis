-- =====================================================================
-- TVS · 0005 · Bezbednosno učvršćenje (Supabase advisors WARN-ovi)
-- =====================================================================

-- Fiksiran search_path (linter: function_search_path_mutable)
alter function public.set_updated_at() set search_path = '';

-- SECURITY DEFINER helperi: samo authenticated sme da ih poziva (RLS ih koristi);
-- anon ih nikad ne evaluira (javne read politike su using(true)).
revoke execute on function public.has_role(public.app_role) from public;
revoke execute on function public.is_coordinator() from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_referee() from public;
revoke execute on function public.is_staff() from public;
revoke execute on function public.is_tournament_director(uuid) from public;

grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_coordinator() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_referee() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_tournament_director(uuid) to authenticated;

-- Trigger funkcija — ne sme biti pozivljiva preko REST RPC-a.
revoke execute on function public.handle_new_user() from public;

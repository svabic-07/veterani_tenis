-- =====================================================================
-- TVS · 0008 · Advisor 0028: anon ne sme da izvršava SECURITY DEFINER
-- funkcije. Supabase default privilegije daju EXECUTE i roli `anon`
-- (0005 je skidao samo PUBLIC). Funkcije su i bez ovoga bezbedne
-- (auth.uid() je null bez sesije), ali REST površinu držimo minimalnom.
-- =====================================================================

revoke execute on function public.has_role(public.app_role) from anon;
revoke execute on function public.is_coordinator() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_referee() from anon;
revoke execute on function public.is_staff() from anon;
revoke execute on function public.is_tournament_director(uuid) from anon;
revoke execute on function public.my_player_candidates() from anon;
revoke execute on function public.claim_player(uuid) from anon;

-- Trigger funkcije — niko ih ne poziva preko REST-a.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.guard_profile_player_link() from anon, authenticated;

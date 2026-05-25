
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

drop policy if exists "Anyone can join the waitlist" on public.waitlist_signups;
create policy "Anyone can join the waitlist"
  on public.waitlist_signups for insert
  to anon, authenticated
  with check (
    length(coalesce(email, '')) between 5 and 255
    and length(coalesce(name, '')) between 1 and 120
    and (reason is null or length(reason) <= 500)
  );

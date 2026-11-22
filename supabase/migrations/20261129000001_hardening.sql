-- Phase 9: rate limiting (SPEC §15) — a fixed-window counter per key (e.g. "pin:<ip>"),
-- used by the server before sign-in attempts. Server (service role) only.

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);
alter table public.rate_limits enable row level security; -- no policies: nobody but the server

-- Count one hit; true while the key is within `p_max` hits per `p_window_sec` seconds.
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_sec int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_sec) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_sec) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_max;
end $$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;

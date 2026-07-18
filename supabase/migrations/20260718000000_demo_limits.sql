-- Create demo_rate_limits table for IP-based rate limiting on stateless demo endpoints
create table if not exists public.demo_rate_limits (
    ip_hash text primary key,
    request_count integer default 1 not null,
    window_start timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for demo_rate_limits
alter table public.demo_rate_limits enable row level security;

-- Allow anonymous read, insert, and update so the stateless API route can maintain rate counters
create policy "Allow anonymous select on demo_rate_limits"
    on public.demo_rate_limits for select using (true);

create policy "Allow anonymous insert on demo_rate_limits"
    on public.demo_rate_limits for insert with check (true);

create policy "Allow anonymous update on demo_rate_limits"
    on public.demo_rate_limits for update using (true) with check (true);

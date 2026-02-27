create table if not exists public.conversion_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  type text not null,
  status text not null,
  object_id text,
  source_url text,
  storage_path text,
  user_id uuid references auth.users(id),
  metadata jsonb
);

create index if not exists conversion_events_user_id_idx on public.conversion_events (user_id);
create index if not exists conversion_events_created_at_idx on public.conversion_events (created_at desc);

alter table public.conversion_events enable row level security;

create policy "Users can view their own conversion events"
on public.conversion_events
for select
using (auth.uid() = user_id);

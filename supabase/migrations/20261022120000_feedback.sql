create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  platform text not null check (platform in ('web', 'ios', 'android')),
  app_version text not null check (char_length(app_version) <= 50),
  created_at timestamptz not null default now()
);
create index feedback_user_id_created_at_idx on public.feedback(user_id, created_at desc);

alter table public.feedback enable row level security;
grant insert on public.feedback to authenticated;

create policy "feedback_insert_own" on public.feedback for insert with check (auth.uid() = user_id);

create function public.enforce_feedback_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('feedback:' || new.user_id::text));
  if (
    select count(*) from public.feedback
    where user_id = new.user_id and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'feedback daily limit exceeded';
  end if;
  return new;
end;
$$;

create trigger feedback_daily_limit
  before insert on public.feedback
  for each row execute function public.enforce_feedback_daily_limit();

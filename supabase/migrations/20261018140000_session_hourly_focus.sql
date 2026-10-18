create function public.session_hourly_focus(
  p_started_at timestamptz,
  p_focus_seconds integer,
  p_focus_periods jsonb
)
returns integer[]
language sql
stable
as $$
  with periods as materialized (
    select date_part('epoch', (p ->> 'start')::timestamptz) as ps,
      least(
        date_part('epoch', (p ->> 'end')::timestamptz),
        date_part('epoch', (p ->> 'start')::timestamptz) + 7200
      ) as pe
    from jsonb_array_elements(p_focus_periods) p
  ),
  buckets as (
    select (b::bigint % 24)::int as hour,
      least((b + 1) * 3600, pe) - greatest(b * 3600, ps) as seconds
    from periods, lateral (select floor(ps / 3600) + k as b from generate_series(0, 2) k) bk
  ),
  totals as (
    select hour, seconds from buckets where seconds > 0
    union all
    select extract(hour from p_started_at at time zone 'UTC')::int, p_focus_seconds
    where jsonb_array_length(p_focus_periods) = 0
  )
  select array_agg(coalesce(round(t.seconds), 0)::int order by h.hour)
  from generate_series(0, 23) h(hour)
  left join (select hour, sum(seconds) as seconds from totals group by hour) t on t.hour = h.hour
$$;

alter table public.sessions
  add column hourly_focus_seconds integer[] not null
    default array_fill(0, array[24])
    check (array_length(hourly_focus_seconds, 1) = 24);

create function public.set_session_hourly_focus()
returns trigger
language plpgsql
as $$
begin
  new.hourly_focus_seconds :=
    public.session_hourly_focus(new.started_at, new.focus_seconds, new.focus_periods);
  return new;
end;
$$;

create trigger sessions_hourly_focus
  before insert or update on public.sessions
  for each row execute function public.set_session_hourly_focus();

update public.sessions
  set hourly_focus_seconds = public.session_hourly_focus(started_at, focus_seconds, focus_periods);

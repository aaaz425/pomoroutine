create or replace function public.get_dashboard_summary(p_timezone text)
returns jsonb
language plpgsql
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone p_timezone)::date;
  v_month_start date := date_trunc('month', v_today)::date;
  v_month_end date := (date_trunc('month', v_today) + interval '1 month - 1 day')::date;
  v_utc_offset_hours integer := round(
    date_part('epoch', (now() at time zone p_timezone) - (now() at time zone 'UTC')) / 3600
  );
  v_result jsonb;
begin
  with sess as (
    select s.started_at, s.focus_seconds, s.mode,
      s.completed_cycles, s.total_cycles, t.category_id,
      (s.started_at at time zone p_timezone)::date as local_date,
      s.started_at at time zone p_timezone as local_start
    from public.sessions s
    left join public.tasks t on t.id = s.task_id
    where s.user_id = v_uid
  ),
  local_days as (
    select distinct local_date from sess
  ),
  islands as (
    select local_date,
      local_date - (row_number() over (order by local_date))::int as grp
    from local_days
  ),
  island_sizes as (
    select grp, count(*) as sz, max(local_date) as last_day
    from islands
    group by grp
  ),
  month_days as (
    select d::date as day
    from generate_series(v_month_start, v_month_end, interval '1 day') d
  ),
  month_totals as (
    select month_days.day,
      coalesce(sum(sess.focus_seconds), 0) as day_seconds
    from month_days
    left join sess on sess.local_date = month_days.day
    group by month_days.day
  ),
  dow_totals as (
    select extract(dow from local_date)::int as dow, sum(focus_seconds) as s
    from sess
    where local_date between v_month_start and v_month_end
    group by dow
    order by s desc
    limit 1
  ),
  prev_day as (
    select coalesce(sum(focus_seconds), 0) as focus_seconds, count(*) as cnt
    from sess where local_date = v_today - 1
  ),
  prev_week as (
    select coalesce(sum(focus_seconds), 0) as focus_seconds, count(*) as cnt
    from sess
    where local_date >= (date_trunc('week', v_today::timestamp) - interval '7 day')::date
      and local_date < date_trunc('week', v_today::timestamp)::date
  ),
  prev_month as (
    select coalesce(sum(focus_seconds), 0) as focus_seconds, count(*) as cnt
    from sess
    where local_date >= (date_trunc('month', v_today::timestamp) - interval '1 month')::date
      and local_date < date_trunc('month', v_today::timestamp)::date
  ),
  yearly_category as (
    select to_char(local_date, 'YYYY') as year, category_id,
      sum(round(focus_seconds / 60.0))::int as minutes
    from sess
    group by 1, 2
  ),
  utc_hourly as materialized (
    select array[
      sum(h[1]), sum(h[2]), sum(h[3]), sum(h[4]), sum(h[5]), sum(h[6]),
      sum(h[7]), sum(h[8]), sum(h[9]), sum(h[10]), sum(h[11]), sum(h[12]),
      sum(h[13]), sum(h[14]), sum(h[15]), sum(h[16]), sum(h[17]), sum(h[18]),
      sum(h[19]), sum(h[20]), sum(h[21]), sum(h[22]), sum(h[23]), sum(h[24])
    ] as seconds
    from (select hourly_focus_seconds as h from public.sessions where user_id = v_uid) x
  ),
  hourly_totals as (
    select h.hour,
      coalesce((select seconds[((h.hour - v_utc_offset_hours) % 24 + 24) % 24 + 1] from utc_hourly), 0)
        as seconds
    from generate_series(0, 23) h(hour)
  )
  select jsonb_build_object(
    'streakDays', coalesce((select sz from island_sizes where last_day = v_today), 0),
    'maxStreakDays', coalesce((select max(sz) from island_sizes), 0),
    'monthlyActivity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', to_char(day, 'YYYY-MM-DD'),
        'focusMinutes', case when day_seconds = 0 then 0 else greatest(1, round(day_seconds / 60.0)) end
      ) order by day)
      from month_totals
    ), '[]'::jsonb),
    'monthFocusSeconds', (select coalesce(sum(day_seconds), 0) from month_totals),
    'busiestDay', (select (array['일','월','화','수','목','금','토'])[dow + 1] || '요일' from dow_totals),
    'firstSessionDate', (select min(started_at) from sess),
    'prevDay', (select jsonb_build_object('focusSeconds', focus_seconds, 'count', cnt) from prev_day),
    'prevWeek', (select jsonb_build_object('focusSeconds', focus_seconds, 'count', cnt) from prev_week),
    'prevMonth', (select jsonb_build_object('focusSeconds', focus_seconds, 'count', cnt) from prev_month),
    'allTime', jsonb_build_object(
      'focusSeconds', (select coalesce(sum(focus_seconds), 0) from sess),
      'count', (select count(*) from sess),
      'yearlyCategoryMinutes', coalesce((
        select jsonb_agg(jsonb_build_object('year', year, 'categoryId', category_id, 'minutes', minutes)
          order by year, category_id)
        from yearly_category
      ), '[]'::jsonb),
      'hourlySeconds', (select jsonb_agg(round(seconds) order by hour) from hourly_totals)
    ),
    'badgeStats', jsonb_build_object(
      'categoryCount', (select count(distinct category_id) from sess),
      'nightOwl', exists (select 1 from sess where extract(hour from local_start) < 5),
      'weekendWarrior', exists (select 1 from sess where extract(dow from local_date) in (0, 6)),
      'perfectSession', exists (
        select 1 from sess
        where mode = 'pomodoro' and total_cycles > 0 and completed_cycles >= total_cycles
      ),
      'marathon', exists (select 1 from sess where focus_seconds >= 7200)
    )
  ) into v_result;

  return v_result;
end;
$$;

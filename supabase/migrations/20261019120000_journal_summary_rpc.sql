create or replace function public.get_journal_summary()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'count', (select count(*) from public.sessions where user_id = auth.uid()),
    'categoryRatings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'categoryId', r.category_id,
        'sum', r.rating_sum,
        'count', r.rating_count
      ) order by r.category_id)
      from (
        select t.category_id, sum(s.focus_rating) as rating_sum, count(*) as rating_count
        from public.sessions s
        join public.tasks t on t.id = s.task_id
        where s.user_id = auth.uid() and s.focus_rating is not null
        group by t.category_id
      ) r
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_journal_summary() to authenticated;

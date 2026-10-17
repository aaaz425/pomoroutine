-- 순서 변경을 행마다 update하던 방식 대신 한 번의 update로 저장한다.
-- security invoker(기본값)라 tasks_update_own, categories_update_own RLS가 그대로 적용된다.
-- 저장 대기 중인 항목의 임시 id는 uuid 형식이 아닐 수 있어 text[]로 받고 일치하지 않는 id는 건너뛴다.
create or replace function public.reorder_tasks(p_ids text[])
returns void
language sql
set search_path = ''
as $$
  update public.tasks as t
  set position = o.ord - 1
  from unnest(p_ids) with ordinality as o(id, ord)
  where t.id::text = o.id and t.user_id = auth.uid();
$$;

create or replace function public.reorder_categories(p_ids text[])
returns void
language sql
set search_path = ''
as $$
  update public.categories as c
  set position = o.ord - 1
  from unnest(p_ids) with ordinality as o(id, ord)
  where c.id::text = o.id and c.user_id = auth.uid();
$$;

grant execute on function public.reorder_tasks(text[]) to authenticated;
grant execute on function public.reorder_categories(text[]) to authenticated;

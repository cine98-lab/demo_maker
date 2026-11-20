-- 보안 점검(Supabase advisors) 반영
--   · touch_updated_at 의 search_path 고정
--   · 트리거 전용 함수는 API 로 직접 호출하지 못하게
--   · 로그인한 사용자만 쓰는 함수는 PUBLIC(=anon 포함) 권한을 거둔다
alter function public.touch_updated_at() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.set_project_password(uuid, text) from public, anon;
revoke execute on function public.my_project_stats() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.set_project_password(uuid, text) to authenticated;
grant execute on function public.my_project_stats() to authenticated;

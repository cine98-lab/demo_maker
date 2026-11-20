-- 이 프로젝트는 새 테이블에 Data API 권한을 자동으로 주지 않는다.
-- 로그인한 사용자에게 RLS 정책과 같은 범위의 권한만 준다. (방문자(anon)는 RPC 로만 접근)
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, delete on public.project_versions to authenticated;
grant select, update, delete on public.feedback to authenticated;
grant select on public.likes to authenticated;

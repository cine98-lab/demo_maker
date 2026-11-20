-- ════════════════════════════════════════════════════════════════════
-- 데모메이커 초기 스키마
--   profiles          : 사용자 프로필 (가입 시 자동 생성)
--   projects          : 프로젝트(= 사용자가 만드는 데모 사이트) + 배포 설정
--   project_versions  : 버전 기록 (되돌리기용 스냅숏)
--   feedback          : 방문자가 데모 위에 남긴 핀 + 의견
--   likes             : 방문자 좋아요 (브라우저별 visitor_id)
--
-- 보안 원칙
--   · 프로젝트 관련 테이블은 주인만 읽고 쓴다 (RLS).
--   · 방문자(로그인 안 함)는 테이블에 직접 접근하지 못하고,
--     배포 여부·비밀번호·피드백 허용을 확인하는 RPC(security definer)로만 읽고 쓴다.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────── profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  notify_feedback boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: 본인 조회" on public.profiles for select using (auth.uid() = id);
create policy "profiles: 본인 생성" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: 본인 수정" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 가입하면 프로필 자동 생성 (이메일 가입의 display_name, 소셜 로그인의 full_name/name 순)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────── projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  idea text not null default '' check (char_length(idea) <= 2000),
  method text not null default 'idea' check (method in ('idea', 'wizard', 'template')),
  -- 생성된 사이트 내용 (src/lib/types.ts 의 SiteSpec)
  site jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- 공개 주소: /p/<slug>
  slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  visibility text not null default 'link' check (visibility in ('public', 'link', 'password')),
  password_hash text,
  feedback_enabled boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);
alter table public.projects enable row level security;

create policy "projects: 주인만 조회" on public.projects for select using (owner_id = auth.uid());
create policy "projects: 주인만 생성" on public.projects for insert with check (owner_id = auth.uid());
create policy "projects: 주인만 수정" on public.projects for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "projects: 주인만 삭제" on public.projects for delete using (owner_id = auth.uid());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────── project_versions
create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version_no integer not null,
  label text not null default '' check (char_length(label) <= 80),
  site jsonb not null,
  created_at timestamptz not null default now(),
  unique (project_id, version_no)
);
alter table public.project_versions enable row level security;

create policy "versions: 프로젝트 주인만 조회" on public.project_versions for select
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "versions: 프로젝트 주인만 생성" on public.project_versions for insert
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "versions: 프로젝트 주인만 삭제" on public.project_versions for delete
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

-- ─────────────────────────────── feedback
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  page_key text not null default 'home' check (char_length(page_key) <= 40),
  x_pct numeric(5, 2) not null check (x_pct between 0 and 100),
  y_px integer not null check (y_px between 0 and 20000),
  author_name text not null default '' check (char_length(author_name) <= 40),
  body text not null check (char_length(body) between 1 and 1000),
  would_use boolean,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
create index feedback_project_created_idx on public.feedback (project_id, created_at desc);
alter table public.feedback enable row level security;

-- 방문자 작성은 submit_feedback RPC 로만. 주인은 읽고, 해결 처리하고, 지울 수 있다.
create policy "feedback: 주인만 조회" on public.feedback for select
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "feedback: 주인만 수정" on public.feedback for update
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy "feedback: 주인만 삭제" on public.feedback for delete
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

-- ─────────────────────────────── likes
create table public.likes (
  project_id uuid not null references public.projects (id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (project_id, visitor_id)
);
alter table public.likes enable row level security;
create policy "likes: 주인만 조회" on public.likes for select
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

-- ─────────────────────────────── 방문자용 RPC
-- 비밀번호 확인 (내부용)
create or replace function public._project_unlocked(p public.projects, p_password text)
returns boolean
language sql
stable
set search_path = public, extensions
as $$
  select p.visibility <> 'password'
      or (p.password_hash is not null and p_password is not null
          and extensions.crypt(p_password, p.password_hash) = p.password_hash);
$$;

-- 배포된 데모 읽기. 없으면 null, 잠겨 있으면 { locked: true, name }
create or replace function public.get_published_site(p_slug text, p_password text default null, p_visitor uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  p public.projects;
begin
  select * into p from public.projects where slug = lower(p_slug) and status = 'published';
  if not found then
    return null;
  end if;
  if not public._project_unlocked(p, p_password) then
    return jsonb_build_object('locked', true, 'name', p.name);
  end if;
  return jsonb_build_object(
    'locked', false,
    'id', p.id,
    'name', p.name,
    'site', p.site,
    'feedback_enabled', p.feedback_enabled,
    'likes', (select count(*) from public.likes l where l.project_id = p.id),
    'liked', coalesce((select true from public.likes l where l.project_id = p.id and l.visitor_id = p_visitor), false)
  );
end;
$$;

-- 방문자 피드백 남기기
create or replace function public.submit_feedback(
  p_slug text,
  p_password text,
  p_page_key text,
  p_x_pct numeric,
  p_y_px integer,
  p_author text,
  p_body text,
  p_would_use boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  p public.projects;
  new_id uuid;
begin
  select * into p from public.projects where slug = lower(p_slug) and status = 'published';
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not public._project_unlocked(p, p_password) then
    raise exception 'locked' using errcode = '42501';
  end if;
  if not p.feedback_enabled then
    raise exception 'feedback_disabled' using errcode = '42501';
  end if;
  insert into public.feedback (project_id, page_key, x_pct, y_px, author_name, body, would_use)
  values (p.id, coalesce(nullif(p_page_key, ''), 'home'), p_x_pct, p_y_px, left(coalesce(p_author, ''), 40), p_body, p_would_use)
  returning id into new_id;
  return new_id;
end;
$$;

-- 방문자 좋아요 켜기/끄기. { liked, count }
create or replace function public.toggle_like(p_slug text, p_password text, p_visitor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  p public.projects;
  now_liked boolean;
begin
  select * into p from public.projects where slug = lower(p_slug) and status = 'published';
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not public._project_unlocked(p, p_password) then
    raise exception 'locked' using errcode = '42501';
  end if;
  if exists (select 1 from public.likes where project_id = p.id and visitor_id = p_visitor) then
    delete from public.likes where project_id = p.id and visitor_id = p_visitor;
    now_liked := false;
  else
    insert into public.likes (project_id, visitor_id) values (p.id, p_visitor);
    now_liked := true;
  end if;
  return jsonb_build_object('liked', now_liked, 'count', (select count(*) from public.likes where project_id = p.id));
end;
$$;

-- ─────────────────────────────── 주인용 RPC
-- 비밀번호 보호 설정 (해시로만 저장). p_password 가 null 이면 해제
create or replace function public.set_project_password(p_project uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from public.projects where id = p_project and owner_id = auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_password is not null and char_length(p_password) < 4 then
    raise exception 'password_too_short' using errcode = '22023';
  end if;
  update public.projects
     set password_hash = case when p_password is null then null else extensions.crypt(p_password, extensions.gen_salt('bf')) end
   where id = p_project;
end;
$$;

-- 대시보드용: 내 프로젝트 + 피드백/좋아요 수
create or replace function public.my_project_stats()
returns table (project_id uuid, feedback_open bigint, feedback_total bigint, likes bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id,
         (select count(*) from public.feedback f where f.project_id = p.id and f.status = 'open'),
         (select count(*) from public.feedback f where f.project_id = p.id),
         (select count(*) from public.likes l where l.project_id = p.id)
    from public.projects p
   where p.owner_id = auth.uid();
$$;

-- 회원 탈퇴: 본인 계정과 모든 데이터 삭제 (cascade)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public._project_unlocked(public.projects, text) from public, anon, authenticated;
grant execute on function public.get_published_site(text, text, uuid) to anon, authenticated;
grant execute on function public.submit_feedback(text, text, text, numeric, integer, text, text, boolean) to anon, authenticated;
grant execute on function public.toggle_like(text, text, uuid) to anon, authenticated;
grant execute on function public.set_project_password(uuid, text) to authenticated;
grant execute on function public.my_project_stats() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
revoke execute on function public.set_project_password(uuid, text) from anon;
revoke execute on function public.my_project_stats() from anon;
revoke execute on function public.delete_my_account() from anon;

-- ─────────────────────────────── Storage: 프로젝트 이미지
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-assets', 'project-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- 경로 규칙: <user id>/<project id>/<파일>. 읽기는 공개(배포된 데모에 보여야 하므로), 쓰기는 본인 폴더만
create policy "assets: 본인 폴더 업로드" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "assets: 본인 폴더 수정" on storage.objects for update to authenticated
  using (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "assets: 본인 폴더 삭제" on storage.objects for delete to authenticated
  using (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);

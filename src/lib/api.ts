/**
 * 데이터 읽기·쓰기. 화면은 Supabase 를 직접 부르지 않고 이 함수들만 쓴다.
 * 모든 함수는 실패하면 AppError(한국어 메시지)를 던진다.
 */
import { requireSupabase, toAppError, AppError } from './supabase.ts';
import { clearDraft, currentDraft, saveDraft } from './draft.ts';
import type {
  Feedback,
  FeedbackStatus,
  Method,
  Profile,
  Project,
  ProjectStats,
  ProjectVersion,
  PublishedSite,
  SiteSpec,
  Visibility,
} from './types.ts';

/** 초안(로그인 전 작업)을 가리키는 특별한 프로젝트 id */
export const DRAFT_ID = 'draft';

const PROJECT_COLUMNS =
  'id, owner_id, name, idea, method, site, status, slug, visibility, password_hash, feedback_enabled, published_at, created_at, updated_at';

async function run<T>(fn: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let res: { data: T; error: unknown };
  try {
    res = await fn();
  } catch (e) {
    throw toAppError(e);
  }
  if (res.error) throw toAppError(res.error);
  return res.data;
}

async function currentUserId(): Promise<string> {
  const sb = requireSupabase();
  const { data } = await sb.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new AppError('not_authenticated', '로그인이 필요해요.');
  return id;
}

// ───────────────────────────────────────── 프로젝트

export async function listMyProjects(): Promise<Project[]> {
  const sb = requireSupabase();
  return run(() => sb.from('projects').select(PROJECT_COLUMNS).order('updated_at', { ascending: false })) as Promise<Project[]>;
}

export async function myProjectStats(): Promise<ProjectStats[]> {
  const sb = requireSupabase();
  const rows = (await run(() => sb.rpc('my_project_stats'))) as Array<Record<string, unknown>> | null;
  return (rows ?? []).map((r) => ({
    project_id: String(r.project_id),
    feedback_open: Number(r.feedback_open),
    feedback_total: Number(r.feedback_total),
    likes: Number(r.likes),
  }));
}

/** 프로젝트 하나. id 가 'draft' 면 이 브라우저의 초안을 프로젝트 모양으로 돌려준다 */
export async function getProject(id: string): Promise<Project> {
  if (id === DRAFT_ID) {
    const d = currentDraft();
    if (!d || !d.site) throw new AppError('not_found', '진행 중인 초안이 없어요. 새 프로젝트를 만들어 주세요.');
    return draftAsProject(d.name, d.idea, d.method, d.site, d.updatedAt);
  }
  const sb = requireSupabase();
  return run(() => sb.from('projects').select(PROJECT_COLUMNS).eq('id', id).single()) as Promise<Project>;
}

function draftAsProject(name: string, idea: string, method: Method, site: SiteSpec, updatedAt: string): Project {
  return {
    id: DRAFT_ID,
    owner_id: '',
    name,
    idea,
    method,
    site,
    status: 'draft',
    slug: null,
    visibility: 'link',
    password_hash: null,
    feedback_enabled: true,
    published_at: null,
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}

export async function createProject(input: { name: string; idea: string; method: Method; site: SiteSpec }): Promise<Project> {
  const sb = requireSupabase();
  const owner_id = await currentUserId();
  const project = (await run(() =>
    sb
      .from('projects')
      .insert({ owner_id, name: input.name.slice(0, 80) || '새 프로젝트', idea: input.idea, method: input.method, site: input.site })
      .select(PROJECT_COLUMNS)
      .single(),
  )) as Project;
  await createVersion(project.id, '처음 생성', input.site);
  return project;
}

/** 이름·사이트 내용 등 저장. 초안이면 이 브라우저에 저장 */
export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, 'name' | 'idea' | 'site' | 'feedback_enabled' | 'visibility'>>,
): Promise<Project> {
  if (id === DRAFT_ID) {
    const d = currentDraft();
    if (!d) throw new AppError('not_found', '진행 중인 초안이 없어요.');
    const next = saveDraft({
      ...d,
      name: patch.name ?? d.name,
      idea: patch.idea ?? d.idea,
      site: patch.site ?? d.site,
    });
    return draftAsProject(next.name, next.idea, next.method, next.site as SiteSpec, next.updatedAt);
  }
  const sb = requireSupabase();
  return run(() => sb.from('projects').update(patch).eq('id', id).select(PROJECT_COLUMNS).single()) as Promise<Project>;
}

export async function deleteProject(id: string): Promise<void> {
  if (id === DRAFT_ID) {
    clearDraft();
    return;
  }
  const sb = requireSupabase();
  await run(() => sb.from('projects').delete().eq('id', id));
}

/** 복제: 배포 정보는 빼고 사이트 내용만 새 프로젝트로 */
export async function duplicateProject(id: string): Promise<Project> {
  const src = await getProject(id);
  return createProject({ name: `${src.name} 복사본`.slice(0, 80), idea: src.idea, method: src.method, site: src.site });
}

/** 로그인 직후: 초안이 있으면 계정의 새 프로젝트로 옮기고 그 프로젝트를 돌려준다 */
export async function claimDraft(): Promise<Project | null> {
  const d = currentDraft();
  if (!d || !d.site) return null;
  const project = await createProject({ name: d.name, idea: d.idea, method: d.method, site: d.site });
  clearDraft();
  return project;
}

// ───────────────────────────────────────── 버전 기록

export async function listVersions(projectId: string): Promise<ProjectVersion[]> {
  if (projectId === DRAFT_ID) return [];
  const sb = requireSupabase();
  return run(() =>
    sb.from('project_versions').select('id, project_id, version_no, label, site, created_at').eq('project_id', projectId).order('version_no', { ascending: false }),
  ) as Promise<ProjectVersion[]>;
}

export async function createVersion(projectId: string, label: string, site: SiteSpec): Promise<ProjectVersion | null> {
  if (projectId === DRAFT_ID) return null;
  const sb = requireSupabase();
  const last = (await run(() =>
    sb.from('project_versions').select('version_no').eq('project_id', projectId).order('version_no', { ascending: false }).limit(1),
  )) as Array<{ version_no: number }>;
  const version_no = (last[0]?.version_no ?? 0) + 1;
  return run(() =>
    sb
      .from('project_versions')
      .insert({ project_id: projectId, version_no, label: label.slice(0, 80), site })
      .select('id, project_id, version_no, label, site, created_at')
      .single(),
  ) as Promise<ProjectVersion>;
}

/** 저장 + 버전 기록을 한 번에 (에디터의 "저장") */
export async function saveSite(projectId: string, site: SiteSpec, label = '수정'): Promise<Project> {
  const p = await updateProject(projectId, { site });
  if (projectId !== DRAFT_ID) await createVersion(projectId, label, site);
  return p;
}

export async function restoreVersion(projectId: string, version: ProjectVersion): Promise<Project> {
  const p = await updateProject(projectId, { site: version.site });
  await createVersion(projectId, `${version.version_no}번 버전으로 되돌림`, version.site);
  return p;
}

// ───────────────────────────────────────── 배포

/** 데모 주소용 slug: 영문 소문자·숫자·하이픈 3~40자 */
export function normalizeSlug(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function isValidSlug(v: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(v);
}

/** 이름에 영문이 있으면 그걸로, 없으면 demo-xxxxxx */
export function suggestSlug(name: string): string {
  const ascii = normalizeSlug(name);
  if (isValidSlug(ascii)) return ascii;
  return `demo-${Math.random().toString(36).slice(2, 8)}`;
}

export async function publishProject(
  id: string,
  opts: { slug: string; visibility: Visibility; feedback_enabled: boolean; password?: string | null },
): Promise<Project> {
  if (id === DRAFT_ID) throw new AppError('not_authenticated', '배포하려면 로그인이 필요해요.');
  const slug = normalizeSlug(opts.slug);
  if (!isValidSlug(slug)) throw new AppError('slug_invalid', '주소는 영어 소문자, 숫자, 하이픈(-)으로 3~40자로 정해 주세요.');
  const sb = requireSupabase();
  if (opts.visibility === 'password') {
    if (opts.password) await run(() => sb.rpc('set_project_password', { p_project: id, p_password: opts.password }));
  } else {
    await run(() => sb.rpc('set_project_password', { p_project: id, p_password: null }));
  }
  const current = await getProject(id);
  if (opts.visibility === 'password' && !opts.password && !current.password_hash) {
    throw new AppError('password_required', '비밀번호 보호를 쓰려면 비밀번호를 입력해 주세요.');
  }
  return run(() =>
    sb
      .from('projects')
      .update({
        slug,
        visibility: opts.visibility,
        feedback_enabled: opts.feedback_enabled,
        status: 'published',
        published_at: current.published_at ?? new Date().toISOString(),
      })
      .eq('id', id)
      .select(PROJECT_COLUMNS)
      .single(),
  ) as Promise<Project>;
}

export async function unpublishProject(id: string): Promise<Project> {
  const sb = requireSupabase();
  return run(() => sb.from('projects').update({ status: 'draft' }).eq('id', id).select(PROJECT_COLUMNS).single()) as Promise<Project>;
}

/** 공개 데모 주소 (현재 사이트 기준) */
export function publicUrl(slug: string): string {
  return `${window.location.origin}/p/${slug}`;
}

// ───────────────────────────────────────── 방문자 (로그인 불필요)

export async function getPublishedSite(slug: string, password: string | null, visitor: string): Promise<PublishedSite | null> {
  const sb = requireSupabase();
  const data = await run(() => sb.rpc('get_published_site', { p_slug: slug, p_password: password, p_visitor: visitor }));
  return (data as PublishedSite | null) ?? null;
}

export async function submitFeedback(input: {
  slug: string;
  password: string | null;
  pageKey: string;
  xPct: number;
  yPx: number;
  author: string;
  body: string;
  wouldUse: boolean | null;
}): Promise<string> {
  const body = input.body.trim();
  if (!body) throw new AppError('empty', '의견을 적어 주세요.');
  const sb = requireSupabase();
  return run(() =>
    sb.rpc('submit_feedback', {
      p_slug: input.slug,
      p_password: input.password,
      p_page_key: input.pageKey,
      p_x_pct: Math.round(Math.max(0, Math.min(100, input.xPct)) * 100) / 100,
      p_y_px: Math.max(0, Math.round(input.yPx)),
      p_author: input.author.trim().slice(0, 40),
      p_body: body.slice(0, 1000),
      p_would_use: input.wouldUse,
    }),
  ) as Promise<string>;
}

export async function toggleLike(slug: string, password: string | null, visitor: string): Promise<{ liked: boolean; count: number }> {
  const sb = requireSupabase();
  const r = (await run(() => sb.rpc('toggle_like', { p_slug: slug, p_password: password, p_visitor: visitor }))) as { liked: boolean; count: number };
  return { liked: Boolean(r.liked), count: Number(r.count) };
}

// ───────────────────────────────────────── 피드백 (주인)

export async function listFeedback(projectId: string): Promise<Feedback[]> {
  if (projectId === DRAFT_ID) return [];
  const sb = requireSupabase();
  const rows = (await run(() =>
    sb
      .from('feedback')
      .select('id, project_id, page_key, x_pct, y_px, author_name, body, would_use, status, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  )) as Feedback[];
  return rows.map((r) => ({ ...r, x_pct: Number(r.x_pct) }));
}

export async function setFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  const sb = requireSupabase();
  await run(() => sb.from('feedback').update({ status }).eq('id', id));
}

export async function deleteFeedback(id: string): Promise<void> {
  const sb = requireSupabase();
  await run(() => sb.from('feedback').delete().eq('id', id));
}

// ───────────────────────────────────────── 프로필 · 계정

export async function getMyProfile(): Promise<Profile> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  const rows = (await run(() => sb.from('profiles').select('id, display_name, notify_feedback, created_at').eq('id', uid).limit(1))) as Profile[];
  if (rows[0]) return rows[0];
  // 트리거보다 먼저 읽힌 경우 등: 직접 만든다
  return run(() =>
    sb.from('profiles').insert({ id: uid, display_name: '' }).select('id, display_name, notify_feedback, created_at').single(),
  ) as Promise<Profile>;
}

export async function updateMyProfile(patch: Partial<Pick<Profile, 'display_name' | 'notify_feedback'>>): Promise<Profile> {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (patch.display_name !== undefined) patch = { ...patch, display_name: patch.display_name.trim().slice(0, 40) };
  return run(() => sb.from('profiles').update(patch).eq('id', uid).select('id, display_name, notify_feedback, created_at').single()) as Promise<Profile>;
}

export async function deleteMyAccount(): Promise<void> {
  const sb = requireSupabase();
  await run(() => sb.rpc('delete_my_account'));
  await sb.auth.signOut();
}

// ───────────────────────────────────────── 이미지

/** 프로젝트 대표 사진 올리기 → 공개 URL */
export async function uploadProjectImage(projectId: string, file: File): Promise<string> {
  if (projectId === DRAFT_ID) throw new AppError('not_authenticated', '사진을 올리려면 로그인이 필요해요.');
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new AppError('bad_type', 'PNG, JPG, WEBP, GIF 사진만 올릴 수 있어요.');
  if (file.size > 5 * 1024 * 1024) throw new AppError('too_large', '사진은 5MB 이하로 올려 주세요.');
  const sb = requireSupabase();
  const uid = await currentUserId();
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${uid}/${projectId}/${Date.now()}.${ext}`;
  await run(() => sb.storage.from('project-assets').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type }));
  return sb.storage.from('project-assets').getPublicUrl(path).data.publicUrl;
}

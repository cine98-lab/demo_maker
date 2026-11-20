import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { AppHeader, Avatar, Badge, Button, ButtonLink, Card, Dialog, SelectField, TextField, Toast } from '../components';
import { PageError, PageLoading } from '../components/StatusViews.tsx';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { deleteProject, duplicateProject, listMyProjects, myProjectStats } from '../lib/api.ts';
import { toAppError } from '../lib/supabase.ts';
import { fullDateTime, relativeTime } from '../lib/time.ts';
import type { Project, ProjectStats } from '../lib/types.ts';
import { ProjectArt } from '../site/ProjectArt.tsx';
import './Dashboard.css';

type SortKey = 'recent' | 'name' | 'feedback';

const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'recent', label: '최근 수정순' },
  { value: 'name', label: '이름순' },
  { value: 'feedback', label: '피드백 많은 순' },
];

const gold = 'var(--star-gold)';
const goldDot: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  background: gold,
  boxShadow: '0 0 12px rgba(255, 214, 107, 0.6)',
};

const EMPTY_STATS: Omit<ProjectStats, 'project_id'> = { feedback_open: 0, feedback_total: 0, likes: 0 };

type Row = { project: Project; stats: Omit<ProjectStats, 'project_id'> };

/** 카드의 ⋯ 메뉴 (설정 / 복제 / 삭제). Esc·바깥 클릭으로 닫히고 위아래 화살표로 오간다. */
function CardMenu({ name, onSettings, onDuplicate, onDelete, busy }: { name: string; onSettings: () => void; onDuplicate: () => void; onDelete: () => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (i + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (next < 0) return;
    e.preventDefault();
    items[next]?.focus();
  };

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <Button
        ref={btnRef}
        size="sm"
        square
        aria-label={`${name} 더보기`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 18 }}
      >
        ⋯
      </Button>
      {open && (
        <div ref={menuRef} id={menuId} role="menu" aria-label={`${name} 메뉴`} className="dash-menu" onKeyDown={onMenuKey}>
          <button type="button" role="menuitem" tabIndex={-1} className="dash-menu__item" onClick={pick(onSettings)}>
            설정
          </button>
          <button type="button" role="menuitem" tabIndex={-1} className="dash-menu__item" onClick={pick(onDuplicate)}>
            복제
          </button>
          <button type="button" role="menuitem" tabIndex={-1} className="dash-menu__item dash-menu__item--danger" onClick={pick(onDelete)}>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  row,
  busy,
  onDuplicate,
  onDelete,
}: {
  row: Row;
  busy: boolean;
  onDuplicate: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const navigate = useNavigate();
  const { project, stats } = row;
  const published = project.status === 'published';
  const pages = project.site?.pages ?? [];
  return (
    <Card
      as="article"
      flush
      aria-busy={busy}
      style={{ overflow: 'visible', boxShadow: '0 1px 2px rgba(20, 27, 58, 0.06), 0 4px 16px rgba(20, 27, 58, 0.04)' }}
    >
      <Link
        to={ROUTES.editor(project.id)}
        aria-label={`${project.name} 편집`}
        tabIndex={-1}
        style={{
          display: 'block',
          aspectRatio: '16 / 9',
          maxWidth: '100%',
          overflow: 'hidden',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
          background: published ? 'var(--night-900)' : 'var(--violet-700)',
        }}
      >
        <ProjectArt pages={pages} links={project.site?.links ?? []} />
      </Link>
      <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>{project.name}</h2>
          <Badge tone={published ? 'success' : 'neutral'} style={{ alignSelf: 'center', flex: 'none' }}>
            {published ? '배포됨' : '초안'}
          </Badge>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
          페이지 {pages.length}개 · <time dateTime={project.updated_at} title={fullDateTime(project.updated_at)}>{relativeTime(project.updated_at)}</time> 수정
          {stats.likes > 0 && <> · 좋아요 {stats.likes}</>}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {stats.feedback_total > 0 ? (
            <Link
              to={ROUTES.feedback(project.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, textDecoration: 'none', padding: '8px 0' }}
            >
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: stats.feedback_open > 0 ? gold : 'var(--line)' }} />
              피드백 {stats.feedback_total}
              {stats.feedback_open > 0 && ` · 열림 ${stats.feedback_open}`}
            </Link>
          ) : (
            <Link to={ROUTES.feedback(project.id)} style={{ fontSize: 14, color: 'var(--ink-muted)', padding: '8px 0', textDecoration: 'none' }}>
              피드백 없음
            </Link>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <ButtonLink to={ROUTES.editor(project.id)} size="sm">
              편집
            </ButtonLink>
            <CardMenu
              name={project.name}
              busy={busy}
              onSettings={() => navigate(ROUTES.settings(project.id))}
              onDuplicate={() => onDuplicate(project)}
              onDelete={() => onDelete(project)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { displayName } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [stats, setStats] = useState<Map<string, ProjectStats>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, st] = await Promise.all([
        listMyProjects(),
        // 통계가 실패해도 목록은 보여준다
        myProjectStats().catch(() => [] as ProjectStats[]),
      ]);
      setProjects(list);
      setStats(new Map(st.map((s) => [s.project_id, s])));
    } catch (e) {
      setError(toAppError(e).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: Row[] = useMemo(
    () => (projects ?? []).map((p) => ({ project: p, stats: stats.get(p.id) ?? { ...EMPTY_STATS } })),
    [projects, stats],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => q === '' || r.project.name.toLowerCase().includes(q));
    const sorted = [...list];
    if (sort === 'recent') sorted.sort((a, b) => b.project.updated_at.localeCompare(a.project.updated_at));
    else if (sort === 'name') sorted.sort((a, b) => a.project.name.localeCompare(b.project.name, 'ko'));
    else sorted.sort((a, b) => b.stats.feedback_total - a.stats.feedback_total || b.stats.feedback_open - a.stats.feedback_open);
    return sorted;
  }, [rows, query, sort]);

  const totalOpen = rows.reduce((n, r) => n + r.stats.feedback_open, 0);
  const withOpen = rows.filter((r) => r.stats.feedback_open > 0).sort((a, b) => b.stats.feedback_open - a.stats.feedback_open);
  const publishedCount = rows.filter((r) => r.project.status === 'published').length;

  const onDuplicate = async (p: Project) => {
    setBusyId(p.id);
    try {
      const copy = await duplicateProject(p.id);
      setToast(`'${copy.name}'을(를) 만들었어요`);
      await load();
    } catch (e) {
      setToast(toAppError(e).message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteProject(toDelete.id);
      setProjects((list) => (list ?? []).filter((x) => x.id !== toDelete.id));
      setToast(`'${toDelete.name}'을(를) 지웠어요`);
      setToDelete(null);
    } catch (e) {
      setDeleteError(toAppError(e).message);
    } finally {
      setDeleting(false);
    }
  };

  const ready = projects !== null;
  // 머리말·배너는 불러온 뒤 한 번, 프로젝트 카드는 검색·정렬이 바뀔 때마다 다시 떠오르게 범위를 나눈다
  const topRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useScrollMotion(topRef, [ready]);
  useScrollMotion(gridRef, [ready, query, sort, rows.length]);

  const deleteStats = toDelete ? stats.get(toDelete.id) : undefined;

  return (
    <div style={{ color: 'var(--ink)', background: 'var(--surface)', minHeight: '100vh' }}>
      <AppHeader
        brandTo={ROUTES.dashboard}
        right={
          <>
            <ButtonLink to={ROUTES.gallery} variant="ghost" style={{ fontWeight: 500, fontSize: 15, padding: '0 12px' }}>
              템플릿 갤러리
            </ButtonLink>
            {withOpen[0] && (
              <Link to={ROUTES.feedback(withOpen[0].project.id)} aria-label={`알림, 새 피드백 ${totalOpen}개`} className="dash-bell">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
                  <path d="M10 20a2 2 0 0 0 4 0" />
                </svg>
                <span className="dash-bell__count">{totalOpen > 99 ? '99+' : totalOpen}</span>
              </Link>
            )}
            <Link to={ROUTES.account} aria-label={`${displayName} 계정 설정`} style={{ display: 'flex', borderRadius: 999, textDecoration: 'none' }}>
              <Avatar name={displayName} size={40} />
            </Link>
          </>
        }
      />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 64px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div ref={topRef} style={{ display: 'contents' }}>
          <div data-intro="0" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.3, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {displayName}님, 오늘은 어떤 꿈을 이어볼까요?
              </h1>
              {ready && (
                <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-muted)' }}>
                  별자리 {rows.length}개 · 배포된 데모 {publishedCount}개
                </p>
              )}
            </div>
            <ButtonLink
              to={ROUTES.newProject}
              variant="primary"
              size="lg"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              }
            >
              새 프로젝트
            </ButtonLink>
          </div>

          {totalOpen > 0 && withOpen[0] && (
            <Link
              data-reveal="scale"
              to={ROUTES.feedback(withOpen[0].project.id)}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 16,
                padding: '18px 22px',
                borderRadius: 12,
                background: 'var(--night-900)',
                color: 'var(--ink-on-night)',
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'flex', gap: 6 }} aria-hidden="true">
                {Array.from({ length: Math.min(3, totalOpen) }, (_, i) => (
                  <span key={i} style={goldDot} />
                ))}
              </span>
              <span style={{ flex: '1 1 240px', fontSize: 16, fontWeight: 500 }}>
                {withOpen.length === 1 ? (
                  <>
                    아직 확인하지 않은 피드백 {totalOpen}개가 <b>{withOpen[0].project.name}</b>에 빛을 더했어요
                  </>
                ) : (
                  <>
                    아직 확인하지 않은 피드백 {totalOpen}개가 별자리 {withOpen.length}개에 도착했어요
                  </>
                )}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: gold }}>피드백 보기 →</span>
            </Link>
          )}

          {ready && rows.length > 0 && (
            <div data-intro="1" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: '1 1 280px', maxWidth: 420, position: 'relative' }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-muted)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: 14, top: 14, pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <TextField
                  label="프로젝트 검색"
                  hideLabel
                  id="search"
                  type="search"
                  placeholder="프로젝트 검색"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ paddingLeft: 42 }}
                />
              </div>
              <SelectField id="sort" label="정렬" inline size="sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            </div>
          )}
        </div>

        {error ? (
          <PageError message={error} onRetry={() => void load()} action={<span />} />
        ) : !ready ? (
          <PageLoading label="별자리를 불러오는 중이에요" />
        ) : rows.length === 0 ? (
          <Card night gap={16} style={{ alignItems: 'flex-start', padding: '40px 32px', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
            <svg viewBox="0 0 220 80" width="220" height="80" aria-hidden="true">
              <line x1="20" y1="60" x2="90" y2="28" stroke="var(--dawn-pink)" strokeWidth="1.5" strokeDasharray="4 5" />
              <line x1="90" y1="28" x2="170" y2="44" stroke="var(--dawn-pink)" strokeWidth="1.5" strokeDasharray="4 5" />
              <circle cx="20" cy="60" r="4" fill="none" stroke={gold} strokeWidth="1.5" />
              <circle cx="90" cy="28" r="9" fill={gold} />
              <circle cx="90" cy="28" r="22" fill={gold} opacity="0.15" />
              <circle cx="170" cy="44" r="4" fill="none" stroke={gold} strokeWidth="1.5" />
            </svg>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>첫 번째 별을 찍어볼까요?</h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#d8d5ef', maxWidth: '34em' }}>
              아이디어 한 줄이면 클릭해 볼 수 있는 데모가 생겨요. 만든 데모는 링크로 나눠 보고, 받은 피드백도 여기서 모아 볼 수 있어요.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <ButtonLink to={ROUTES.newProject} variant="primary" size="lg">
                새 프로젝트
              </ButtonLink>
              <ButtonLink to={ROUTES.gallery} variant="violet" size="lg">
                템플릿 둘러보기
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <div ref={gridRef} style={{ display: 'contents' }}>
            {visible.length === 0 ? (
              <p role="status" style={{ margin: 0, padding: '32px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
                ‘{query.trim()}’에 맞는 프로젝트가 없어요.
              </p>
            ) : (
              <div data-reveal-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
                {visible.map((r) => (
                  <ProjectCard key={r.project.id} row={r} busy={busyId === r.project.id} onDuplicate={onDuplicate} onDelete={(p) => {
                    setDeleteError('');
                    setToDelete(p);
                  }} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Toast message={toast} onDone={() => setToast('')} duration={3500} />

      <Dialog
        open={toDelete !== null}
        onClose={() => {
          if (!deleting) setToDelete(null);
        }}
        alert
        title="이 별자리를 지울까요?"
        initialFocusRef={cancelRef}
        actions={
          <>
            <Button ref={cancelRef} variant="secondary" onClick={() => setToDelete(null)} disabled={deleting}>
              취소
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? '지우는 중…' : '삭제'}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-muted)' }}>
          <b style={{ color: 'var(--ink)' }}>{toDelete?.name}</b>의 페이지 {toDelete?.site?.pages?.length ?? 0}개
          {toDelete?.status === 'published' && ', 공유 링크'}
          {deleteStats && deleteStats.feedback_total > 0 && `, 피드백 ${deleteStats.feedback_total}개`}가 모두 사라지고 되돌릴 수 없어요.
        </p>
        {deleteError && (
          <p className="dm-alert dm-alert--error" role="alert" style={{ margin: '12px 0 0' }}>
            {deleteError}
          </p>
        )}
      </Dialog>
    </div>
  );
}

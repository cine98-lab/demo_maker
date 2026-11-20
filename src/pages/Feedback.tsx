import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, ButtonLink, Card, Dialog, SelectField, Tabs, Toast, cx, noteVars } from '../components';
import { PageError, PageLoading } from '../components/StatusViews.tsx';
import { ROUTES } from '../routes.ts';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { useProject } from '../lib/useProject.ts';
import { deleteFeedback, listFeedback, myProjectStats, setFeedbackStatus } from '../lib/api.ts';
import { toAppError } from '../lib/supabase.ts';
import { fullDateTime, relativeTime } from '../lib/time.ts';
import type { Feedback as FeedbackRow, FeedbackStatus } from '../lib/types.ts';
import { SiteView } from '../site/SiteView.tsx';

type StatusFilter = 'all' | 'open' | 'resolved';

const muted = 'var(--ink-muted)';

export default function Feedback() {
  const { id, project, loading: projectLoading, error: projectError, reload: reloadProject } = useProject();
  const [items, setItems] = useState<FeedbackRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [likes, setLikes] = useState<number | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('open');
  const [pageFilter, setPageFilter] = useState('');
  const [previewPage, setPreviewPage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<FeedbackRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);

  const loadList = useCallback(async () => {
    setListError(null);
    try {
      setItems(await listFeedback(id));
    } catch (e) {
      setListError(toAppError(e).message);
    }
  }, [id]);

  useEffect(() => {
    void loadList();
    myProjectStats()
      .then((rows) => setLikes(rows.find((r) => r.project_id === id)?.likes ?? 0))
      .catch(() => setLikes(null));
  }, [loadList, id]);

  const pages = useMemo(() => project?.site?.pages ?? [], [project]);
  const homeId = pages[0]?.id ?? 'home';
  const pageName = useCallback((key: string) => pages.find((p) => p.id === key)?.name ?? key, [pages]);

  const all = useMemo(() => items ?? [], [items]);
  /** 핀 번호: 먼저 들어온 의견이 1번 */
  const numbers = useMemo(() => {
    const asc = [...all].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return new Map(asc.map((f, i) => [f.id, i + 1]));
  }, [all]);

  const counts = useMemo(
    () => ({
      all: all.length,
      open: all.filter((f) => f.status === 'open').length,
      resolved: all.filter((f) => f.status === 'resolved').length,
      yes: all.filter((f) => f.would_use === true).length,
      no: all.filter((f) => f.would_use === false).length,
    }),
    [all],
  );
  const answered = counts.yes + counts.no;
  const yesPct = answered ? Math.round((counts.yes / answered) * 100) : null;

  const byStatus = useMemo(() => all.filter((f) => filter === 'all' || f.status === filter), [all, filter]);
  const visible = useMemo(() => byStatus.filter((f) => !pageFilter || f.page_key === pageFilter), [byStatus, pageFilter]);

  /** 페이지 선택 상자: 사이트의 페이지 + (지금은 없어진 페이지에 달린 의견) */
  const pageOptions = useMemo(() => {
    const opts = pages.map((p) => ({ id: p.id, name: p.name }));
    for (const f of all) if (!opts.some((o) => o.id === f.page_key)) opts.push({ id: f.page_key, name: `${f.page_key} (지금은 없는 페이지)` });
    return opts;
  }, [pages, all]);

  const selected = all.find((f) => f.id === selectedId) ?? null;
  const shownPage = previewPage || pageFilter || selected?.page_key || visible[0]?.page_key || homeId;
  const pins = byStatus.filter((f) => f.page_key === shownPage);

  const select = (f: FeedbackRow, scrollCard = false) => {
    setSelectedId(f.id);
    setPreviewPage(f.page_key);
    if (scrollCard) document.getElementById(`fb-card-${f.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const setBusy = (fid: string, on: boolean) =>
    setBusyIds((s) => {
      const n = new Set(s);
      if (on) n.add(fid);
      else n.delete(fid);
      return n;
    });

  const toggleStatus = async (f: FeedbackRow) => {
    const next: FeedbackStatus = f.status === 'open' ? 'resolved' : 'open';
    setBusy(f.id, true);
    setItems((list) => (list ?? []).map((x) => (x.id === f.id ? { ...x, status: next } : x)));
    try {
      await setFeedbackStatus(f.id, next);
      setToast(next === 'resolved' ? '해결 처리했어요' : '다시 열었어요');
    } catch (e) {
      setItems((list) => (list ?? []).map((x) => (x.id === f.id ? { ...x, status: f.status } : x)));
      setToast(toAppError(e).message);
    } finally {
      setBusy(f.id, false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteFeedback(toDelete.id);
      setItems((list) => (list ?? []).filter((x) => x.id !== toDelete.id));
      if (selectedId === toDelete.id) setSelectedId(null);
      setToDelete(null);
      setToast('의견을 지웠어요');
    } catch (e) {
      setDeleteError(toAppError(e).message);
    } finally {
      setDeleting(false);
    }
  };

  const ready = Boolean(project) && items !== null;
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollMotion(rootRef, [ready]);

  const tabs = [
    { id: 'all' as const, label: '전체', count: counts.all },
    { id: 'open' as const, label: '열림', count: counts.open },
    { id: 'resolved' as const, label: '해결됨', count: counts.resolved },
  ];

  const header = (
    <header style={{ background: 'var(--surface-raised)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <ButtonLink
            to={ROUTES.dashboard}
            aria-label="대시보드로"
            square
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            }
          />
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>
            {project?.name ?? '프로젝트'} <span style={{ fontWeight: 500, color: muted }}>· 피드백</span>
          </h1>
        </div>
        {ready && all.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <Tabs label="상태 필터" variant="pill" value={filter} onChange={setFilter} items={tabs} />
            <SelectField
              label="페이지 선택"
              hideLabel
              id="page-filter"
              value={pageFilter}
              onChange={(e) => {
                setPageFilter(e.target.value);
                setPreviewPage(e.target.value);
                setSelectedId(null);
              }}
              style={{ width: 'auto', height: 40, fontSize: 14 }}
            >
              <option value="">모든 페이지</option>
              {pageOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
          </div>
        )}
      </div>
    </header>
  );

  let body;
  if (projectError || listError) {
    body = (
      <PageError
        message={projectError ?? listError ?? ''}
        onRetry={() => {
          if (projectError) reloadProject();
          void loadList();
        }}
      />
    );
  } else if (projectLoading || !ready || !project) {
    body = <PageLoading label="피드백을 불러오는 중이에요" />;
  } else if (all.length === 0) {
    const published = project.status === 'published';
    body = (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 64px' }}>
        <Card night data-intro gap={16} style={{ padding: '36px 32px', borderRadius: 20 }}>
          <span style={{ display: 'flex', gap: 6 }} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 10, height: 10, borderRadius: 999, border: '1.5px solid var(--star-gold)' }} />
            ))}
          </span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>아직 도착한 의견이 없어요</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#d8d5ef' }}>
            {published
              ? '공유 링크를 친구, 동료, 앞으로 쓸 사람들에게 보내 보세요. 방문자가 화면 위에 별(핀)을 찍어 의견을 남기면 여기에 모여요.'
              : '먼저 데모를 배포해서 링크를 만들어 보세요. 방문자가 화면 위에 별(핀)을 찍어 의견을 남기면 여기에 모여요.'}
          </p>
          {published && !project.feedback_enabled && (
            <p className="dm-alert dm-alert--info" style={{ margin: 0 }}>
              지금은 피드백 받기가 꺼져 있어요. 배포 설정에서 켤 수 있어요.
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <ButtonLink to={ROUTES.published(id)} variant="primary" size="lg">
              {published ? '공유 링크 확인하기' : '배포하러 가기'}
            </ButtonLink>
            <ButtonLink to={ROUTES.editor(id)} variant="violet" size="lg">
              에디터로
            </ButtonLink>
          </div>
        </Card>
      </main>
    );
  } else {
    body = (
      <>
        <div style={{ background: 'var(--night-900)', color: 'var(--ink-on-night)' }}>
          <div
            data-intro
            style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 32px' }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>
              <span style={{ color: 'var(--star-gold)', fontWeight: 800 }}>{counts.all}개</span>의 의견이 당신의 꿈에 빛을 더했어요
            </p>
            <dl style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 28px', fontSize: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <dt style={{ color: 'var(--dawn-pink)' }}>열림</dt>
                <dd style={{ margin: 0, fontWeight: 700 }}>{counts.open}</dd>
              </div>
              {likes !== null && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <dt style={{ color: 'var(--dawn-pink)' }}>좋아요</dt>
                  <dd style={{ margin: 0, fontWeight: 700 }}>{likes}</dd>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <dt style={{ color: 'var(--dawn-pink)' }}>"이 서비스를 써보고 싶나요?"</dt>
                <dd style={{ margin: 0, fontWeight: 700 }}>
                  {yesPct === null ? '아직 답이 없어요' : `예 ${yesPct}% (${counts.yes} · 아니요 ${counts.no})`}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <main
          style={{ flex: 1, width: '100%', maxWidth: 1280, margin: '0 auto', boxSizing: 'border-box', padding: 24, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}
        >
          {/* 댓글 목록 */}
          <section aria-label="댓글 목록" style={{ flex: '1 1 340px', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visible.length === 0 && (
              <p role="status" style={{ margin: 0, padding: '24px 4px', color: muted, fontSize: 15 }}>
                {filter === 'open' ? '열린 의견이 없어요. 모두 해결했어요!' : '이 조건에 맞는 의견이 없어요.'}
              </p>
            )}
            {visible.map((c) => {
              const active = c.id === selectedId;
              const resolved = c.status === 'resolved';
              const busy = busyIds.has(c.id);
              return (
                <Card
                  as="article"
                  key={c.id}
                  id={`fb-card-${c.id}`}
                  aria-current={active ? 'true' : undefined}
                  aria-label={`${numbers.get(c.id)}번 의견`}
                  gap={10}
                  style={{ padding: 16, border: active ? '2px solid var(--dawn-coral)' : undefined, opacity: resolved && !active ? 0.8 : 1 }}
                >
                  <button
                    type="button"
                    onClick={() => select(c)}
                    aria-pressed={active}
                    style={{ border: 0, padding: 0, margin: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 8 }}
                  >
                    <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                      <span
                        className={cx('dm-note', 'dm-note--sm', active && 'dm-note--active', resolved && 'dm-note--resolved')}
                        style={noteVars(numbers.get(c.id) ?? 0)}
                        aria-hidden="true"
                      >
                        {numbers.get(c.id)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{c.author_name.trim() || '익명'}</span>
                      <span style={{ fontSize: 13, color: muted }}>
                        {pageName(c.page_key)} · <time dateTime={c.created_at} title={fullDateTime(c.created_at)}>{relativeTime(c.created_at)}</time>
                      </span>
                    </span>
                    <span style={{ margin: 0, fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.body}</span>
                  </button>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ display: 'flex', gap: 6 }}>
                      {c.would_use === true && <Badge tone="success">써보고 싶어요</Badge>}
                      {c.would_use === false && <Badge tone="neutral">써보고 싶진 않아요</Badge>}
                      {resolved && <Badge tone="night">해결됨</Badge>}
                    </span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <Button variant={resolved ? 'ghost' : 'success-text'} size="sm" disabled={busy} onClick={() => void toggleStatus(c)}>
                        {resolved ? '다시 열기' : '해결 처리'}
                      </Button>
                      <Button
                        variant="danger-text"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setDeleteError('');
                          setToDelete(c);
                        }}
                      >
                        삭제
                      </Button>
                    </span>
                  </div>
                </Card>
              );
            })}
          </section>

          {/* 화면 미리보기 */}
          <section aria-label="화면 미리보기" data-reveal style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                {pageName(shownPage)} <span style={{ fontWeight: 500, color: muted }}>· 핀 {pins.length}개</span>
              </h2>
              <ButtonLink to={ROUTES.editor(id)} variant="primary">
                에디터에서 이 화면 수정
              </ButtonLink>
            </div>
            <div
              style={{
                position: 'relative',
                background: 'var(--surface-raised)',
                borderRadius: 12,
                border: '1px solid var(--line)',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(20, 27, 58, 0.06), 0 4px 16px rgba(20, 27, 58, 0.04)',
              }}
            >
              <SiteView
                site={project.site}
                pageId={shownPage}
                compact
                onNavigate={(pid) => {
                  setPreviewPage(pid);
                  if (selected && selected.page_key !== pid) setSelectedId(null);
                }}
              />
              {pins.map((p) => {
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={`${numbers.get(p.id)}번 의견 보기`}
                    aria-pressed={active}
                    onClick={() => select(p, true)}
                    className={cx('dm-note', active && 'dm-note--active', p.status === 'resolved' && 'dm-note--resolved')}
                    style={{ ...noteVars(numbers.get(p.id) ?? 0), left: `${p.x_pct}%`, top: Math.max(22, p.y_px) }}
                  >
                    {numbers.get(p.id)}
                  </button>
                );
              })}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: muted }}>핀 위치는 방문자 화면 기준이라 미리보기에서는 조금 어긋날 수 있어요.</p>
          </section>
        </main>
      </>
    );
  }

  return (
    <div ref={rootRef} style={{ color: 'var(--ink)', background: 'var(--surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {header}
      {body}

      <Toast message={toast} onDone={() => setToast('')} duration={3000} />

      <Dialog
        open={toDelete !== null}
        onClose={() => {
          if (!deleting) setToDelete(null);
        }}
        alert
        title="이 의견을 지울까요?"
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
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: muted }}>
          {toDelete && (
            <>
              <b style={{ color: 'var(--ink)' }}>{toDelete.author_name.trim() || '익명'}</b>님이 남긴 의견이 사라지고 되돌릴 수 없어요.
            </>
          )}
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

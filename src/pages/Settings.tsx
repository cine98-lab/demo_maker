import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { AppHeader, Badge, Button, ButtonLink, Card, Dialog, StatusLabel, Switch, Tabs, TextField, Toast } from '../components';
import { PageError, PageLoading } from '../components/StatusViews.tsx';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { useProject } from '../lib/useProject.ts';
import { deleteProject, duplicateProject, listVersions, publicUrl, restoreVersion, updateProject } from '../lib/api.ts';
import { toAppError } from '../lib/supabase.ts';
import { fullDateTime, relativeTime } from '../lib/time.ts';
import { exportSiteHtml, exportSiteJson } from '../lib/publish/exportSite.ts';
import type { Project, ProjectVersion } from '../lib/types.ts';
import { SiteView } from '../site/SiteView.tsx';

type TabId = 'general' | 'versions' | 'export';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'general', label: '일반' },
  { id: 'versions', label: '버전 기록' },
  { id: 'export', label: '내보내기' },
];

const muted14: CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-muted)' };
const exportIcon = {
  width: 32,
  height: 32,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'var(--dawn-coral-ink)',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const backIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export default function Settings() {
  const { id, project, setProject, loading, error, reload } = useProject();
  const [tab, setTab] = useState<TabId>('general');
  const [toast, setToast] = useState('');
  // 탭을 바꾸면 새 패널의 카드들이 다시 떠오르게
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollMotion(rootRef, [tab, Boolean(project)]);

  return (
    <div ref={rootRef} style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink)', background: 'var(--surface)', minHeight: '100vh' }}>
      <AppHeader
        brandTo={ROUTES.dashboard}
        maxWidth={960}
        brand={
          <>
            <ButtonLink to={ROUTES.editor(id)} aria-label="에디터로" square>
              {backIcon}
            </ButtonLink>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>
              프로젝트 설정 {project && <span style={{ fontWeight: 500, color: 'var(--ink-muted)' }}>· {project.name}</span>}
            </h1>
          </>
        }
      />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 64px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading && !project ? (
          <PageLoading label="설정을 불러오는 중이에요" />
        ) : error || !project ? (
          <PageError message={error ?? '프로젝트를 찾을 수 없어요.'} onRetry={reload} />
        ) : (
          <>
            <Tabs
              label="설정 메뉴"
              idPrefix="settings"
              items={TABS}
              value={tab}
              onChange={(t) => {
                setTab(t);
                setToast('');
              }}
            />
            {tab === 'general' && <GeneralTab project={project} setProject={setProject} onToast={setToast} />}
            {tab === 'versions' && <VersionsTab project={project} setProject={setProject} onToast={setToast} />}
            {tab === 'export' && <ExportTab project={project} onToast={setToast} />}
          </>
        )}
      </main>

      <Toast message={toast} onDone={() => setToast('')} duration={4000} placement="top" />
    </div>
  );
}

type TabProps = { project: Project; setProject: (p: Project) => void; onToast: (m: string) => void };

function GeneralTab({ project, setProject, onToast }: TabProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [savingFb, setSavingFb] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);

  const trimmed = name.trim();
  const nameChanged = trimmed !== project.name;
  const published = project.status === 'published';

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      setNameError('프로젝트 이름을 입력해 주세요.');
      return;
    }
    if (!nameChanged) return;
    setSavingName(true);
    setNameError('');
    try {
      const p = await updateProject(project.id, { name: trimmed.slice(0, 80) });
      setProject(p);
      setName(p.name);
      onToast('이름을 바꿨어요');
    } catch (err) {
      setNameError(toAppError(err).message);
    } finally {
      setSavingName(false);
    }
  };

  const toggleFeedback = async (on: boolean) => {
    const prev = project;
    setProject({ ...project, feedback_enabled: on });
    setSavingFb(true);
    try {
      setProject(await updateProject(project.id, { feedback_enabled: on }));
      onToast(on ? '피드백을 다시 받을게요' : '피드백 받기를 껐어요');
    } catch (err) {
      setProject(prev);
      onToast(toAppError(err).message);
    } finally {
      setSavingFb(false);
    }
  };

  const duplicate = async () => {
    setDuplicating(true);
    try {
      const copy = await duplicateProject(project.id);
      navigate(ROUTES.editor(copy.id));
    } catch (err) {
      onToast(toAppError(err).message);
      setDuplicating(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteProject(project.id);
      navigate(ROUTES.dashboard, { replace: true });
    } catch (err) {
      setDeleteError(toAppError(err).message);
      setDeleting(false);
    }
  };

  return (
    <div role="tabpanel" id="settings-general" aria-labelledby="settings-tab-general" data-reveal-stagger style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card as="form" onSubmit={saveName} aria-label="프로젝트 이름">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: '1 1 260px', maxWidth: 420 }}>
            <TextField
              id="pname"
              label="프로젝트 이름"
              type="text"
              maxLength={80}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
              }}
              error={nameError || undefined}
              disabled={savingName}
            />
          </div>
          <Button type="submit" variant="night" size="lg" disabled={savingName || !nameChanged} style={{ marginTop: 28 }}>
            {savingName ? '저장하는 중…' : '저장'}
          </Button>
        </div>
      </Card>

      <Card
        title="배포"
        actions={
          <ButtonLink to={ROUTES.published(project.id)} variant="secondary">
            배포 설정
          </ButtonLink>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <StatusLabel tone={published ? 'success' : 'muted'}>{published ? '배포됨' : '아직 배포하지 않았어요'}</StatusLabel>
          {published && project.slug && (
            <a href={ROUTES.site(project.slug)} target="_blank" rel="noopener" style={{ fontSize: 14, overflowWrap: 'anywhere' }}>
              {publicUrl(project.slug)} ↗
            </a>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 14, borderTop: '1px solid #f0efea' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span id="settings-fb-label" style={{ fontSize: 14, fontWeight: 700 }}>
              피드백 받기
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>방문자가 화면에 별(핀)을 남길 수 있어요</span>
          </div>
          <Switch checked={project.feedback_enabled} onChange={(v) => void toggleFeedback(v)} aria-labelledby="settings-fb-label" disabled={savingFb} />
        </div>
      </Card>

      <Card
        title="프로젝트 복제"
        actions={
          <Button variant="secondary" onClick={() => void duplicate()} disabled={duplicating}>
            {duplicating ? '복제하는 중…' : '복제하기'}
          </Button>
        }
      >
        <p style={muted14}>지금 상태 그대로 하나 더 만들어요. 다른 시안(B안)을 시험해 볼 때 좋아요. 배포 정보와 피드백은 복사되지 않아요.</p>
      </Card>

      <Card
        title={<span style={{ color: 'var(--danger)' }}>프로젝트 삭제</span>}
        actions={
          <Button
            variant="danger-outline"
            onClick={() => {
              setDeleteError('');
              setConfirmOpen(true);
            }}
          >
            삭제
          </Button>
        }
        style={{ borderColor: '#f1c9c9', background: '#fffafa' }}
      >
        <p style={muted14}>데모, 공유 링크, 받은 피드백이 모두 지워지고 되돌릴 수 없어요.</p>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!deleting) setConfirmOpen(false);
        }}
        alert
        title="이 별자리를 지울까요?"
        initialFocusRef={cancelRef}
        actions={
          <>
            <Button ref={cancelRef} variant="secondary" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              취소
            </Button>
            <Button variant="danger" onClick={() => void remove()} disabled={deleting}>
              {deleting ? '지우는 중…' : '삭제'}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-muted)' }}>
          <b style={{ color: 'var(--ink)' }}>{project.name}</b>의 페이지 {project.site?.pages?.length ?? 0}개{published ? ', 공유 링크' : ''}, 받은 피드백이 모두 사라지고 되돌릴 수
          없어요.
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

function VersionsTab({ project, setProject, onToast }: TabProps) {
  const [versions, setVersions] = useState<ProjectVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<ProjectVersion | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setVersions(await listVersions(project.id));
    } catch (e) {
      setError(toAppError(e).message);
    }
  }, [project.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (v: ProjectVersion) => {
    setRestoringId(v.id);
    try {
      const p = await restoreVersion(project.id, v);
      setProject(p);
      await load();
      onToast(`버전 ${v.version_no}으로 되돌렸어요. 되돌리기 전 상태도 기록에 남아 있어요.`);
    } catch (e) {
      onToast(toAppError(e).message);
    } finally {
      setRestoringId(null);
    }
  };

  const currentNo = versions?.[0]?.version_no;

  return (
    <div role="tabpanel" id="settings-versions" aria-labelledby="settings-tab-versions" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-muted)' }}>저장할 때마다 별이 하나씩 늘어요. 어느 시점으로든 돌아갈 수 있어요.</p>
      {error ? (
        <PageError message={error} onRetry={() => void load()} action={<span />} />
      ) : versions === null ? (
        <PageLoading label="버전 기록을 불러오는 중이에요" />
      ) : versions.length === 0 ? (
        <p style={muted14}>아직 저장된 버전이 없어요. 에디터에서 저장하면 여기에 쌓여요.</p>
      ) : (
        <ol data-reveal-stagger style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
          {versions.map((v, i) => {
            const cur = v.version_no === currentNo;
            const d = cur ? 16 : 10;
            return (
              <li key={v.id} style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flex: 'none' }}>
                  <span
                    style={{
                      width: d,
                      height: d,
                      marginTop: 22,
                      borderRadius: 999,
                      background: cur ? 'var(--star-gold)' : 'var(--night-900)',
                      boxShadow: cur ? '0 0 0 3px var(--night-900), 0 0 18px rgba(255, 214, 107, 0.6)' : 'none',
                      flex: 'none',
                    }}
                  />
                  <span style={{ flex: 1, width: 1, background: i === versions.length - 1 ? 'transparent' : 'var(--dawn-coral)' }} />
                </div>
                <Card
                  as="div"
                  gap={10}
                  style={{ flex: 1, minWidth: 0, marginBottom: 10, padding: '14px 16px', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
                      버전 {v.version_no}
                      {cur && <Badge tone="night">지금 버전</Badge>}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                      <time dateTime={v.created_at} title={fullDateTime(v.created_at)}>
                        {relativeTime(v.created_at)}
                      </time>
                      {v.label && ` · ${v.label}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="secondary" size="sm" onClick={() => setPreviewing(v)}>
                      미리보기
                    </Button>
                    {!cur && (
                      <Button variant="soft" size="sm" onClick={() => void restore(v)} disabled={restoringId !== null}>
                        {restoringId === v.id ? '되돌리는 중…' : '이 버전으로 되돌리기'}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog
        open={previewing !== null}
        onClose={() => setPreviewing(null)}
        size="lg"
        title={previewing ? `버전 ${previewing.version_no} 미리보기` : '미리보기'}
        header={{
          actions: (
            <Button variant="ghost" onClick={() => setPreviewing(null)}>
              닫기
            </Button>
          ),
        }}
      >
        {previewing && (
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <SiteView site={previewing.site} compact />
          </div>
        )}
      </Dialog>
    </div>
  );
}

function ExportTab({ project, onToast }: { project: Project; onToast: (m: string) => void }) {
  const [htmlBusy, setHtmlBusy] = useState(false);
  const pageCount = project.site?.pages?.length ?? 0;

  return (
    <div role="tabpanel" id="settings-export" aria-labelledby="settings-tab-export" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={muted14}>충분히 다듬었다면, 실제 개발을 시작할 때 쓸 수 있도록 내보내세요.</p>
      <div data-reveal-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Card as="div" gap={12}>
          <svg {...exportIcon}>
            <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
          </svg>
          <span style={{ fontSize: 17, fontWeight: 700 }}>HTML로 내보내기</span>
          <span style={muted14}>대표 화면을 CSS 가 들어간 HTML 파일 하나로 받아요. 브라우저에서 바로 열어 보거나 개발자에게 넘길 수 있어요.</span>
          <Button
            variant="primary"
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
            disabled={htmlBusy}
            onClick={async () => {
              setHtmlBusy(true);
              try {
                await exportSiteHtml(project.name, project.site);
                onToast('HTML 파일을 내려받았어요');
              } catch (e) {
                onToast(toAppError(e).message);
              } finally {
                setHtmlBusy(false);
              }
            }}
          >
            {htmlBusy ? '만드는 중…' : 'HTML로 내보내기'}
          </Button>
        </Card>
        <Card as="div" gap={12}>
          <svg {...exportIcon}>
            <path d="M8 4H6a2 2 0 0 0-2 2v4l-2 2 2 2v4a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v4l2 2-2 2v4a2 2 0 0 1-2 2h-2" />
          </svg>
          <span style={{ fontSize: 17, fontWeight: 700 }}>JSON으로 내보내기</span>
          <span style={muted14}>페이지 {pageCount}개의 구조와 문구, 색을 데이터 파일(.json)로 받아요. 백업하거나 다른 도구로 옮길 때 좋아요.</span>
          <Button
            variant="secondary"
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
            onClick={() => {
              try {
                exportSiteJson(project.name, project.site);
                onToast('JSON 파일을 내려받았어요');
              } catch (e) {
                onToast(toAppError(e).message);
              }
            }}
          >
            JSON으로 내보내기
          </Button>
        </Card>
      </div>
    </div>
  );
}

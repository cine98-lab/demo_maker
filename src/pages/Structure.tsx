import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { AppHeader, Button, Card, TextField } from '../components';
import { PageError, PageLoading } from '../components/StatusViews.tsx';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useProject } from '../lib/useProject.ts';
import { acceptSuggested, addPage, deletePage, updatePage } from '../lib/editor/siteOps.ts';
import type { SiteSpec } from '../lib/types.ts';
import { ContentLinesEditor } from './editor/ContentLinesEditor.tsx';
import { useAutosave } from './editor/useAutosave.ts';
import type { SaveState } from './editor/useAutosave.ts';

const MAX_PAGES = 12;

const stepDot: CSSProperties = { width: 10, height: 10, borderRadius: 999, background: 'var(--night-900)' };
const stepLine: CSSProperties = { width: 32, height: 1, background: 'var(--dawn-coral)' };
const stepDone: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-muted)' };

const SAVE_LABEL: Record<SaveState, string> = {
  saved: '저장됨',
  pending: '바뀐 내용 있음',
  saving: '저장 중…',
  error: '저장 못 함',
};

export default function Structure() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id, isDraft, project, setProject, loading, error, reload } = useProject();
  const [site, setSite] = useState<SiteSpec | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [leaving, setLeaving] = useState(false);

  // 처음 불러왔을 때 편집용 사본을 만든다
  useEffect(() => {
    if (project && !site) {
      setSite(project.site);
      setSelectedId(project.site.pages[1]?.id ?? project.site.pages[0]?.id ?? '');
    }
  }, [project, site]);

  const autosave = useAutosave(id, site, setProject);

  const rootRef = useRef<HTMLDivElement>(null);
  useScrollMotion(rootRef, [site !== null]);

  const homeTo = user ? ROUTES.dashboard : ROUTES.main;

  if (loading && !project) return <PageLoading label="페이지 구성을 불러오는 중이에요" />;
  if (error || !project) {
    return (
      <PageError
        message={error ?? '프로젝트를 찾지 못했어요.'}
        onRetry={reload}
        action={
          isDraft ? (
            <Link to={ROUTES.newProject} className="dm-btn dm-btn--ghost dm-btn--md">
              새로 만들기
            </Link>
          ) : undefined
        }
      />
    );
  }
  if (!site) return <PageLoading label="페이지 구성을 불러오는 중이에요" />;

  const pages = site.pages;
  const selected = pages.find((p) => p.id === selectedId) ?? pages[0];
  const isFirst = selected?.id === pages[0]?.id;
  const at = new Map(pages.map((p) => [p.id, p]));
  const suggestedCount = pages.filter((p) => p.suggested).length;

  const change = (fn: (s: SiteSpec) => SiteSpec) => setSite((s) => (s ? fn(s) : s));

  const onAdd = () => {
    const r = addPage(site, '새 페이지', selected?.id);
    setSite(r.site);
    setSelectedId(r.id);
    window.setTimeout(() => document.getElementById('page-name')?.focus(), 0);
  };
  const onDelete = (pid: string) => {
    const idx = pages.findIndex((p) => p.id === pid);
    change((s) => deletePage(s, pid));
    setSelectedId(pages[Math.max(0, idx - 1)]?.id ?? pages[0].id);
  };

  const goEditor = async () => {
    setLeaving(true);
    const ok = await autosave.flush();
    setLeaving(false);
    if (ok) navigate(ROUTES.editor(id));
  };

  const intro = [site.kind, site.mood].filter(Boolean).join(' · ');

  return (
    <div
      ref={rootRef}
      style={{
        color: 'var(--ink)',
        background: 'var(--surface)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppHeader
        brandTo={homeTo}
        right={
          <ol
            aria-label="진행 단계"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
            }}
          >
            <li style={stepDone}>
              <span style={stepDot} />
              시작 방법
            </li>
            <li aria-hidden="true" style={stepLine} />
            <li style={stepDone}>
              <span style={stepDot} />
              정보 입력
            </li>
            <li aria-hidden="true" style={stepLine} />
            <li aria-current="step" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: 'var(--star-gold)',
                  boxShadow: '0 0 0 3px var(--night-900)',
                }}
              />
              구조 확인
            </li>
          </ol>
        }
      />

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          boxSizing: 'border-box',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div data-intro style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>
            이런 구성으로 만들어 볼게요
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-muted)', overflowWrap: 'anywhere' }}>
            "{project.idea}"{intro && ` · ${intro}`}
            {isDraft && (
              <Link to={ROUTES.newProject} style={{ fontWeight: 700, marginLeft: 6 }}>
                처음부터 다시
              </Link>
            )}
          </p>
        </div>

        {autosave.error && (
          <p role="alert" className="dm-alert dm-alert--error" style={{ margin: 0 }}>
            저장하지 못했어요. {autosave.error}{' '}
            <button type="button" className="dm-btn dm-btn--ghost dm-btn--sm" onClick={() => void autosave.flush()}>
              다시 저장
            </button>
          </p>
        )}

        <div data-reveal-stagger style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'stretch' }}>
          {/* 왼쪽: 페이지 지도 (별자리) */}
          <Card
            night
            gap={16}
            style={{ flex: '999 1 560px', minWidth: 0, borderRadius: 20 }}
            title={
              <span style={{ fontSize: 18 }}>
                페이지 지도 <span style={{ fontWeight: 500, color: 'var(--dawn-pink)' }}>· {pages.length}개</span>
              </span>
            }
            actions={
              <Button
                variant="violet"
                onClick={onAdd}
                disabled={pages.length >= MAX_PAGES}
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--star-gold)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                }
              >
                페이지 추가
              </Button>
            }
          >
            <div style={{ position: 'relative', height: 420 }}>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                aria-hidden="true"
              >
                <g fill="none" stroke="var(--dawn-pink)" strokeWidth="1.5" strokeLinecap="round" opacity="0.75">
                  {site.links.map((l, i) => {
                    const a = at.get(l.from);
                    const b = at.get(l.to);
                    if (!a || !b) return null;
                    const dashed = l.dashed || a.suggested || b.suggested;
                    return (
                      <line
                        key={`${l.from}-${l.to}-${i}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray={dashed ? '3 5' : undefined}
                      />
                    );
                  })}
                </g>
              </svg>
              <ul role="list" aria-label="페이지" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {pages.map((p) => {
                  const isSelected = p.id === selected?.id;
                  const color = isSelected
                    ? 'var(--star-gold)'
                    : p.suggested
                      ? 'var(--dawn-pink)'
                      : 'var(--ink-on-night)';
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedId(p.id)}
                        style={{
                          position: 'absolute',
                          left: `${p.x}%`,
                          top: `${p.y}%`,
                          transform: 'translate(-50%, -14px)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          padding: 0,
                          border: 0,
                          background: 'transparent',
                          color,
                          font: 'inherit',
                          fontSize: 14,
                          fontWeight: isSelected ? 800 : 500,
                          cursor: 'pointer',
                          minWidth: 44,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...(isSelected
                              ? {
                                  borderRadius: 999,
                                  boxShadow: '0 0 0 2px var(--dawn-coral), 0 0 24px rgba(255, 214, 107, 0.45)',
                                }
                              : null),
                          }}
                        >
                          <span
                            style={
                              p.suggested
                                ? {
                                    width: p.dot,
                                    height: p.dot,
                                    borderRadius: 999,
                                    border: '2px dashed var(--dawn-pink)',
                                    boxSizing: 'border-box',
                                  }
                                : { width: p.dot, height: p.dot, borderRadius: 999, background: 'var(--star-gold)' }
                            }
                          />
                        </span>
                        {p.name || '이름 없음'}
                        {p.suggested && ' (제안)'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--dawn-pink)' }}>
              별을 눌러 이름과 내용을 고쳐요. 점선 별은 AI가 더하면 좋겠다고 제안한 페이지예요
              {suggestedCount > 0 && ` (${suggestedCount}개)`}.
            </p>
          </Card>

          {/* 오른쪽: 선택한 페이지 내용 */}
          {selected && (
            <Card aria-labelledby="detail-title" gap={18} style={{ flex: '1 1 340px', minWidth: 0, borderRadius: 20 }}>
              <h2
                id="detail-title"
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--dawn-coral-ink)',
                }}
              >
                선택한 페이지{isFirst && ' · 첫 화면'}
              </h2>
              {selected.suggested && (
                <div className="dm-alert dm-alert--info" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span>
                    AI가 제안한 페이지예요. 넣을까요?
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Button size="sm" variant="night" onClick={() => change((s) => acceptSuggested(s, selected.id))}>
                      추가할게요
                    </Button>
                    <Button size="sm" onClick={() => onDelete(selected.id)}>
                      괜찮아요
                    </Button>
                  </div>
                </div>
              )}
              <TextField
                label="페이지 이름"
                id="page-name"
                type="text"
                maxLength={30}
                value={selected.name}
                error={selected.name.trim() ? undefined : '페이지 이름을 적어 주세요.'}
                onChange={(e) => {
                  const name = e.target.value;
                  change((s) => updatePage(s, selected.id, { name }));
                }}
              />
              {isFirst ? (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-muted)' }}>
                  첫 화면의 제목, 버튼, 목록은 다음 단계인 에디터에서 화면을 보며 고칠 수 있어요.
                </p>
              ) : (
                <ContentLinesEditor
                  pageName={selected.name}
                  lines={selected.contents}
                  onChange={(contents) => change((s) => updatePage(s, selected.id, { contents }))}
                />
              )}
              {!isFirst && !selected.suggested && (
                <Button variant="danger-outline" style={{ marginTop: 'auto', alignSelf: 'flex-start' }} onClick={() => onDelete(selected.id)}>
                  이 페이지 삭제
                </Button>
              )}
            </Card>
          )}
        </div>
      </main>

      <footer style={{ background: 'var(--surface-raised)', borderTop: '1px solid var(--line)' }}>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Button size="lg" onClick={() => void autosave.flush().then(() => navigate(ROUTES.newProject))}>
            이전
          </Button>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <span
              role="status"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: autosave.state === 'error' ? 'var(--danger)' : autosave.state === 'saved' ? 'var(--success)' : 'var(--ink-muted)',
              }}
            >
              {SAVE_LABEL[autosave.state]}
              {isDraft && autosave.state === 'saved' && ' · 이 브라우저에'}
            </span>
            <Button variant="primary" size="lg" onClick={() => void goEditor()} disabled={leaving}>
              {leaving ? '저장 중…' : '다음: 에디터'}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

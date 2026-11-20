import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { Button, Segmented, Tabs, TextField, Toast } from '../components';
import { PageError, PageLoading } from '../components/StatusViews.tsx';
import { useAuth } from '../auth/AuthProvider.tsx';
import { saveSite } from '../lib/api.ts';
import { AI_HINTS, runAiCommand } from '../lib/editor/aiCommands.ts';
import { COLOR_PRESETS, addPage, setBrandColor } from '../lib/editor/siteOps.ts';
import { paletteFrom } from '../lib/color.ts';
import { toAppError } from '../lib/supabase.ts';
import { useProject } from '../lib/useProject.ts';
import { SiteView } from '../site/SiteView.tsx';
import { CanvasToast } from './editor/CanvasToast.tsx';
import { DraftLoginDialog } from './editor/DraftLoginDialog.tsx';
import { HOME_SECTIONS, PropertiesPanel } from './editor/PropertiesPanel.tsx';
import { useSiteHistory } from './editor/useSiteHistory.ts';

type Device = 'pc' | 'tablet' | 'mobile';
type LeftTab = 'pages' | 'blocks' | 'theme';

/** 캔버스 최대 너비: 기기 전환에 따라 바뀐다 */
const DEVICES: readonly { id: Device; label: string; canvasMax: number; icon: ReactNode }[] = [
  {
    id: 'pc',
    label: '데스크톱',
    canvasMax: 820,
    icon: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  },
  { id: 'tablet', label: '태블릿', canvasMax: 600, icon: <rect x="5" y="3" width="14" height="18" rx="2" /> },
  { id: 'mobile', label: '모바일', canvasMax: 375, icon: <rect x="7" y="3" width="10" height="18" rx="2" /> },
];

const DEVICE_OPTIONS = DEVICES.map((d) => ({
  value: d.id,
  label: (
    <>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        {d.icon}
      </svg>
      <span className="sr-only">{d.label}</span>
    </>
  ),
}));

const LEFT_TABS: readonly { id: LeftTab; label: string }[] = [
  { id: 'pages', label: '페이지' },
  { id: 'blocks', label: '블록' },
  { id: 'theme', label: '테마' },
];

const MAX_PAGES = 12;
const SAVE_LABEL = '에디터에서 수정';

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export default function Editor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id, isDraft, project, setProject, loading, error, reload } = useProject();
  const { site, canUndo, canRedo, reset, update, undo, redo } = useSiteHistory();

  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [canvasToast, setCanvasToast] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>('pc');
  const [leftTab, setLeftTab] = useState<LeftTab>('pages');
  const [currentPage, setCurrentPage] = useState('');
  const [aiAsk, setAiAsk] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // 처음 불러왔을 때(또는 다른 프로젝트로 바뀌었을 때) 편집 사본을 만든다
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!project) return;
    const key = `${id}:${project.id}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    reset(project.site);
    setSavedJson(JSON.stringify(project.site));
    setCurrentPage(project.site.pages[0]?.id ?? '');
  }, [project, id, reset]);

  const siteJson = useMemo(() => (site ? JSON.stringify(site) : null), [site]);
  const dirty = siteJson !== null && savedJson !== null && siteJson !== savedJson;

  // 지운 페이지를 보고 있었다면 첫 페이지로
  const pageId = site && site.pages.some((p) => p.id === currentPage) ? currentPage : site?.pages[0]?.id ?? '';

  const save = useCallback(async (): Promise<boolean> => {
    if (!site || !siteJson) return true;
    if (siteJson === savedJson) return true;
    setSaving(true);
    setSaveError(null);
    try {
      const p = await saveSite(id, site, SAVE_LABEL);
      setProject(p);
      setSavedJson(siteJson);
      setToast(isDraft ? '이 브라우저에 저장했어요' : '저장했어요');
      return true;
    } catch (e) {
      setSaveError(toAppError(e).message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, isDraft, site, siteJson, savedJson, setProject]);

  // Ctrl/Cmd+S 저장, Ctrl/Cmd+Z 되돌리기 (입력 칸 밖에서만), Ctrl/Cmd+Shift+Z 다시하기
  const keyRef = useRef({ save, undo, redo });
  keyRef.current = { save, undo, redo };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        void keyRef.current.save();
        return;
      }
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing) return;
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        keyRef.current.undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        keyRef.current.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 저장하지 않은 채 창을 닫으려 하면 경고
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  /** 다른 화면으로 가기 전에 저장 */
  const leave = async (to: string) => {
    if (dirty && !(await save())) return;
    navigate(to);
  };

  const onPublish = async () => {
    if (isDraft) {
      if (dirty && !(await save())) return;
      setLoginOpen(true);
      return;
    }
    await leave(ROUTES.published(id));
  };

  const onAi = (e: FormEvent) => {
    e.preventDefault();
    if (!site) return;
    const r = runAiCommand(aiAsk, site);
    if (r.site) {
      const next = r.site;
      update(() => next);
      setAiAsk('');
    }
    setAiReply(r.message);
  };

  const backTo = isDraft || !user ? ROUTES.main : ROUTES.dashboard;

  if (loading && !project) return <PageLoading label="에디터를 여는 중이에요" />;
  if (error || !project) return <PageError message={error ?? '프로젝트를 찾지 못했어요.'} onRetry={reload} />;
  if (!site) return <PageLoading label="에디터를 여는 중이에요" />;

  const canvasMax = DEVICES.find((d) => d.id === device)?.canvasMax ?? 820;
  const statusText = saving ? '저장 중…' : saveError ? '저장 못 함' : dirty ? '저장 안 됨' : isDraft ? '이 브라우저에 저장됨' : '저장됨';
  const statusColor = saveError ? 'var(--danger)' : dirty || saving ? 'var(--ink-muted)' : 'var(--success)';
  const pickedColor = site.color;

  const jumpTo = (section: string) => {
    setCurrentPage(site.pages[0]?.id ?? '');
    window.setTimeout(() => {
      const h = document.getElementById(`prop-${section}`);
      h?.focus();
      h?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 0);
  };

  return (
    <div
      style={{
        color: 'var(--ink)',
        background: '#eeede8',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 상단 바 (로고 없는 작업 바라 AppHeader 대신 직접 배치) */}
      <header
        style={{
          background: 'var(--surface-raised)',
          borderBottom: '1px solid var(--line)',
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <Button
            aria-label={isDraft || !user ? '처음 화면으로' : '대시보드로'}
            square
            onClick={() => void leave(backTo)}
            icon={
              <svg {...iconProps}>
                <path d="M15 6l-6 6 6 6" />
              </svg>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, overflowWrap: 'anywhere' }}>
              {project.name}
              {isDraft && <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 500, color: 'var(--ink-muted)' }}>· 로그인 전 초안</span>}
            </span>
            <span role="status" style={{ fontSize: 12, color: statusColor, fontWeight: 500 }}>
              {statusText}
            </span>
          </div>
          <Button
            size="sm"
            variant={dirty ? 'night' : 'secondary'}
            onClick={() => void save()}
            disabled={saving || !dirty}
            aria-keyshortcuts="Control+S"
            title="저장 (Ctrl+S)"
          >
            저장
          </Button>
        </div>
        <Segmented label="기기 전환" value={device} onChange={setDevice} options={DEVICE_OPTIONS} />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Button
            variant="ghost"
            aria-label="되돌리기"
            title="되돌리기 (Ctrl+Z)"
            square
            disabled={!canUndo}
            onClick={undo}
            icon={
              <svg {...iconProps}>
                <path d="M9 14L4 9l5-5" />
                <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
              </svg>
            }
          />
          <Button
            variant="ghost"
            aria-label="다시하기"
            title="다시하기 (Ctrl+Shift+Z)"
            square
            disabled={!canRedo}
            onClick={redo}
            icon={
              <svg {...iconProps}>
                <path d="M15 14l5-5-5-5" />
                <path d="M20 9H9a5 5 0 0 0 0 10h3" />
              </svg>
            }
          />
          <Button onClick={() => void leave(ROUTES.preview(id))}>미리보기</Button>
          <Button variant="primary" onClick={() => void onPublish()}>
            배포
          </Button>
          <Button
            variant="ghost"
            aria-label={isDraft ? '프로젝트 설정 (로그인 후 쓸 수 있어요)' : '프로젝트 설정'}
            square
            disabled={isDraft}
            onClick={() => void leave(ROUTES.settings(id))}
            style={{ fontSize: 18 }}
          >
            ⋯
          </Button>
        </div>
      </header>

      {saveError && (
        <p role="alert" className="dm-alert dm-alert--error" style={{ margin: '10px 16px 0' }}>
          저장하지 못했어요. {saveError}
        </p>
      )}

      {/* AI 수정 요청 (지금은 규칙 기반) */}
      <form
        onSubmit={onAi}
        style={{
          background: 'var(--surface-raised)',
          borderBottom: '1px solid var(--line)',
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <TextField
          id="ai-ask"
          inline
          size="sm"
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--violet-700)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-700)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
              </svg>
              AI에게 부탁하기
            </span>
          }
          hint={`지금은 간단한 요청만 알아들어요. 예: ${AI_HINTS.map((h) => `"${h}"`).join(', ')}`}
          placeholder={`예: ${AI_HINTS[0]}`}
          value={aiAsk}
          maxLength={120}
          onChange={(e) => setAiAsk(e.target.value)}
          fieldStyle={{ flex: '1 1 440px', flexWrap: 'wrap' }}
          style={{ background: 'var(--surface)' }}
        />
        <Button type="submit" variant="violet" disabled={!aiAsk.trim()}>
          요청
        </Button>
        <p aria-live="polite" style={{ flexBasis: '100%', margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--violet-700)' }}>
          {aiReply}
        </p>
      </form>

      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', minHeight: 0 }}>
        {/* 왼쪽 패널 */}
        <aside
          aria-label="페이지와 테마"
          style={{
            flex: '1 1 240px',
            maxWidth: 280,
            background: 'var(--surface-raised)',
            borderRight: '1px solid var(--line)',
            padding: 14,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <Tabs label="왼쪽 패널" variant="pill" value={leftTab} onChange={setLeftTab} items={LEFT_TABS} idPrefix="left" fill />
          {LEFT_TABS.map((t) => (
            <div
              key={t.id}
              role="tabpanel"
              id={`left-${t.id}`}
              aria-labelledby={`left-tab-${t.id}`}
              hidden={t.id !== leftTab}
              style={t.id === leftTab ? { display: 'flex', flexDirection: 'column', gap: 14 } : undefined}
            >
              {t.id === 'pages' && (
                <>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14 }}>
                    {site.pages.map((p, i) => {
                      const on = p.id === pageId;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            aria-current={on ? 'page' : undefined}
                            onClick={() => setCurrentPage(p.id)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              minHeight: 40,
                              padding: '0 10px',
                              border: 0,
                              borderRadius: 8,
                              background: on ? '#fff1ec' : 'transparent',
                              font: 'inherit',
                              fontWeight: on ? 700 : undefined,
                              color: 'var(--ink)',
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            <span
                              style={{
                                width: on ? 10 : 8,
                                height: on ? 10 : 8,
                                borderRadius: 999,
                                flex: 'none',
                                boxSizing: 'border-box',
                                background: p.suggested ? 'transparent' : on ? 'var(--dawn-coral)' : 'var(--night-900)',
                                border: p.suggested ? '1.5px dashed var(--ink-muted)' : undefined,
                              }}
                            />
                            {p.name || '이름 없음'}
                            {i === 0 && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}>첫 화면</span>}
                            {p.suggested && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}>제안</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    disabled={site.pages.length >= MAX_PAGES}
                    onClick={() => {
                      const r = addPage(site, '새 페이지', pageId);
                      update(() => r.site);
                      setCurrentPage(r.id);
                    }}
                    style={{
                      height: 40,
                      border: '1px dashed #c9c7bf',
                      borderRadius: 8,
                      background: 'transparent',
                      font: 'inherit',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--ink-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    + 페이지
                  </button>
                  <Button size="sm" variant="ghost" style={{ alignSelf: 'flex-start' }} onClick={() => void leave(ROUTES.structure(id))}>
                    페이지 지도에서 보기 →
                  </Button>
                </>
              )}

              {t.id === 'blocks' && (
                <>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-muted)' }}>
                    블록을 끌어 놓거나 순서를 바꾸는 기능은 곧 열려요. 지금은 첫 화면의 각 부분을 오른쪽 패널에서 고칠 수 있어요.
                  </p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {HOME_SECTIONS.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => jumpTo(s.id)}
                          style={{
                            width: '100%',
                            minHeight: 40,
                            padding: '0 10px',
                            border: 0,
                            borderRadius: 8,
                            background: 'transparent',
                            font: 'inherit',
                            fontSize: 14,
                            color: 'var(--ink)',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {t.id === 'theme' && (
                <>
                  <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <legend style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>대표 색</legend>
                    <div role="radiogroup" aria-label="대표 색 고르기" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {COLOR_PRESETS.map((c) => {
                        const on = paletteFrom(c.hex).color === pickedColor;
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-label={c.label}
                            title={c.label}
                            onClick={() => update((s) => setBrandColor(s, c.hex))}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 999,
                              border: 0,
                              padding: 0,
                              background: c.hex,
                              cursor: 'pointer',
                              boxShadow: on ? '0 0 0 3px var(--surface-raised), 0 0 0 5px var(--night-900)' : undefined,
                            }}
                          />
                        );
                      })}
                    </div>
                  </fieldset>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                    <input
                      type="color"
                      value={pickedColor}
                      onChange={(e) => {
                        const hex = e.target.value;
                        update((s) => setBrandColor(s, hex), 'color');
                      }}
                      style={{ width: 44, height: 36, padding: 0, border: '1px solid var(--line)', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
                    />
                    직접 고르기
                    <code style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: 'var(--ink-muted)' }}>{pickedColor}</code>
                  </label>
                  <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
                    <span style={{ flex: 1, height: 28, borderRadius: 6, background: site.color }} />
                    <span style={{ flex: 1, height: 28, borderRadius: 6, background: site.dark }} />
                    <span style={{ flex: 1, height: 28, borderRadius: 6, background: site.tint, border: '1px solid var(--line)' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-muted)' }}>
                    버튼의 흰 글자가 잘 읽히도록 너무 밝은 색은 조금 진하게 맞춰요.
                  </p>
                </>
              )}
            </div>
          ))}
        </aside>

        {/* 가운데 캔버스 */}
        <main
          aria-label="캔버스"
          style={{
            flex: '999 1 480px',
            minWidth: 0,
            padding: 28,
            boxSizing: 'border-box',
            display: 'flex',
            justifyContent: 'center',
            overflow: 'auto',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: canvasMax,
              background: 'var(--surface-raised)',
              borderRadius: 8,
              boxShadow: '0 1px 2px rgba(20, 27, 58, 0.06), 0 8px 32px rgba(20, 27, 58, 0.08)',
              overflow: 'hidden',
              alignSelf: 'flex-start',
              transition: 'max-width 0.3s ease',
            }}
          >
            <SiteView
              site={site}
              pageId={pageId}
              onNavigate={setCurrentPage}
              onFakeAction={() => setCanvasToast('데모 동작이에요 · 실제로 신청되지는 않아요')}
              compact={device !== 'pc'}
              bottomPadding={56}
            />
            {canvasToast && <CanvasToast message={canvasToast} onDone={() => setCanvasToast(null)} />}
          </div>
        </main>

        {/* 오른쪽 속성 패널 */}
        <aside
          aria-label="속성"
          style={{
            flex: '1 1 260px',
            maxWidth: 320,
            background: 'var(--surface-raised)',
            borderLeft: '1px solid var(--line)',
            padding: 16,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <PropertiesPanel
            site={site}
            pageId={pageId}
            update={update}
            projectId={id}
            canUpload={!isDraft && !!user}
            onMessage={setToast}
            onPageDeleted={() => setCurrentPage(site.pages[0]?.id ?? '')}
          />
        </aside>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
      <DraftLoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

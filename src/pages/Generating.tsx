import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { Brand, Button, ProgressBar } from '../components';
import { PageError } from '../components/StatusViews.tsx';
import { useAuth } from '../auth/AuthProvider.tsx';
import { createProject } from '../lib/api.ts';
import { clearDraft, currentDraft, saveDraft } from '../lib/draft.ts';
import type { Draft } from '../lib/draft.ts';
import { generateSite } from '../lib/generator.ts';
import { toAppError } from '../lib/supabase.ts';
import type { SiteSpec } from '../lib/types.ts';
import './Generating.css';

type Twinkle = { left: string; top: string; size: number; delay?: string };
const TWINKLES: readonly Twinkle[] = [
  { left: '6%', top: '12%', size: 3 },
  { left: '44%', top: '6%', size: 2, delay: '1s' },
  { left: '94%', top: '16%', size: 3, delay: '2s' },
  { left: '70%', top: '92%', size: 2, delay: '.5s' },
  { left: '4%', top: '88%', size: 2, delay: '1.5s' },
];

const STEPS: readonly string[] = ['아이디어 읽기', '페이지 구성 정하기', '문구와 샘플 데이터 쓰기', '화면 그리기'];
const STEP_AT: readonly number[] = [2, 4, 6, 8];
const LAST = 9;
const TICK_MS = 680;

type Generated = { site: SiteSpec } | { error: string };

function generate(draft: Draft): Generated {
  try {
    return { site: generateSite(draft.input) };
  } catch (e) {
    return { error: toAppError(e).message };
  }
}

export default function Generating() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [draft] = useState(() => currentDraft());
  const [result, setResult] = useState<Generated | null>(() => (draft ? generate(draft) : null));
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const finishing = useRef(false);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 별이 하나씩 켜지는 연출 (~6초). 화면을 떠나면 정리
  useEffect(() => {
    if (!draft) return;
    timerRef.current = window.setInterval(() => setTick((t) => Math.min(LAST, t + 1)), TICK_MS);
    return stop;
  }, [draft, stop]);

  useEffect(() => {
    if (tick >= LAST) stop();
  }, [tick, stop]);

  const site = result && 'site' in result ? result.site : null;
  const done = tick >= LAST;

  /** 생성 결과 저장: 로그인했으면 계정에, 아니면 이 브라우저 초안에 */
  const finish = useCallback(async () => {
    if (!draft || !site || finishing.current) return;
    finishing.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      if (user) {
        const project = await createProject({ name: draft.name, idea: draft.idea, method: draft.method, site });
        clearDraft();
        navigate(ROUTES.structure(project.id), { replace: true });
      } else {
        saveDraft({ ...draft, site });
        navigate(ROUTES.structure('draft'), { replace: true });
      }
    } catch (e) {
      finishing.current = false;
      setSaving(false);
      setSaveError(toAppError(e).message);
    }
  }, [draft, site, user, navigate]);

  useEffect(() => {
    if (done && !authLoading && site && !saveError) void finish();
  }, [done, authLoading, site, saveError, finish]);

  const skip = () => {
    stop();
    setTick(LAST);
  };

  const retry = () => {
    setSaveError(null);
    if (draft && result && 'error' in result) {
      setResult(generate(draft));
      setTick(0);
      stop();
      timerRef.current = window.setInterval(() => setTick((t) => Math.min(LAST, t + 1)), TICK_MS);
    }
  };

  // 별자리: 생성된 페이지 위치 그대로 (최대 8개)
  const stars = useMemo(() => (site ? site.pages.slice(0, 8) : []), [site]);
  const lines = useMemo(() => {
    if (!site) return [];
    const at = new Map(stars.map((p) => [p.id, p]));
    return site.links.flatMap((l) => {
      const a = at.get(l.from);
      const b = at.get(l.to);
      return a && b ? [{ a, b, dashed: !!l.dashed, toIdx: stars.indexOf(b) }] : [];
    });
  }, [site, stars]);

  if (!draft) return <Navigate to={ROUTES.newProject} replace />;

  const genError = result && 'error' in result ? result.error : null;
  if (genError || saveError) {
    return (
      <div className="gen-page" style={{ background: 'var(--surface)', minHeight: '100vh' }}>
        <PageError
          message={saveError ? `만든 초안을 저장하지 못했어요. ${saveError}` : `초안을 만들지 못했어요. ${genError}`}
          onRetry={saveError ? () => void finish() : retry}
          action={
            <Link to={ROUTES.newProject} className="dm-btn dm-btn--ghost dm-btn--md">
              입력으로 돌아가기
            </Link>
          }
        />
      </div>
    );
  }

  // 별은 tick 에 맞춰 차례로 (8틱 동안 모두)
  const visibleStars = Math.min(stars.length, Math.ceil((tick / 8) * stars.length));
  const activeStep = STEP_AT.findIndex((at) => tick < at);
  const pct = Math.min(100, Math.round((tick / LAST) * 100));
  const stepNow = done
    ? saving
      ? '저장하는 중'
      : `페이지 ${site?.pages.length ?? 0}개를 만들었어요`
    : `${STEPS[activeStep < 0 ? STEPS.length - 1 : activeStep]} 중`;
  const quote = draft.idea.length > 90 ? `${draft.idea.slice(0, 90)}…` : draft.idea;

  return (
    <div
      className="gen-page"
      style={{
        color: 'var(--ink-on-night)',
        background: 'var(--night-900)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Brand night />
        <Link
          to={ROUTES.newProject}
          style={{
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            padding: '10px 0',
            color: 'var(--dawn-pink)',
          }}
        >
          취소하고 돌아가기
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1000,
          margin: '0 auto',
          padding: '16px 24px 56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'var(--dawn-pink)',
            }}
          >
            {done ? '별자리 완성' : 'AI가 초안을 그리는 중'}
          </p>
          <h1
            aria-live="polite"
            style={{
              margin: 0,
              fontSize: 36,
              lineHeight: 1.3,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            {done ? '당신의 꿈이 형태를 갖췄어요' : '당신의 생각을 이어 형태를 만들고 있어요'}
          </h1>
          <p style={{ margin: 0, maxWidth: '34em', fontSize: 15, lineHeight: 1.7, color: 'var(--ink-on-night)', overflowWrap: 'anywhere' }}>
            "{quote}"
          </p>
        </div>

        {/* 별자리가 그려지는 영역 */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 760, height: 340 }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
            {TWINKLES.map((tw) => (
              <span
                key={`${tw.left}-${tw.top}`}
                className="dm-twinkle"
                style={{
                  position: 'absolute',
                  left: tw.left,
                  top: tw.top,
                  width: tw.size,
                  height: tw.size,
                  borderRadius: 999,
                  background: 'var(--ink-on-night)',
                  animationDelay: tw.delay,
                }}
              />
            ))}
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            aria-hidden="true"
          >
            <g fill="none" stroke="#ffb3a7" strokeWidth="1.5" strokeLinecap="round">
              {lines.map(({ a, b, dashed, toIdx }, j) => (
                <line
                  key={j}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={dashed ? '3 5' : undefined}
                  style={{ opacity: toIdx < visibleStars ? 0.8 : 0, transition: 'opacity 0.6s ease' }}
                />
              ))}
            </g>
          </svg>
          {stars.map((s, i) => {
            const shown = i < visibleStars;
            const newest = !done && i === visibleStars - 1;
            const r = Math.max(5, Math.round(s.dot / 2));
            return (
              <div
                key={s.id}
                style={{
                  position: 'absolute',
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  opacity: shown ? 1 : 0,
                  transition: 'opacity 0.6s ease',
                }}
              >
                <span
                  className={newest || (done && i === 0) ? 'dm-pulse' : undefined}
                  style={{
                    width: r * 2,
                    height: r * 2,
                    borderRadius: 999,
                    background: s.suggested ? 'transparent' : 'var(--star-gold)',
                    border: s.suggested ? '2px dashed var(--dawn-pink)' : undefined,
                    boxSizing: 'border-box',
                    marginTop: 24,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{s.name}</span>
              </div>
            );
          })}
        </div>

        {/* 진행 상황 */}
        <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--dawn-pink)' }}>{stepNow}</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
            </div>
            <ProgressBar value={pct} label="생성 진행률" height={6} night className="gen-progress" />
          </div>
          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 10,
              textAlign: 'left',
            }}
          >
            {STEPS.map((label, k) => {
              const isDone = tick >= STEP_AT[k];
              const isActive = !isDone && k === activeStep;
              return (
                <li
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: isDone || isActive ? 'var(--ink-on-night)' : '#a9a3cf',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: isDone ? 'var(--star-gold)' : 'rgba(0,0,0,0)',
                      border: `1.5px ${isDone || isActive ? 'solid' : 'dashed'} ${
                        isDone ? 'var(--star-gold)' : isActive ? 'var(--dawn-coral)' : '#8d86b8'
                      }`,
                      flex: 'none',
                    }}
                  />
                  {label}
                </li>
              );
            })}
          </ol>
        </div>

        {done ? (
          <p role="status" style={{ margin: 0, fontSize: 14, color: 'var(--dawn-pink)' }}>
            {saving ? '구조 확인 화면으로 이동하고 있어요…' : '잠시만요…'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Button variant="violet" onClick={skip}>
              건너뛰기
            </Button>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--dawn-pink)' }}>
              {user ? '다 그리면 대시보드에 저장돼요.' : '다 그리면 이 브라우저에 초안으로 저장돼요. 로그인하면 계정으로 옮길 수 있어요.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

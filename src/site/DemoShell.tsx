/**
 * 방문자가 보는 데모 화면의 공통 틀. 예시 데모(/demo/:slug)와 배포된 데모(/p/:slug)가 함께 쓴다.
 *
 *   <DemoShell site={site} pageId={page} onNavigate={setPage}
 *     feedbackEnabled likes={12} liked={false} onToggleLike={...} onSubmitFeedback={async (fb) => ...} />
 *
 * - <SiteView> 위에 피드백 핀 놓기 → 의견 카드(이름·의견·"써보고 싶나요? 예/아니요") 를 겹쳐 그린다.
 * - 화면 아래 고정 바(좋아요, 피드백 남기기, "데모메이커로 제작됨")는 Portal 로 body 에 그린다.
 * - 핀 위치: xPct = 데모 폭 대비 %, yPx = 데모 맨 위에서의 px. pageKey = 지금 보고 있는 페이지 id.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { Button, LogoMark, Portal, TextArea, TextField, Toast, noteVars } from '../components';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { ScrollSmoother } from '../animation/gsap.ts';
import { toAppError } from '../lib/supabase.ts';
import type { SiteSpec } from '../lib/types.ts';
import { SiteView } from './SiteView.tsx';
import './DemoShell.css';

export interface FeedbackDraft {
  pageKey: string;
  xPct: number;
  yPx: number;
  author: string;
  body: string;
  wouldUse: boolean | null;
}

export interface DemoShellProps {
  site: SiteSpec;
  /** 지금 페이지 id (없으면 첫 페이지) */
  pageId?: string;
  onNavigate: (pageId: string) => void;
  feedbackEnabled: boolean;
  likes: number;
  liked: boolean;
  onToggleLike: () => void;
  /** 의견 보내기. 실패하면 throw (카드에 오류를 보여주고 입력은 그대로 둔다) */
  onSubmitFeedback: (fb: FeedbackDraft) => Promise<void>;
}

type Mode = 'idle' | 'placing' | 'writing';
type Answer = '' | '예' | '아니요';
const ANSWERS: Array<'예' | '아니요'> = ['예', '아니요'];

interface Pin {
  pageKey: string;
  x: number;
  y: number;
}

const SENT_MESSAGE = '피드백이 전달되었어요. 만든 사람의 꿈에 빛을 더했어요';

export function DemoShell({ site, pageId, onNavigate, feedbackEnabled, likes, liked, onToggleLike, onSubmitFeedback }: DemoShellProps) {
  const pageKey = pageId ?? site.pages[0]?.id ?? 'home';

  const [mode, setMode] = useState<Mode>('idle');
  const [pin, setPin] = useState<Pin | null>(null);
  const [stageW, setStageW] = useState(1440);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState<Answer>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  /** 이번 방문에서 내가 남긴 핀 (화면에 작게 남겨 둔다) */
  const [sent, setSent] = useState<Pin[]>([]);
  const [toast, setToast] = useState('');

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLFormElement>(null);
  /** 의견 카드의 top(px, 무대 기준). null 이면 아직 재지 않음 → 기본값(핀 아래) */
  const [cardTop, setCardTop] = useState<number | null>(null);
  useScrollMotion(rootRef, [pageKey]);

  const canSubmit = text.trim().length > 0 && !submitting;

  const reset = () => {
    setPin(null);
    setText('');
    setAnswer('');
    setError('');
  };
  const startFeedback = () => {
    reset();
    setMode('placing');
  };
  const cancel = () => {
    if (submitting) return;
    reset();
    setMode('idle');
  };

  // Esc 로 피드백 모드 끄기
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => {
    if (mode === 'idle') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode]);

  // 의견 카드가 열리면 의견 칸으로
  useEffect(() => {
    if (mode === 'writing') bodyRef.current?.focus({ preventScroll: true });
  }, [mode]);

  const place = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - r.left) / r.width) * 100));
    // 키보드로 눌렀을 때(clientX/Y = 0)는 화면 가운데 위쪽에 놓는다
    const keyboard = e.clientX === 0 && e.clientY === 0;
    const y = keyboard ? 160 : Math.max(16, e.clientY - r.top);
    setStageW(r.width);
    setPin({ pageKey, x: keyboard ? 50 : x, y });
    setMode('writing');
  };

  const submit = async () => {
    if (!pin || !canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmitFeedback({
        pageKey: pin.pageKey,
        xPct: pin.x,
        yPx: pin.y,
        author: author.trim(),
        body: text.trim(),
        wouldUse: answer === '' ? null : answer === '예',
      });
      setSent((s) => [...s, pin]);
      reset();
      setMode('idle');
      setToast(SENT_MESSAGE);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setSubmitting(false);
    }
  };

  const navigate = (id: string) => {
    if (submitting) return;
    reset();
    setMode('idle');
    onNavigate(id);
    const smoother = ScrollSmoother.get();
    if (smoother) smoother.scrollTo(0, false);
    else window.scrollTo(0, 0);
  };

  // 의견 카드 위치: 핀 아래에 열 자리가 없으면(하단 고정 바에 가려지면) 핀 위로 뒤집는다.
  // 위·아래 모두 좁으면 보이는 화면 안에서 하단 바 바로 위에 맞춘다. 버튼이 항상 보이도록.
  useLayoutEffect(() => {
    if (mode !== 'writing' || !pin) {
      setCardTop(null);
      return;
    }
    const place = () => {
      const stage = stageRef.current;
      const card = cardRef.current;
      if (!stage || !card) return;
      const GAP = 24;
      const MARGIN = 12;
      const h = card.offsetHeight;
      const barH = document.querySelector('.ds-bar')?.getBoundingClientRect().height ?? 0;
      const stageTop = stage.getBoundingClientRect().top; // 화면 기준 무대 위치
      const viewTop = MARGIN - stageTop; // 보이는 영역의 위쪽 끝 (무대 기준)
      const viewBottom = window.innerHeight - barH - MARGIN - stageTop; // 하단 바 바로 위 (무대 기준)
      let top: number;
      if (pin.y + GAP + h <= viewBottom) top = pin.y + GAP; // 아래
      else if (pin.y - GAP - h >= viewTop) top = pin.y - GAP - h; // 위
      else top = viewBottom - h; // 둘 다 좁으면 하단 바 위에 맞춤
      top = Math.max(top, viewTop, 8);
      setCardTop(top);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [mode, pin, error]);

  const cardX = pin ? Math.max(1, Math.min(pin.x + 2, 100 - (340 / (stageW || 1440)) * 100)) : 0;
  const cardY = cardTop ?? (pin ? pin.y + 24 : 0);
  const mine = sent.filter((p) => p.pageKey === pageKey);

  return (
    <div ref={rootRef} className="ds-root">
      <div ref={stageRef} className="ds-stage">
        <SiteView
          site={site}
          pageId={pageKey}
          onNavigate={navigate}
          onFakeAction={() => setToast('데모라서 실제로 진행되지는 않아요. 이런 흐름이라고 봐 주세요')}
          motion
        />

        {/* 이번 방문에 남긴 핀 */}
        {mine.map((p, i) => (
          <span
            key={`${p.x}-${p.y}-${i}`}
            className="dm-note dm-note--static"
            aria-hidden="true"
            style={{ ...noteVars(i + 1), left: `${p.x}%`, top: p.y }}
          >
            {i + 1}
          </span>
        ))}

        {/* 피드백 모드: 위치 고르기 */}
        {mode === 'placing' && (
          <>
            <button type="button" className="ds-place" aria-label="이 위치에 의견 남기기" onClick={place} />
            <div role="status" className="ds-place-hint">
              <span className="ds-place-hint__dot" />
              의견을 남길 위치를 클릭하세요
            </div>
          </>
        )}

        {/* 지금 놓은 핀 */}
        {pin && (
          <span
            className="dm-note dm-note--static dm-note--drop"
            aria-hidden="true"
            style={{ ...noteVars(mine.length + 1), left: `${pin.x}%`, top: pin.y }}
          >
            {mine.length + 1}
          </span>
        )}

        {/* 의견 카드 */}
        {mode === 'writing' && pin && (
          <form
            aria-label="의견 남기기"
            aria-busy={submitting}
            ref={cardRef}
            className="ds-card"
            style={{ left: `${cardX}%`, top: cardY, visibility: cardTop === null ? 'hidden' : undefined }}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <TextField
              id="fb-name"
              label="이름"
              optional
              type="text"
              maxLength={40}
              placeholder="비워두면 익명으로 남아요"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              disabled={submitting}
            />
            <TextArea
              ref={bodyRef}
              id="fb-text"
              label="의견"
              rows={3}
              maxLength={1000}
              placeholder="이 부분에 대해 느낀 점을 적어주세요"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
            />
            <fieldset disabled={submitting}>
              <legend>이 서비스를 써보고 싶나요?</legend>
              <div style={{ display: 'flex', gap: 6 }}>
                {ANSWERS.map((a) => {
                  const on = answer === a;
                  return (
                    <Button key={a} variant={on ? 'night' : 'secondary'} size="sm" pill aria-pressed={on} onClick={() => setAnswer(on ? '' : a)}>
                      {a}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
            {error && (
              <p className="dm-alert dm-alert--error" role="alert" style={{ margin: 0 }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onClick={cancel} disabled={submitting}>
                취소
              </Button>
              <Button type="submit" variant="primary" disabled={!canSubmit}>
                {submitting ? '보내는 중…' : '제출'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* 하단 고정 바 — 부드러운 스크롤 밖(body)에 그려야 화면에 고정된다 */}
      <Portal>
        <div className="ds-bar">
          <div className="ds-bar__inner">
            <Link to={ROUTES.main} className="ds-made">
              <LogoMark size={18} dark />
              데모메이커로 제작됨
            </Link>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Button
                variant="secondary"
                pill
                aria-pressed={liked}
                onClick={onToggleLike}
                style={liked ? { background: '#fff1ec' } : undefined}
                icon={
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill={liked ? 'var(--dawn-coral)' : 'none'}
                    stroke="var(--dawn-coral-ink)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
                  </svg>
                }
              >
                좋아요 {likes}
              </Button>
              {feedbackEnabled &&
                (mode === 'idle' ? (
                  <Button
                    variant="night"
                    pill
                    onClick={startFeedback}
                    icon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--star-gold)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z" />
                        <circle cx="12" cy="11" r="2" />
                      </svg>
                    }
                  >
                    피드백 남기기
                  </Button>
                ) : (
                  <Button variant="secondary" pill onClick={cancel} disabled={submitting}>
                    피드백 모드 끄기
                  </Button>
                ))}
            </div>
          </div>
        </div>
      </Portal>

      <Toast offset={84} message={toast} onDone={() => setToast('')} duration={4000} />
    </div>
  );
}

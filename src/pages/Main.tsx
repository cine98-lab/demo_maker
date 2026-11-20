import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, MouseEvent, PointerEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { Badge, Brand, Button, ButtonLink, Card } from '../components';
import { UserMenu } from '../components/UserMenu.tsx';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { Starfield } from '../animation/Starfield.tsx';
import './Main.css';

/* ───────── 히어로 별자리 격자 ───────── */

const COLS = 12;
const ROWS = 10;
const RADIUS = 150;

/** 별자리를 이루는 칸: "열,행" → 지름(px) */
const STARS: Partial<Record<string, number>> = {
  '1,7': 14,
  '3,4': 18,
  '5,5': 12,
  '7,2': 22,
  '10,4': 12,
  '8,7': 16,
};
const PATH: readonly string[] = ['1,7', '3,4', '5,5', '7,2', '10,4', '8,7', '5,5'];

/**
 * 불이 밝혀지면 떠오르는 예시 서비스 이름 (별자리 별 = 금색 라벨, 숨은 점 = 보라 라벨)
 * [이름, 분류, 이동할 화면] — 데모가 있는 곳은 공개 데모로, 아직 없는 아이디어는 새 프로젝트 만들기로
 */
/** 라벨이 별의 어느 쪽에 뜰지. 기본 위. 이웃 라벨과 겹치는 곳만 바꾼다. */
type Placement = 'above' | 'below' | 'left';
type NameEntry = readonly [name: string, sub: string, screen: string, placement?: Placement];
const NAMES: Partial<Record<string, NameEntry>> = {
  '7,2': ['반찬나눔', ' · 공동구매', 'PublicDemo'],
  // 동네 책방(3,4)과 코딩 스터디(5,5)는 두 칸 거리라 둘 다 위에 뜨면 겹친다 → 왼쪽 / 아래로 비켜 둔다
  '3,4': ['동네 책방', ' · 예약', 'DemoBookstore', 'left'],
  '1,7': ['도자기 공방', ' · 클래스', 'DemoPottery'],
  '5,5': ['코딩 스터디', ' · 모집', 'DemoStudy', 'below'],
  '10,4': ['함께 캠핑', ' · 동행', 'DemoCamping'],
  '8,7': ['골목 카페', ' · 주문', 'DemoCafe'],
  '10,1': ['산책 메이트', '', 'DemoWalk'],
  '1,2': ['독서 모임', '', ''],
  '5,8': ['플리마켓', '', ''],
  '3,9': ['주말 텃밭', '', ''],
  '10,9': ['재능 기부', '', ''],
};

/** 시안의 화면 이름 → 앱 경로 */
const SCREEN_ROUTES: Partial<Record<string, string>> = {
  PublicDemo: ROUTES.demo('banchan'),
  DemoBookstore: ROUTES.demo('bookstore'),
  DemoPottery: ROUTES.demo('pottery'),
  DemoStudy: ROUTES.demo('study'),
  DemoCamping: ROUTES.demo('camping'),
  DemoCafe: ROUTES.demo('cafe'),
  DemoWalk: ROUTES.demo('walk'),
};

function cellX(c: number): number {
  return ((c + 0.5) / COLS) * 100;
}
function cellY(r: number): number {
  return ((r + 0.5) / ROWS) * 100;
}
/** gsap.utils.mapRange와 같은 역할: 거리 → 0~1 영향도 */
function mapRange(inMin: number, inMax: number, outMin: number, outMax: number, v: number): number {
  let t = (v - inMin) / (inMax - inMin);
  t = Math.max(0, Math.min(1, t));
  return outMin + (outMax - outMin) * t;
}
function mix(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

const LINE_POINTS = PATH.map((k) => {
  const [c, r] = k.split(',').map(Number);
  return `${cellX(c).toFixed(2)},${cellY(r).toFixed(2)}`;
}).join(' ');

type Pointer = { active: boolean; x: number; y: number; w: number; h: number };

type Dot = {
  key: string;
  x: number;
  y: number;
  size: number;
  m: number;
  color: string;
  o: number;
  s: string;
  glow: string;
};

type Label = {
  key: string;
  x: number;
  y: number;
  text: string;
  sub: string;
  to: string;
  go: string;
  o: number;
  pe: 'auto' | 'none';
  transform: string;
  color: string;
  bg: string;
  border: string;
};

function buildGrid(p: Pointer): { dots: Dot[]; labels: Label[]; near: number } {
  const dots: Dot[] = [];
  const labels: Label[] = [];
  let near = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${c},${r}`;
      const star = STARS[key];
      const x = cellX(c);
      const y = cellY(r);
      let t = 0;
      if (p.active) {
        const dx = (x / 100) * p.w - p.x;
        const dy = (y / 100) * p.h - p.y;
        t = mapRange(RADIUS, 0, 0, 1, Math.sqrt(dx * dx + dy * dy));
        t = t * t * (3 - 2 * t);
      }
      if (star) {
        near = Math.max(near, t);
        dots.push({
          key,
          x,
          y,
          size: star,
          m: -star / 2,
          color: 'var(--star-gold)',
          o: 1,
          s: (1 + 0.6 * t).toFixed(3),
          glow: `0 0 ${Math.round(10 + 22 * t)}px rgba(255, 214, 107, ${(0.3 + 0.45 * t).toFixed(2)})`,
        });
      } else {
        dots.push({
          key,
          x,
          y,
          size: 4,
          m: -2,
          color: `rgb(${mix(244, 255, t)}, ${mix(242, 214, t)}, ${mix(255, 107, t)})`,
          o: Number((0.28 + 0.72 * t).toFixed(2)),
          s: (1 + 2.6 * t).toFixed(3),
          glow: 'none',
        });
      }
      const name = NAMES[key];
      if (name) {
        const lo = mapRange(0.35, 0.8, 0, 1, t);
        const half = (star ? star * (1 + 0.6 * t) : 4 * (1 + 2.6 * t)) / 2;
        // 별에서 떨어지는 거리: 커진 별 반지름 + 여백, 밝아질수록 조금 더 떠오른다
        const gap = Math.round(half + 6 + 6 * lo);
        const placement = name[3] ?? 'above';
        const transform =
          placement === 'below'
            ? `translate(-50%, 0) translateY(${gap}px)`
            : placement === 'left'
              ? `translate(-100%, -50%) translateX(${-gap - 2}px)`
              : `translate(-50%, -100%) translateY(${-gap}px)`;
        labels.push({
          key,
          x,
          y,
          text: name[0],
          sub: name[1],
          to: (name[2] && SCREEN_ROUTES[name[2]]) || ROUTES.newProject,
          go: name[2] ? ' 데모 보기 →' : ' 이 아이디어로 만들기 →',
          o: Number(lo.toFixed(2)),
          pe: lo > 0.5 ? 'auto' : 'none',
          transform,
          color: star ? 'var(--star-gold)' : 'var(--ink-on-night)',
          bg: star ? 'rgba(20, 27, 58, 0.88)' : 'rgba(59, 47, 107, 0.9)',
          border: star ? 'rgba(255, 214, 107, 0.55)' : 'rgba(244, 242, 255, 0.3)',
        });
      }
    }
  }
  return { dots, labels, near };
}

/* ───────── 아래 섹션 콘텐츠 ───────── */

type Step = { tag: string; title: string; desc: string; last?: boolean };
const STEPS: readonly Step[] = [
  { tag: '1단계 · 꿈', title: '설명하기', desc: '만들고 싶은 서비스를 글로 적거나, 몇 가지 질문에 답하거나, 템플릿을 골라요.' },
  { tag: '2단계 · 목표', title: '다듬기', desc: '제안된 페이지 구성을 확인하고, 블록 편집기로 문구와 이미지, 색을 고쳐요.' },
  { tag: '3단계 · 함께', title: '공유하기', desc: '버튼 한 번으로 배포하고, 링크를 보내 실제 서비스처럼 눌러보게 해요.' },
  { tag: '4단계 · 함께', title: '피드백 받기', desc: '방문자가 화면 위에 남긴 의견을 모아 보고, 바로 고쳐서 다시 나눠요.', last: true },
];

type Feature = { title: string; desc: string; icon: ReactNode };
const FEATURES: readonly Feature[] = [
  {
    title: 'AI가 초안을 그려요',
    desc: '설명 한 줄로 필요한 페이지, 메뉴, 문구, 샘플 데이터까지 담은 여러 페이지 초안이 만들어져요.',
    icon: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />,
  },
  {
    title: '블록으로 고쳐요',
    desc: '헤더, 카드 목록, 폼 같은 블록을 끌어다 놓고, 글자는 화면에서 바로 눌러 수정해요. 코드는 필요 없어요.',
    icon: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="18" height="8" rx="2" />
      </>
    ),
  },
  {
    title: '진짜처럼 눌러봐요',
    desc: '버튼은 다음 페이지로 이어지고, 로그인과 폼 제출도 흉내 내요. 그림이 아니라 체험하는 데모예요.',
    icon: (
      <>
        <path d="M5 3l14 7-6 2-2 6z" />
        <path d="M13 12l5 5" />
      </>
    ),
  },
  {
    title: '화면 위에서 의견을 받아요',
    desc: '링크를 받은 사람이 원하는 위치에 핀을 꽂아 댓글을 남겨요. 어디에 대한 의견인지 바로 보여요.',
    icon: (
      <>
        <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z" />
        <circle cx="12" cy="11" r="2" />
      </>
    ),
  },
];

const pin = (top: number, right: number): CSSProperties => ({
  position: 'absolute',
  top,
  right,
  width: 22,
  height: 22,
  borderRadius: 999,
  background: 'var(--star-gold)',
  color: 'var(--night-900)',
  fontSize: 12,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
const winDot = (bg: string): CSSProperties => ({ width: 8, height: 8, borderRadius: 999, background: bg });
const previewBox = (bg: string): CSSProperties => ({
  aspectRatio: '16 / 10',
  maxWidth: '100%',
  background: bg,
  padding: 20,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  position: 'relative',
});

type Example = { tag: string; title: string; meta: string; to: string; preview: ReactNode };
const EXAMPLES: readonly Example[] = [
  {
    tag: '쇼핑몰',
    title: '동네 반찬 공동구매',
    meta: '페이지 6개 · 회원가입부터 결제 완료까지',
    to: ROUTES.demo('banchan'),
    preview: (
      <div style={previewBox('var(--night-900)')}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={winDot('var(--violet-700)')} />
          <span style={winDot('var(--violet-700)')} />
          <span style={winDot('var(--violet-700)')} />
        </div>
        <div style={{ width: '55%', height: 14, borderRadius: 4, background: 'var(--ink-on-night)' }} />
        <div style={{ width: '35%', height: 10, borderRadius: 4, background: 'var(--violet-700)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 'auto' }}>
          <span style={{ height: 52, borderRadius: 6, background: 'var(--violet-700)' }} />
          <span style={{ height: 52, borderRadius: 6, background: 'var(--violet-700)' }} />
          <span style={{ height: 52, borderRadius: 6, background: 'var(--violet-700)' }} />
        </div>
        <span style={pin(44, 32)}>2</span>
      </div>
    ),
  },
  {
    tag: '예약',
    title: '반려견 산책 매칭',
    meta: '페이지 7개 · 산책러 찾기부터 후기까지',
    to: ROUTES.demo('walk'),
    preview: (
      <div style={previewBox('#fff3ef')}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={winDot('var(--dawn-pink)')} />
          <span style={winDot('var(--dawn-pink)')} />
          <span style={winDot('var(--dawn-pink)')} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <span style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--dawn-pink)', flex: 'none' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            <span style={{ width: '70%', height: 12, borderRadius: 4, background: 'var(--ink)' }} />
            <span style={{ width: '45%', height: 10, borderRadius: 4, background: 'var(--dawn-pink)' }} />
          </div>
        </div>
        <span
          style={{
            marginTop: 'auto',
            alignSelf: 'flex-start',
            width: '40%',
            height: 32,
            borderRadius: 8,
            background: 'var(--dawn-coral)',
          }}
        />
        <span style={pin(96, 40)}>5</span>
      </div>
    ),
  },
  {
    tag: '커뮤니티',
    title: '동네 스터디 모임',
    meta: '페이지 5개 · 모임 찾기부터 참여 신청까지',
    to: ROUTES.demo('study'),
    preview: (
      <div style={previewBox('var(--violet-700)')}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={winDot('var(--night-900)')} />
          <span style={winDot('var(--night-900)')} />
          <span style={winDot('var(--night-900)')} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <span style={{ height: 26, borderRadius: 6, background: 'var(--night-900)' }} />
          <span style={{ height: 26, borderRadius: 6, background: 'var(--night-900)' }} />
          <span style={{ height: 26, borderRadius: 6, background: 'var(--night-900)' }} />
        </div>
        <span style={{ marginTop: 'auto', width: '30%', height: 10, borderRadius: 4, background: 'var(--dawn-pink)' }} />
        <span style={pin(72, 28)}>3</span>
      </div>
    ),
  },
];

/* ───────── 공통 스타일 ───────── */

const container: CSSProperties = { maxWidth: 1200, margin: '0 auto' };
const sectionInner: CSSProperties = {
  ...container,
  padding: '96px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 48,
};
const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'var(--dawn-coral-ink)',
};
const h2Style: CSSProperties = {
  margin: 0,
  fontSize: 36,
  lineHeight: 1.25,
  fontWeight: 800,
  letterSpacing: '-0.02em',
};
const headingGroup: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 };
const bodyMuted: CSSProperties = { margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-muted)' };
const navLink: CSSProperties = {
  color: 'var(--ink-on-night)',
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 500,
  padding: '12px 14px',
};
const footerLink: CSSProperties = { color: 'var(--ink-muted)', textDecoration: 'none', padding: '8px 0' };
const stepDot: CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: 999,
  background: 'var(--star-gold)',
  boxShadow: '0 0 0 4px #fff3cf',
  flex: 'none',
};

const preventNav = (e: MouseEvent<HTMLAnchorElement>) => e.preventDefault();
export default function Main() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const onIdeaSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = idea.trim();
    navigate(text ? `${ROUTES.newProject}?idea=${encodeURIComponent(text)}` : ROUTES.newProject);
  };
  const [pointer, setPointer] = useState<Pointer>({ active: false, x: 0, y: 0, w: 1, h: 1 });
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollMotion(rootRef);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<Pointer | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { dots, labels, near } = useMemo(() => buildGrid(pointer), [pointer]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    pendingRef.current = { active: true, x: e.clientX - b.left, y: e.clientY - b.top, w: b.width, h: b.height };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingRef.current) setPointer(pendingRef.current);
      });
    }
  };

  const onLeave = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPointer((p) => ({ ...p, active: false }));
  };

  return (
    <div ref={rootRef} className="main-page" style={{ color: 'var(--ink)', background: 'var(--surface)', minHeight: '100vh' }}>
      {/* 상단 메뉴 */}
      <header data-intro="0" style={{ position: 'relative', zIndex: 2, background: 'var(--night-900)' }}>
        <nav
          aria-label="주 메뉴"
          style={{
            ...container,
            padding: '20px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Brand to={ROUTES.main} night size={28} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Link to={ROUTES.gallery} style={navLink}>
              템플릿 갤러리
            </Link>
            {user ? (
              <>
                <Link to={ROUTES.dashboard} style={navLink}>
                  대시보드
                </Link>
                <UserMenu night />
              </>
            ) : (
              <>
                <Link to={ROUTES.login} style={navLink}>
                  로그인
                </Link>
                <ButtonLink to={ROUTES.newProject} variant="primary">
                  시작하기
                </ButtonLink>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ① 히어로 */}
      {/* 패럴랙스: 뒤 별 무리(느림) → 별자리 격자(조금 느림) → 문구(조금 빠름) 세 겹이 다른 속도로 흐른다 */}
      <section
        aria-labelledby="hero-title"
        style={{ position: 'relative', overflow: 'hidden', background: 'var(--night-900)', color: 'var(--ink-on-night)' }}
      >
        <Starfield seed={7} />
        <div
          style={{
            ...container,
            position: 'relative',
            padding: '72px 24px 96px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 48,
          }}
        >
          <div data-speed="1.12" style={{ flex: '1 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p data-intro="1" style={{ ...eyebrow, color: 'var(--dawn-pink)' }}>
              아이디어가 데모가 되는 곳
            </p>
            <h1
              data-intro="2"
              id="hero-title"
              style={{
                margin: 0,
                fontSize: 56,
                lineHeight: 1.12,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                textWrap: 'balance',
              }}
            >
              당신의 꿈은
              <br />
              어떤 모양인가요?
            </h1>
            <p data-intro="3" style={{ margin: 0, fontSize: 18, lineHeight: 1.7 }}>
              만들고 싶은 서비스를 한 문장으로 적어 주세요.
              <br />
              직접 눌러볼 수 있는 데모 사이트로 바로 보여드릴게요.
            </p>
            <form
              data-intro="4"
              onSubmit={onIdeaSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: 'var(--violet-700)',
                padding: 20,
                borderRadius: 20,
                maxWidth: 600,
              }}
            >
              <label htmlFor="idea" style={{ fontSize: 14, fontWeight: 700, color: 'var(--star-gold)' }}>
                만들고 싶은 서비스
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <input
                  id="idea"
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  maxLength={500}
                  placeholder="예: 1인 가구를 위한 동네 반찬 공동구매 서비스"
                  style={{
                    flex: '1 1 280px',
                    minWidth: 0,
                    height: 48,
                    padding: '0 16px',
                    borderRadius: 12,
                    border: '1px solid #5a4d92',
                    background: 'var(--night-900)',
                    color: 'var(--ink-on-night)',
                    fontSize: 16,
                  }}
                />
                <Button type="submit" variant="primary" size="lg">
                  데모 만들기
                </Button>
              </div>
            </form>
            <div data-intro="5" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, fontSize: 15 }}>
              <Link
                to={ROUTES.gallery}
                style={{ color: 'var(--star-gold)', fontWeight: 700, textDecoration: 'none', padding: '12px 0' }}
              >
                템플릿으로 시작 →
              </Link>
              <span>가입 없이 바로 시작할 수 있어요</span>
            </div>
          </div>

          <div data-speed="0.85" style={{ flex: '1 1 360px', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
            <div
              data-intro="3"
              aria-hidden="true"
              onPointerMove={onMove}
              onPointerLeave={onLeave}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 480,
                aspectRatio: '6 / 5',
                touchAction: 'pan-y',
                cursor: 'crosshair',
              }}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              >
                <polyline
                  points={LINE_POINTS}
                  fill="none"
                  stroke="#ffb3a7"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ opacity: Number((0.65 + 0.35 * near).toFixed(2)), transition: 'opacity 0.45s ease' }}
                />
              </svg>
              {dots.map((d) => (
                <span
                  key={d.key}
                  className="dm-dot"
                  style={{
                    position: 'absolute',
                    left: `${d.x}%`,
                    top: `${d.y}%`,
                    width: d.size,
                    height: d.size,
                    margin: `${d.m}px 0 0 ${d.m}px`,
                    borderRadius: 999,
                    background: d.color,
                    opacity: d.o,
                    boxShadow: d.glow,
                    transform: `scale(${d.s})`,
                    pointerEvents: 'none',
                  }}
                />
              ))}
              {labels.map((l) => (
                <Link
                  key={l.key}
                  className="dm-label"
                  to={l.to}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    left: `${l.x}%`,
                    top: `${l.y}%`,
                    transform: l.transform,
                    opacity: l.o,
                    whiteSpace: 'nowrap',
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    lineHeight: 1.4,
                    fontWeight: 700,
                    textDecoration: 'none',
                    color: l.color,
                    background: l.bg,
                    border: `1px solid ${l.border}`,
                    pointerEvents: l.pe,
                    cursor: 'pointer',
                  }}
                >
                  {l.text}
                  <span style={{ fontWeight: 500, opacity: 0.75 }}>{l.sub}</span>
                  <span className="dm-go">{l.go}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ② 이용 단계 */}
      <section aria-labelledby="steps-title" style={{ background: 'var(--surface)' }}>
        <div style={sectionInner}>
          <div data-reveal style={headingGroup}>
            <p style={eyebrow}>이렇게 만들어요</p>
            <h2 id="steps-title" style={h2Style}>
              점 하나에서 별자리까지
            </h2>
          </div>
          <ol
            data-reveal-stagger
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '32px 24px',
            }}
          >
            {STEPS.map((s) => (
              <li key={s.title} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {s.last ? (
                    <span style={{ ...stepDot, boxShadow: '0 0 0 4px #fff3cf, 0 0 24px rgba(255, 214, 107, 0.45)' }} />
                  ) : (
                    <>
                      <span style={stepDot} />
                      <span style={{ flex: 1, height: 1, background: 'var(--dawn-coral)' }} />
                    </>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink-muted)' }}>{s.tag}</p>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{s.title}</h3>
                <p style={bodyMuted}>{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ③ 핵심 기능 */}
      <section
        aria-labelledby="features-title"
        style={{
          background: 'var(--surface-raised)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={sectionInner}>
          <div data-reveal style={headingGroup}>
            <p style={eyebrow}>할 수 있는 일</p>
            <h2 id="features-title" style={h2Style}>
              생각을 보여주는 데 필요한 네 가지
            </h2>
          </div>
          <div data-reveal-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {FEATURES.map((f) => (
              <Card as="article" key={f.title} style={{ padding: 28, background: 'var(--surface)' }}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b8461f"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {f.icon}
                </svg>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{f.title}</h3>
                <p style={bodyMuted}>{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ④ 예시 데모 갤러리 */}
      <section aria-labelledby="gallery-title" style={{ background: 'var(--surface)' }}>
        <div style={sectionInner}>
          <div
            data-reveal
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={headingGroup}>
              <p style={eyebrow}>예시 데모</p>
              <h2 id="gallery-title" style={h2Style}>
                먼저 그려진 별자리들
              </h2>
            </div>
            <Link to={ROUTES.gallery} style={{ fontSize: 15, fontWeight: 700, textDecoration: 'none', padding: '12px 0' }}>
              템플릿 전체 보기 →
            </Link>
          </div>
          <div data-reveal-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {EXAMPLES.map((ex) => (
              <Card
                as="article"
                key={ex.title}
                flush
                style={{ boxShadow: '0 1px 2px rgba(20, 27, 58, 0.06), 0 4px 16px rgba(20, 27, 58, 0.04)' }}
              >
                {ex.preview}
                <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Badge tone="coral">{ex.tag}</Badge>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{ex.title}</h3>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>{ex.meta}</p>
                  <Link to={ex.to} style={{ fontSize: 15, fontWeight: 700, textDecoration: 'none', padding: '8px 0 0' }}>
                    체험하기 →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ 하단 행동 유도 */}
      <section
        aria-labelledby="cta-title"
        style={{ position: 'relative', overflow: 'hidden', background: 'var(--night-900)', color: 'var(--ink-on-night)' }}
      >
        <Starfield seed={23} gold={2} />
        <div data-reveal="scale" style={{ ...sectionInner, position: 'relative', alignItems: 'center', textAlign: 'center', gap: 24 }}>
          <svg data-speed="1.25" width="120" height="40" viewBox="0 0 120 40" aria-hidden="true">
            <polyline
              points="8,28 44,10 80,24 112,8"
              fill="none"
              stroke="#ffb3a7"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="8" cy="28" r="4" fill="#ffd66b" />
            <circle cx="44" cy="10" r="5" fill="#ffd66b" />
            <circle cx="80" cy="24" r="3.5" fill="#ffd66b" />
            <circle cx="112" cy="8" r="4" fill="none" stroke="#ff7a59" strokeWidth="2" />
          </svg>
          <h2 id="cta-title" style={{ ...h2Style, fontSize: 40, textWrap: 'balance' }}>
            첫 번째 별을 찍어볼까요?
          </h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7 }}>
            혼자 품은 생각도 눈앞에 보이면 함께 이야기할 수 있어요.
            <br />
            지금 바로 같이 만들어 봐요.
          </p>
          <ButtonLink to={ROUTES.newProject} variant="primary" size="lg">
            시작하기
          </ButtonLink>
        </div>
      </section>

      {/* 공통 하단 */}
      <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)' }}>
        <div
          style={{
            ...container,
            padding: '40px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800 }}>데모메이커</span>
          <nav aria-label="하단 메뉴" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontSize: 14 }}>
            <a href="#" onClick={preventNav} style={footerLink}>
              서비스 소개
            </a>
            <a href="#" onClick={preventNav} style={footerLink}>
              이용약관
            </a>
            <a href="#" onClick={preventNav} style={footerLink}>
              개인정보처리방침
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { Badge, Brand, Button, ButtonLink, Card, Dialog, Segmented, Tabs, TextField } from '../components';
import { TEMPLATES } from '../data/templates.ts';
import { UserMenu } from '../components/UserMenu.tsx';
import { useAuth } from '../auth/AuthProvider.tsx';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import type { Template, TemplateCategory } from '../data/templates.ts';

type Category = '전체' | TemplateCategory;
const CATS: readonly Category[] = ['전체', '쇼핑몰', '예약', '커뮤니티', 'SaaS'];
const CAT_TABS = CATS.map((c) => ({
  id: c,
  label: c,
  count: TEMPLATES.filter((t) => c === '전체' || t.type === c).length,
}));

type DeviceId = 'pc' | 'tablet' | 'mobile';
const DEVICES = [
  { value: 'pc', label: 'PC', w: '100%' },
  { value: 'tablet', label: '태블릿', w: '640px' },
  { value: 'mobile', label: '모바일', w: '375px' },
] as const satisfies ReadonlyArray<{ value: DeviceId; label: string; w: string }>;

const navLink: CSSProperties = {
  color: 'var(--ink-on-night)',
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 500,
  padding: '12px 14px',
};
/** 카드 아래 두 버튼이 한 줄을 나눠 갖도록 */
const grow: CSSProperties = { flex: '1 1 auto' };

/** 템플릿으로 새 프로젝트 시작 (NewProject 가 ?template= 을 읽는다) */
function templateStart(id: string): string {
  return `${ROUTES.newProject}?template=${encodeURIComponent(id)}`;
}

function linePoints(t: Template): string {
  return t.stars.map((s) => `${s[0]},${s[1]}`).join(' ');
}

export default function Gallery() {
  const { user } = useAuth();
  const [cat, setCat] = useState<Category>('전체');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceId>('pc');

  const items = useMemo(() => {
    const query = q.trim();
    return TEMPLATES.filter((t) => {
      const okCat = cat === '전체' || t.type === cat;
      const okQ = !query || (t.name + t.type + t.desc).indexOf(query) !== -1;
      return okCat && okQ;
    });
  }, [cat, q]);

  // 제목·검색은 처음 한 번만, 카드 목록은 거르기가 바뀔 때마다 다시 떠오르게 범위를 나눈다
  const introRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useScrollMotion(introRef);
  useScrollMotion(gridRef, [cat, q]);

  const sel = TEMPLATES.find((t) => t.id === openId) ?? TEMPLATES[0];
  const dev = DEVICES.find((d) => d.value === device) ?? DEVICES[0];

  return (
    <div style={{ color: 'var(--ink)', background: 'var(--surface)', minHeight: '100vh' }}>
      {/* 상단 메뉴 */}
      <header style={{ background: 'var(--night-900)' }}>
        <nav
          aria-label="주 메뉴"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
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
            <Link
              to={ROUTES.gallery}
              aria-current="page"
              style={{ ...navLink, color: 'var(--star-gold)', fontWeight: 700 }}
            >
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

      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '56px 24px 96px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        <div ref={introRef} style={{ display: 'contents' }}>
        <div data-intro="0" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'var(--dawn-coral-ink)',
            }}
          >
            템플릿 갤러리
          </p>
          <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.02em' }}>
            닮은 별자리에서 시작해 보세요
          </h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.7, color: 'var(--ink-muted)' }}>
            서비스 유형별 템플릿을 미리 눌러보고, 마음에 들면 이름만 바꿔 바로 시작할 수 있어요.
          </p>
        </div>

        <div data-intro="1" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <TextField
              id="tpl-search"
              label="템플릿 검색"
              hideLabel
              type="search"
              placeholder="예: 예약, 쇼핑몰, 모임"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 44 }}
            />
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5d6378"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
              style={{ position: 'absolute', left: 16, top: 14, pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </div>
          <Tabs label="서비스 유형" variant="chip" items={CAT_TABS} value={cat} onChange={setCat} />
        </div>
        </div>

        <div ref={gridRef} style={{ display: 'contents' }}>
        <div data-reveal-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {items.map((t) => (
            <Card
              as="article"
              key={t.id}
              flush
              style={{ boxShadow: '0 1px 2px rgba(20, 27, 58, 0.06), 0 4px 16px rgba(20, 27, 58, 0.04)' }}
            >
              <div style={{ position: 'relative', aspectRatio: '16 / 10', maxWidth: '100%', background: t.bg }}>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                  aria-hidden="true"
                >
                  <polyline
                    points={linePoints(t)}
                    fill="none"
                    stroke="#ffb3a7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {t.stars.map(([x, y, r]) => (
                  <span
                    key={`${x},${y}`}
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${x}%`,
                      top: `${y}%`,
                      width: r * 2,
                      height: r * 2,
                      margin: `${-r}px 0 0 ${-r}px`,
                      borderRadius: 999,
                      background: 'var(--star-gold)',
                    }}
                  />
                ))}
              </div>
              <div style={{ flex: 1, padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge tone="coral">{t.type}</Badge>
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>페이지 {t.pages}개</span>
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t.name}</h2>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-muted)' }}>{t.desc}</p>
                <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Button
                    style={grow}
                    onClick={() => {
                      setOpenId(t.id);
                      setDevice('pc');
                    }}
                  >
                    미리 체험
                  </Button>
                  <ButtonLink to={templateStart(t.id)} variant="primary" style={grow}>
                    이 템플릿으로 시작
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ))}
        </div>
        </div>

        {items.length === 0 && (
          <div
            style={{
              padding: '48px 24px',
              border: '1px dashed #c9c7bf',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              textAlign: 'center',
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 999, border: '2px dashed var(--dawn-coral)' }} />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>"{q}"에 맞는 템플릿이 아직 없어요</p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>
              원하는 서비스를 직접 설명하면 AI가 새로 그려드려요.
            </p>
            <Link
              to={ROUTES.main}
              style={{ marginTop: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none', padding: '8px 0' }}
            >
              아이디어로 시작하기 →
            </Link>
          </div>
        )}
      </main>

      {/* 템플릿 미리 체험 모달 */}
      <Dialog
        open={openId !== null}
        onClose={() => setOpenId(null)}
        size="lg"
        title={sel.name}
        header={{
          lead: <Badge tone="coral">{sel.type}</Badge>,
          actions: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Segmented label="기기 전환" options={DEVICES} value={device} onChange={setDevice} />
              <Button variant="ghost" aria-label="닫기" onClick={() => setOpenId(null)} square>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </Button>
            </div>
          ),
        }}
      >

        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            background: '#eeede8',
            padding: 24,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: dev.w,
              maxWidth: '100%',
              background: 'var(--surface-raised)',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(20, 27, 58, 0.06), 0 8px 32px rgba(20, 27, 58, 0.08)',
            }}
          >
            <div
              style={{
                padding: '12px 20px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                borderBottom: '1px solid #f0efea',
              }}
            >
              <b style={{ fontSize: 15 }}>{sel.brand}</b>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {sel.pageList.map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-muted)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: '#f5f4f0',
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div
              style={{
                padding: '36px 24px',
                background: sel.bg,
                color: 'var(--ink-on-night)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.3 }}>{sel.hero}</span>
              <span
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 6,
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: 'var(--dawn-coral)',
                  color: 'var(--night-900)',
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {sel.cta}
              </span>
            </div>
            <div
              style={{
                padding: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
              }}
            >
              {sel.cards.map((card) => (
                <div
                  key={card}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: 12,
                    border: '1px solid #f0efea',
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{
                      aspectRatio: '4 / 3',
                      maxWidth: '100%',
                      borderRadius: 6,
                      background: '#f5ece4',
                      display: 'block',
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{card}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>
            페이지 {sel.pages}개 · 버튼과 링크를 눌러 페이지를 오가 보세요
          </p>
          <ButtonLink to={templateStart(sel.id)} variant="primary" size="lg">
            이 템플릿으로 시작
          </ButtonLink>
        </div>
      </Dialog>
    </div>
  );
}

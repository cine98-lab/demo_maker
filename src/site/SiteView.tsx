/**
 * 사용자가 만든 데모 사이트를 그리는 컴포넌트. 공개 데모(/demo, /p), 미리보기, 에디터 캔버스가 함께 쓴다.
 *
 *   <SiteView site={site} pageId={page} onNavigate={setPage} />
 *
 * - 첫 페이지(pages[0], 보통 'home')는 대표 화면(사진 + 제목 + CTA + 안내 + 목록)으로 그린다.
 * - CTA 를 누르면 site.ctaAction 이 navigate 면 ctaTarget 페이지로, fake 면 onFakeAction 을 부른다.
 * - 다른 페이지는 이름과 핵심 내용 목록으로 그린다 (구조 확인 화면에서 정한 내용).
 * - 사이트 색은 CSS 변수(--demo-color, --demo-dark)로 내려준다.
 */
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { ProgressBar } from '../components';
import type { SiteSpec } from '../lib/types.ts';
import './SiteView.css';

/** SiteView 가 실제로 쓰는 필드 (기본 예시 데모 데이터도 이 모양을 만족한다) */
export type SiteViewData = Pick<
  SiteSpec,
  'brand' | 'color' | 'dark' | 'tint' | 'nav' | 'image' | 'tagline' | 'meta' | 'title' | 'price' | 'progress' | 'pct' | 'cta' | 'infoH' | 'infoP' | 'listH' | 'items'
> &
  Partial<Pick<SiteSpec, 'pages' | 'links' | 'ctaAction' | 'ctaTarget'>>;

export interface SiteViewProps {
  site: SiteViewData;
  /** 지금 보여줄 페이지 id. 없으면 첫 페이지 */
  pageId?: string;
  /** 사이트 안에서 페이지를 옮길 때. 없으면 링크가 동작하지 않는다 */
  onNavigate?: (pageId: string) => void;
  /** ctaAction 이 fake 일 때 (예: "데모 동작이에요" 알림) */
  onFakeAction?: () => void;
  /** 좁은 틀(미리보기 기기 프레임, 에디터 캔버스)에 맞춰 여백과 글자를 줄인다 */
  compact?: boolean;
  /** 스크롤 등장 애니메이션 표시(data-reveal 등)를 붙일지. 공개 데모에서만 true */
  motion?: boolean;
  /** 대표 화면 사진 칸 대신 그릴 것 (에디터의 사진 바꾸기 버튼 등) */
  heroSlot?: ReactNode;
  /** 메인 영역 아래 여백 (하단 고정 바가 있을 때) */
  bottomPadding?: number;
}

function stop(e: MouseEvent) {
  e.preventDefault();
}

export function SiteView({ site, pageId, onNavigate, onFakeAction, compact, motion, heroSlot, bottomPadding }: SiteViewProps) {
  const pages = site.pages ?? [];
  const home = pages[0]?.id ?? 'home';
  const current = pageId ?? home;
  const page = pages.find((p) => p.id === current);
  const isHome = !page || current === home;

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    if (onNavigate && pages.some((p) => p.id === id)) onNavigate(id);
  };
  const navTargets = [pages[1]?.id, pages.find((p) => p.id === 'mypage')?.id ?? pages[2]?.id, pages.find((p) => p.id === 'login')?.id];

  const onCta = (e: MouseEvent) => {
    e.preventDefault();
    if (site.ctaAction === 'fake') onFakeAction?.();
    else if (site.ctaTarget && onNavigate) onNavigate(site.ctaTarget);
    else onFakeAction?.();
  };

  const style = {
    '--demo-color': site.color,
    '--demo-dark': site.dark,
    '--demo-tint': site.tint,
  } as CSSProperties;

  const r = (v: string | undefined) => (motion ? v ?? '' : undefined);

  return (
    <div className={`sv-root${compact ? ' sv-compact' : ''}`} style={style}>
      <header className="sv-header">
        <div className="sv-wrap sv-header__inner">
          <a href="#" className="sv-brand" onClick={onNavigate ? go(home) : stop}>
            {site.brand}
          </a>
          <nav aria-label={`${site.brand} 메뉴`} className="sv-nav">
            {[site.nav[0], site.nav[1], '로그인'].map((label, i) => (
              <a key={label + i} href="#" onClick={navTargets[i] && onNavigate ? go(navTargets[i] as string) : stop}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="sv-wrap sv-main" style={bottomPadding !== undefined ? { paddingBottom: bottomPadding } : undefined}>
        {isHome ? (
          <>
            <div className="sv-hero">
              {heroSlot ??
                (site.image ? (
                  <div className="sv-photo">
                    <img data-parallax={r('8')} src={site.image.src} alt={site.image.alt} style={{ objectPosition: site.image.position }} />
                  </div>
                ) : (
                  <div className="sv-photo sv-photo--empty" role="img" aria-label="대표 사진 자리">
                    <span className="sv-tagline">{site.tagline}</span>
                    <span className="sv-photo__hint">대표 사진</span>
                  </div>
                ))}
              <div className="sv-summary" data-reveal={r('right')}>
                <span className="sv-muted">{site.meta}</span>
                <h1 className="sv-title">{site.title}</h1>
                <span className="sv-price">{site.price}</span>
                <span className="sv-muted">{site.progress}</span>
                <ProgressBar value={site.pct} color={site.color} decorative />
                <a href="#" className="sv-cta" onClick={onCta}>
                  {site.cta}
                </a>
              </div>
            </div>
            <section className="sv-info" data-reveal={r(undefined)}>
              <h2>{site.infoH}</h2>
              <p>{site.infoP}</p>
            </section>
            <section className="sv-list">
              <h2>{site.listH}</h2>
              <div className="sv-grid" data-reveal-stagger={r(undefined)}>
                {site.items.map((it, i) => (
                  <div key={it.name + i} className="sv-item">
                    <span className="sv-thumb" />
                    <span className="sv-item__name">{it.name}</span>
                    <span className="sv-muted">{it.sub}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="sv-page" aria-labelledby="sv-page-title">
            <a href="#" className="sv-back" onClick={go(home)}>
              ← {pages[0]?.name ?? '홈'}
            </a>
            <h1 id="sv-page-title" className="sv-title">
              {page.name}
            </h1>
            {page.contents.length > 0 ? (
              <ul className="sv-contents">
                {page.contents.map((c, i) => (
                  <li key={c + i}>{c}</li>
                ))}
              </ul>
            ) : (
              <p className="sv-muted">이 페이지에 들어갈 내용을 구조 확인 화면에서 정할 수 있어요.</p>
            )}
            <div className="sv-page__actions">
              {(site.links ?? [])
                .filter((l) => l.from === page.id)
                .map((l) => {
                  const to = pages.find((p) => p.id === l.to);
                  return to ? (
                    <a key={l.to} href="#" className="sv-cta sv-cta--inline" onClick={go(to.id)}>
                      {to.name}로 이동
                    </a>
                  ) : null;
                })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ScrollSmoother, ScrollTrigger, prefersReducedMotion, useGSAP } from './gsap.ts';

/**
 * ScrollSmoother 로 사이트 전체 스크롤을 부드럽게 만든다.
 *
 * 주의 (ScrollSmoother 규칙)
 * - 화면에 고정돼야 하는 것(모달, 토스트, 하단 고정 바)은 이 안에 두면 같이 움직인다.
 *   → components/Portal.tsx 로 document.body 에 그린다.
 * - position: sticky 는 이 안에서 동작하지 않는다. 고정이 필요하면 Portal + position: fixed.
 * - 동작 줄이기 설정이 켜져 있으면 만들지 않고 기본 스크롤을 쓴다.
 */
/**
 * React 는 자식 화면의 effect 를 부모(SmoothScroll)보다 먼저 실행한다.
 * 그래서 화면이 패럴랙스를 등록하려는 순간엔 아직 smoother 가 없을 수 있다 → 준비되면 불러준다.
 */
let waiting: Array<(s: ScrollSmoother) => void> = [];
export function whenSmootherReady(cb: (s: ScrollSmoother) => void): () => void {
  const s = ScrollSmoother.get();
  if (s) {
    cb(s);
    return () => {};
  }
  waiting.push(cb);
  return () => {
    waiting = waiting.filter((f) => f !== cb);
  };
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.1, // 스크롤을 따라잡는 데 걸리는 시간(초)
      smoothTouch: 0.1, // 터치 기기는 아주 살짝만 (손가락과 어긋나면 어지럽다)
      effects: false, // data-speed / data-lag 는 화면마다 useScrollMotion 이 등록한다
    });
    const queued = waiting;
    waiting = [];
    queued.forEach((cb) => cb(smoother));
    // 이미지가 늦게 로드되면 페이지 높이가 바뀌므로 다시 잰다
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => {
      window.removeEventListener('load', onLoad);
      smoother.kill();
    };
  });

  // 화면 이동 시 맨 위로 (부드럽게 말고 즉시)
  useLayoutEffect(() => {
    const smoother = ScrollSmoother.get();
    if (smoother) smoother.scrollTo(0, false);
    else window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">{children}</div>
    </div>
  );
}

/** 모달이 열려 있는 동안 배경 스크롤을 멈춘다. */
export function pauseSmoothScroll(paused: boolean) {
  ScrollSmoother.get()?.paused(paused);
}

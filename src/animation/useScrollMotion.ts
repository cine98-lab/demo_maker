import type { DependencyList, RefObject } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion, useGSAP } from './gsap.ts';
import { whenSmootherReady } from './SmoothScroll.tsx';

/**
 * 화면 안의 data-* 표시를 읽어 스크롤 애니메이션을 붙인다. 화면 컴포넌트 맨 위에서 한 번 호출.
 *
 *   const root = useRef<HTMLDivElement>(null);
 *   useScrollMotion(root);
 *   return <div ref={root}> ... </div>
 *
 * ── 패럴랙스 (ScrollSmoother effects) ─────────────────────────────
 *   data-speed="0.8"    스크롤보다 느리게 → 멀리 있는 것처럼 (배경, 별 무리)
 *   data-speed="1.15"   스크롤보다 빠르게 → 가까이 있는 것처럼 (앞쪽 장식)
 *   data-speed="auto"   overflow:hidden 부모 안의 큰 이미지가 부모 안에서 천천히 흐른다
 *   data-lag="0.3"      스크롤을 0.3초 늦게 따라온다 (떠 있는 카드, 배지)
 *
 * ── 스크롤 등장 (ScrollTrigger) ───────────────────────────────────
 *   data-reveal              화면에 들어올 때 아래에서 떠오르며 나타남
 *   data-reveal="left|right|scale|fade"   방향/방식 바꾸기
 *   data-reveal-stagger      직계 자식들이 차례로 떠오름 (카드 목록)
 *
 * ── 스크롤 연동 (scrub) ───────────────────────────────────────────
 *   data-parallax="12"       스크롤하는 동안 자기 높이의 ±12% 만큼 위아래로 흐름 (사진 안쪽 등)
 *   data-drift="-40"         지나가는 동안 y 를 -40px 만큼 움직임 (제목, 큰 글자)
 *
 * ── 처음 화면 등장 ────────────────────────────────────────────────
 *   data-intro               화면이 열릴 때 차례로 나타남 (히어로 문구 등). data-intro="2" 처럼 순서 지정
 *
 * 동작 줄이기 설정이 켜져 있으면 아무것도 하지 않는다 (요소는 처음부터 제자리에 보인다).
 */
export function useScrollMotion(scope: RefObject<HTMLElement>, deps: DependencyList = []) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root || prefersReducedMotion()) return;
      const q = <T extends HTMLElement = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

      // 1) 패럴랙스: ScrollSmoother effects 로 등록 (smoother 가 아직 없으면 준비되는 순간에)
      const speedEls = q('[data-speed], [data-lag]');
      let speedTriggers: ScrollTrigger[] = [];
      const cancelWait = speedEls.length
        ? whenSmootherReady((smoother) => {
            speedTriggers = smoother.effects(speedEls) as ScrollTrigger[];
          })
        : () => {};

      // 2) 처음 화면 등장
      const intro = q('[data-intro]').sort((a, b) => Number(a.dataset.intro || 0) - Number(b.dataset.intro || 0));
      if (intro.length) {
        gsap.from(intro, { y: 28, autoAlpha: 0, duration: 1, stagger: 0.1, delay: 0.1 });
      }

      // 3) 스크롤 등장
      const fromFor = (kind: string | undefined): gsap.TweenVars => {
        switch (kind) {
          case 'left':
            return { x: -48, autoAlpha: 0 };
          case 'right':
            return { x: 48, autoAlpha: 0 };
          case 'scale':
            return { scale: 0.92, autoAlpha: 0 };
          case 'fade':
            return { autoAlpha: 0 };
          default:
            return { y: 48, autoAlpha: 0 };
        }
      };
      q('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          ...fromFor(el.dataset.reveal),
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
      q('[data-reveal-stagger]').forEach((group) => {
        const items = Array.from(group.children) as HTMLElement[];
        if (!items.length) return;
        gsap.from(items, {
          y: 56,
          autoAlpha: 0,
          stagger: 0.09,
          scrollTrigger: { trigger: group, start: 'top 85%', once: true },
        });
      });

      // 4) 스크롤 연동
      q('[data-parallax]').forEach((el) => {
        const amt = Number(el.dataset.parallax) || 10;
        gsap.fromTo(
          el,
          { yPercent: -amt, scale: 1 + amt / 50 },
          {
            yPercent: amt,
            scale: 1 + amt / 50,
            ease: 'none',
            scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      });
      q('[data-drift]').forEach((el) => {
        gsap.to(el, {
          y: Number(el.dataset.drift) || -40,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      ScrollTrigger.refresh();

      // smoother.effects 로 만든 트리거는 이 context 밖에서 생겨날 수 있어 직접 정리한다
      return () => {
        cancelWait();
        if (speedTriggers.length) {
          speedTriggers.forEach((st) => st.kill());
          gsap.set(speedEls, { clearProps: 'transform' });
        }
      };
    },
    { scope, dependencies: [...deps], revertOnUpdate: true },
  );
}

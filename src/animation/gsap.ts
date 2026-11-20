/**
 * GSAP 한 곳에서 등록. 다른 파일은 여기서만 가져다 쓴다.
 *   import { gsap, ScrollTrigger, useGSAP } from '../animation/gsap.ts';
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, useGSAP);

/** 전체 모션 기본값: 별이 떠오르듯 부드럽게 멈춘다 */
gsap.defaults({ ease: 'power3.out', duration: 0.9 });

/** OS 의 '동작 줄이기' 설정. 켜져 있으면 부드러운 스크롤과 패럴랙스를 모두 끈다. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { gsap, ScrollTrigger, ScrollSmoother, useGSAP };

import type { CSSProperties } from 'react';

/**
 * 피드백 핀을 "보드에 붙인 포스트잇"처럼 그리는 공용 스타일.
 * 실제 모양은 ui.css 의 .dm-note 에 있고, 여기서는 번호마다 색과 기울기를 정해 준다.
 *   <span className="dm-note" style={{ ...noteVars(3), left, top }}>3</span>
 * 변형 클래스: dm-note--active(선택됨) · dm-note--resolved(해결됨) · dm-note--sm(목록용) · dm-note--drop(붙는 순간)
 */

/** 종이 색: 별빛 노랑 · 새벽 분홍 · 민트 · 라일락 */
const PAPERS = ['#ffe27a', '#ffc4b5', '#bfe8d2', '#d9d2ff'] as const;
/** 기울기(도). 번호마다 다르게 해서 손으로 붙인 느낌을 낸다 */
const TILTS = [-6, 4, -2, 7, -4, 2, 5, -7] as const;

export function noteVars(n: number): CSSProperties {
  const i = Math.abs(Math.trunc(n)) || 0;
  return {
    '--note-bg': PAPERS[i % PAPERS.length],
    '--note-rot': `${TILTS[i % TILTS.length]}deg`,
  } as CSSProperties;
}

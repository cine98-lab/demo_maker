/**
 * SiteSpec 을 고치는 순수 함수들 (구조 확인 화면과 에디터가 함께 쓴다).
 * 항상 새 객체를 돌려준다.
 */
import { paletteFrom } from '../color.ts';
import type { SitePage, SiteSpec } from '../types.ts';

/** 별자리 지도에서 새 별을 놓을 후보 자리 [x, y] (%) */
const CANDIDATES: ReadonlyArray<[number, number]> = (() => {
  const out: Array<[number, number]> = [];
  for (let y = 16; y <= 84; y += 12) for (let x = 10; x <= 90; x += 10) out.push([x, y]);
  return out;
})();

/** 기존 별들과 가장 멀리 떨어진 자리 */
export function freeSlot(pages: readonly SitePage[]): [number, number] {
  let best: [number, number] = [50, 50];
  let bestD = -1;
  for (const [x, y] of CANDIDATES) {
    // 지도는 가로가 더 넓으니 세로 거리를 조금 더 무겁게
    const d = pages.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, (p.y - y) * 1.4)), Infinity);
    if (d > bestD) {
      bestD = d;
      best = [x, y];
    }
  }
  return best;
}

export function newPageId(pages: readonly SitePage[]): string {
  let id = '';
  do id = `page-${Math.random().toString(36).slice(2, 7)}`;
  while (pages.some((p) => p.id === id));
  return id;
}

/** 새 페이지를 추가하고 from 페이지(없으면 첫 페이지)에서 선으로 잇는다 */
export function addPage(site: SiteSpec, name = '새 페이지', from?: string): { site: SiteSpec; id: string } {
  const [x, y] = freeSlot(site.pages);
  const id = newPageId(site.pages);
  const page: SitePage = { id, name, x, y, dot: 12, contents: [] };
  const source = from && site.pages.some((p) => p.id === from) ? from : site.pages[0]?.id;
  return {
    id,
    site: {
      ...site,
      pages: [...site.pages, page],
      links: source ? [...site.links, { from: source, to: id }] : site.links,
    },
  };
}

/** 페이지 삭제 (첫 페이지는 지울 수 없다). 그 페이지로 오가는 선과 CTA 연결도 정리 */
export function deletePage(site: SiteSpec, id: string): SiteSpec {
  if (site.pages[0]?.id === id) return site;
  const pages = site.pages.filter((p) => p.id !== id);
  const links = site.links.filter((l) => l.from !== id && l.to !== id);
  let ctaTarget = site.ctaTarget;
  if (ctaTarget === id) ctaTarget = (pages.find((p) => p.id === 'action') ?? pages[1] ?? pages[0])?.id ?? '';
  return { ...site, pages, links, ctaTarget };
}

/** 제안된 페이지 받아들이기: 점선 → 실선 */
export function acceptSuggested(site: SiteSpec, id: string): SiteSpec {
  return {
    ...site,
    pages: site.pages.map((p) => {
      if (p.id !== id) return p;
      const { suggested: _s, ...rest } = p;
      return rest;
    }),
    links: site.links.map((l) => (l.to === id || l.from === id ? { from: l.from, to: l.to } : l)),
  };
}

export function updatePage(site: SiteSpec, id: string, patch: Partial<Omit<SitePage, 'id'>>): SiteSpec {
  return { ...site, pages: site.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function setBrandColor(site: SiteSpec, hex: string): SiteSpec {
  return { ...site, ...paletteFrom(hex) };
}

/** 사이트 색 고르기 프리셋 */
export const COLOR_PRESETS: ReadonlyArray<{ label: string; hex: string }> = [
  { label: '코랄', hex: '#ff7a59' },
  { label: '숲', hex: '#2f7d5b' },
  { label: '바다', hex: '#2f5bea' },
  { label: '보라', hex: '#6b4fd8' },
  { label: '먹', hex: '#1e2233' },
  { label: '햇살', hex: '#f2b705' },
];

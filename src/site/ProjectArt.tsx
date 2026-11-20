import type { SitePage, SiteLink } from '../lib/types.ts';

/**
 * 프로젝트 카드 그림: 사이트의 페이지(별)와 이동(선)을 작은 별자리로.
 * 페이지 x/y(%) 를 320×180 그림 안으로 옮긴다.
 */
export function ProjectArt({ pages, links }: { pages: SitePage[]; links: SiteLink[] }) {
  const W = 320;
  const H = 180;
  const pad = 28;
  const pos = new Map(
    pages.map((p) => [
      p.id,
      {
        x: pad + (Math.max(0, Math.min(100, p.x)) / 100) * (W - pad * 2),
        y: pad + (Math.max(0, Math.min(100, p.y)) / 100) * (H - pad * 2),
        r: Math.max(3, Math.min(9, (p.dot || 14) / 3)),
        hollow: Boolean(p.suggested),
      },
    ]),
  );
  const lines = (links.length ? links : pages.slice(1).map((p, i) => ({ from: pages[i].id, to: p.id, dashed: false })))
    .map((l) => ({ a: pos.get(l.from), b: pos.get(l.to), dashed: l.dashed }))
    .filter((l): l is { a: NonNullable<typeof l.a>; b: NonNullable<typeof l.b>; dashed: boolean | undefined } => Boolean(l.a && l.b));
  const brightest = [...pos.values()].sort((a, b) => b.r - a.r)[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.a.x}
          y1={l.a.y}
          x2={l.b.x}
          y2={l.b.y}
          stroke="var(--dawn-pink)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={l.dashed ? '4 5' : undefined}
          opacity={0.85}
        />
      ))}
      {brightest && <circle cx={brightest.x} cy={brightest.y} r={brightest.r * 2.4} fill="var(--star-gold)" opacity={0.16} />}
      {[...pos.values()].map((s, i) =>
        s.hollow ? (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="none" stroke="var(--star-gold)" strokeWidth="1.5" />
        ) : (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--star-gold)" />
        ),
      )}
    </svg>
  );
}

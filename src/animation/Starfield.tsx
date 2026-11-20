import { useMemo } from 'react';

/**
 * 밤하늘 섹션 뒤에 까는 별 무리. 깊이가 다른 세 겹이 서로 다른 속도로 흘러
 * 스크롤할 때 공간감(패럴랙스)이 생긴다. 장식이라 스크린리더에는 숨긴다.
 *
 * 부모는 position: relative + overflow: hidden 이어야 한다.
 */
type Layer = { count: number; size: [number, number]; speed: number; opacity: number };

const LAYERS: Layer[] = [
  { count: 38, size: [1, 1.6], speed: 0.55, opacity: 0.35 }, // 가장 먼 별: 거의 안 움직임
  { count: 22, size: [1.6, 2.4], speed: 0.8, opacity: 0.55 },
  { count: 9, size: [2.4, 3.6], speed: 1.15, opacity: 0.85 }, // 가까운 별: 스크롤보다 빠름
];

/** 새로고침해도 같은 배치가 나오는 간단한 의사 난수 */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function Starfield({ seed = 7, gold = 3 }: { seed?: number; gold?: number }) {
  const layers = useMemo(() => {
    const rnd = seeded(seed);
    return LAYERS.map((l, li) =>
      Array.from({ length: l.count }, (_, i) => ({
        key: `${li}-${i}`,
        left: rnd() * 100,
        // 위아래로 넉넉히 깔아서 빠르게 움직이는 겹에도 빈틈이 없게
        top: -20 + rnd() * 140,
        size: l.size[0] + rnd() * (l.size[1] - l.size[0]),
        gold: li === 2 && i < gold,
      })),
    );
  }, [seed, gold]);

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {layers.map((stars, li) => (
        <div key={li} data-speed={LAYERS[li].speed} style={{ position: 'absolute', inset: 0 }}>
          {stars.map((s) => (
            <span
              key={s.key}
              style={{
                position: 'absolute',
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                borderRadius: 999,
                background: s.gold ? 'var(--star-gold)' : 'var(--ink-on-night)',
                opacity: s.gold ? 1 : LAYERS[li].opacity,
                boxShadow: s.gold ? '0 0 10px rgba(255, 214, 107, 0.7)' : undefined,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 대표 색에서 진한 색(hover), 연한 배경색을 만들고, 흰 글자가 읽히도록 대비를 맞춘다. */

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** 두 색의 명도 대비 (WCAG) */
export function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function isHexColor(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

/**
 * 대표 색 하나로 데모 사이트 팔레트를 만든다.
 *  color: 흰 글자를 올려도 4.5:1 이상이 되도록 필요하면 어둡게 조정
 *  dark : hover 용 더 진한 색
 *  tint : 사진 자리·썸네일용 아주 연한 색
 */
export function paletteFrom(hex: string): { color: string; dark: string; tint: string } {
  let rgb = hexToRgb(isHexColor(hex) ? hex : '#2f7d5b');
  let guard = 0;
  while (contrast(rgbToHex(rgb), '#ffffff') < 4.5 && guard < 20) {
    rgb = mix(rgb, [0, 0, 0], 0.08);
    guard++;
  }
  const color = rgbToHex(rgb);
  const dark = rgbToHex(mix(rgb, [0, 0, 0], 0.25));
  const tint = rgbToHex(mix(rgb, [255, 255, 255], 0.88));
  return { color, dark, tint };
}

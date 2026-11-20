/**
 * 프로젝트 내보내기: JSON(사이트 내용 그대로) / HTML(대표 화면 한 장, CSS 포함).
 * HTML 쪽은 react-dom/server 와 SiteView.css 를 필요할 때만 불러온다 (첫 화면 번들을 키우지 않게).
 */
import { createElement } from 'react';
import type { SiteSpec } from '../types.ts';

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'demo';
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSiteJson(name: string, site: SiteSpec) {
  const blob = new Blob([JSON.stringify({ name, exportedAt: new Date().toISOString(), site }, null, 2)], { type: 'application/json' });
  download(blob, `${safeFileName(name)}.json`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** 디자인 토큰 중 데모 화면이 쓰는 것만 지금 화면에서 읽어 온다 */
const TOKENS = ['--ink', '--ink-muted', '--font-sans', '--line', '--radius-pill', '--dawn-coral'];

export async function exportSiteHtml(name: string, site: SiteSpec) {
  const [{ renderToStaticMarkup }, { SiteView }, css] = await Promise.all([
    import('react-dom/server'),
    import('../../site/SiteView.tsx'),
    import('../../site/SiteView.css?raw').then((m) => m.default as string),
  ]);
  // 사진 주소는 내려받은 파일에서도 보이도록 절대 주소로
  const absSite: SiteSpec = site.image ? { ...site, image: { ...site.image, src: new URL(site.image.src, window.location.href).href } } : site;
  const markup = renderToStaticMarkup(createElement(SiteView, { site: absSite }));
  const root = getComputedStyle(document.documentElement);
  const vars = TOKENS.map((t) => {
    const v = root.getPropertyValue(t).trim();
    return v ? `${t}: ${v};` : '';
  }).join(' ');
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(site.brand)}</title>
<style>
:root { ${vars} }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-sans, system-ui, sans-serif); }
img { max-width: 100%; }
.dm-progress { display: block; height: 8px; border-radius: 999px; background: #f0efea; overflow: hidden; }
.dm-progress__bar { display: block; height: 100%; border-radius: inherit; background: var(--dm-progress-color, #ff7a59); }
${css}
</style>
</head>
<body>
<!-- 데모메이커에서 내보낸 '${escapeHtml(name)}' 의 대표 화면 -->
${markup}
</body>
</html>
`;
  download(new Blob([html], { type: 'text/html;charset=utf-8' }), `${safeFileName(name)}.html`);
}

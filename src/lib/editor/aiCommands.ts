/**
 * "AI에게 부탁하기" 입력을 읽는 규칙 기반 해석기.
 * 아직 AI 서버가 없어서, 자주 쓰는 몇 가지 요청만 알아듣는다. 모르는 요청은 솔직하게 직접 고쳐 달라고 한다.
 */
import { paletteFrom } from '../color.ts';
import type { SiteSpec } from '../types.ts';

export const AI_COLOR_WORDS: ReadonlyArray<[RegExp, string]> = [
  [/빨강|빨간|레드/, '#d93636'],
  [/파랑|파란|블루/, '#2f5bea'],
  [/초록|녹색|그린/, '#2f9e5b'],
  [/보라|퍼플/, '#6b4fd8'],
  [/주황|오렌지/, '#e8730c'],
  [/검정|검은|블랙|먹/, '#1e2233'],
  [/코랄/, '#ff7a59'],
  [/숲/, '#2f7d5b'],
  [/바다/, '#1f6fa8'],
  [/분홍|핑크/, '#d6457a'],
  [/노랑|노란|햇살/, '#f2b705'],
];

/** 화면에 보여줄 "이렇게 말해 보세요" */
export const AI_HINTS: readonly string[] = [
  '색을 파랑으로 바꿔줘',
  '버튼 글자를 "지금 신청하기"로 바꿔줘',
  '제목을 "우리 동네 반찬 모임"으로 바꿔줘',
  '진행률 80%로 해줘',
  '사진 지워줘',
];

export interface AiResult {
  site: SiteSpec | null;
  message: string;
}

function quoted(text: string): string | null {
  const m = text.match(/["“”'‘’「『]([^"“”'‘’」』]{1,60})["“”'‘’」』]/);
  return m ? m[1].trim() : null;
}

export function runAiCommand(raw: string, site: SiteSpec): AiResult {
  const text = raw.trim();
  if (!text) return { site: null, message: '부탁할 내용을 적어 주세요.' };
  const q = quoted(text);

  if (/색/.test(text)) {
    const hit = AI_COLOR_WORDS.find(([re]) => re.test(text));
    if (hit) return { site: { ...site, ...paletteFrom(hit[1]) }, message: '대표 색을 바꿨어요.' };
    const hex = text.match(/#[0-9a-f]{6}\b/i);
    if (hex) return { site: { ...site, ...paletteFrom(hex[0]) }, message: '대표 색을 바꿨어요.' };
  }
  if (/버튼/.test(text) && q) return { site: { ...site, cta: q }, message: `버튼 글자를 "${q}"(으)로 바꿨어요.` };
  if (/제목/.test(text) && q) return { site: { ...site, title: q }, message: `제목을 "${q}"(으)로 바꿨어요.` };
  if (/(서비스\s*)?이름|브랜드/.test(text) && q) return { site: { ...site, brand: q }, message: `서비스 이름을 "${q}"(으)로 바꿨어요.` };
  if (/가격/.test(text) && q) return { site: { ...site, price: q }, message: `가격을 "${q}"(으)로 바꿨어요.` };
  if (/진행|퍼센트|%/.test(text)) {
    const n = text.match(/(\d{1,3})\s*(%|퍼센트)/);
    if (n) {
      const pct = Math.max(0, Math.min(100, Number(n[1])));
      return { site: { ...site, pct }, message: `진행 막대를 ${pct}%로 맞췄어요.` };
    }
  }
  if (/사진/.test(text) && /지워|빼|없애|삭제/.test(text)) {
    if (!site.image) return { site: null, message: '지울 사진이 없어요.' };
    const { image: _img, ...rest } = site;
    return { site: rest, message: '대표 사진을 뺐어요.' };
  }
  return { site: null, message: '아직 이 요청은 직접 수정해 주세요. 오른쪽 패널에서 바로 고칠 수 있어요.' };
}

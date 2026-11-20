/**
 * 아이디어 → 데모 사이트(SiteSpec) 생성기.
 *
 * 지금은 규칙 기반이다: 아이디어 글의 낱말로 가장 가까운 예시 데모를 고르고,
 * 서비스 유형·기능·분위기·색으로 페이지 구성과 문구를 맞춘다.
 * 나중에 실제 AI 로 바꿀 때는 generateSite 의 안쪽만 Supabase Edge Function 호출로 교체하면 된다
 * (입력 GenerateInput, 출력 SiteSpec 은 그대로).
 */
import { DEMOS } from '../data/demos.ts';
import type { DemoData } from '../data/demos.ts';
import { TEMPLATES } from '../data/templates.ts';
import type { DemoSlug } from '../routes.ts';
import { paletteFrom } from './color.ts';
import type { GenerateInput, SiteLink, SitePage, SiteSpec } from './types.ts';

/** 아이디어 낱말 → 예시 데모 */
const KEYWORDS: ReadonlyArray<[DemoSlug, RegExp]> = [
  ['banchan', /반찬|공동구매|도시락|식재료|밀키트|소분/],
  ['walk', /산책|반려|강아지|애견|펫|고양이/],
  ['study', /스터디|공부|코딩|강의|학습|모임|독서/],
  ['bookstore', /책|서점|북토크|도서/],
  ['pottery', /공방|도자기|클래스|원데이|만들기|핸드메이드|소품/],
  ['camping', /캠핑|여행|동행|등산|아웃도어|차박/],
  ['cafe', /카페|커피|음료|베이커리|디저트|빵/],
];

/** 템플릿 id → 가장 가까운 예시 데모 */
const TEMPLATE_BASE: Record<string, DemoSlug | undefined> = {
  banchan: 'banchan',
  craft: 'pottery',
  walk: 'walk',
  salon: undefined,
  study: 'study',
  parent: undefined,
  team: undefined,
  money: undefined,
};

/** 서비스 유형별 기본 흐름: [id, 이름, 핵심 내용] */
type PageSeed = readonly [id: string, name: string, contents: readonly string[]];
const FLOWS: Record<string, readonly PageSeed[]> = {
  쇼핑몰: [
    ['home', '홈', ['대표 문구와 추천 상품', '카테고리 바로가기']],
    ['list', '상품 목록', ['상품 사진, 이름, 가격', '정렬과 검색']],
    ['detail', '상품 상세', ['상품 사진과 설명', '가격과 남은 수량', '[구매] 버튼']],
    ['action', '주문하기', ['수량 선택', '받는 방법 선택']],
    ['done', '주문 완료', ['주문 번호와 안내']],
    ['mypage', '마이페이지', ['주문 내역', '찜한 상품']],
  ],
  예약: [
    ['home', '홈', ['대표 문구와 인기 일정']],
    ['list', '둘러보기', ['일정 목록과 남은 자리']],
    ['detail', '상세', ['사진과 소개', '가격과 시간', '[예약] 버튼']],
    ['action', '예약하기', ['날짜·인원 선택', '연락처 입력']],
    ['done', '예약 완료', ['예약 번호와 찾아오는 길']],
    ['mypage', '내 예약', ['예약 내역과 취소']],
  ],
  커뮤니티: [
    ['home', '홈', ['대표 문구와 새 모임']],
    ['list', '모임 목록', ['모임 카드와 모집 현황']],
    ['detail', '모임 상세', ['소개와 일정', '모집 현황', '[참여 신청] 버튼']],
    ['action', '참여 신청', ['자기소개 한 줄', '연락 방법']],
    ['done', '신청 완료', ['다음 안내']],
    ['mypage', '내 모임', ['참여 중인 모임']],
  ],
  SaaS: [
    ['home', '홈', ['한 줄 소개와 화면 미리보기']],
    ['list', '기능 소개', ['핵심 기능 3가지']],
    ['detail', '요금제', ['무료/유료 비교', '[시작하기] 버튼']],
    ['action', '가입하기', ['이메일과 비밀번호']],
    ['done', '대시보드', ['첫 사용 안내', '샘플 데이터']],
  ],
  '정보 소개': [
    ['home', '홈', ['대표 문구와 소개']],
    ['list', '소개', ['우리가 하는 일']],
    ['detail', '상세 안내', ['자세한 설명', '[문의하기] 버튼']],
    ['action', '문의하기', ['이름, 연락처, 문의 내용']],
    ['done', '문의 완료', ['답변 안내']],
  ],
};

/** 예시 데모별 서비스 유형 */
const BASE_KIND: Record<DemoSlug, string> = {
  banchan: '쇼핑몰',
  bookstore: '예약',
  pottery: '예약',
  study: '커뮤니티',
  camping: '커뮤니티',
  cafe: '쇼핑몰',
  walk: '예약',
};

/** 예시 데모별 페이지 이름 (기본 흐름 이름을 덮어씀) */
const BASE_PAGE_NAMES: Partial<Record<DemoSlug, Record<string, string>>> = {
  banchan: { list: '상품 목록', detail: '상품 상세', action: '공동구매 참여', done: '결제 완료' },
  bookstore: { list: '책 둘러보기', detail: '모임 상세', action: '좌석 예약', done: '예약 완료' },
  pottery: { list: '클래스 목록', detail: '클래스 상세', action: '클래스 신청', done: '신청 완료' },
  study: { list: '스터디 찾기', detail: '스터디 상세', action: '참여 신청', done: '신청 완료', mypage: '내 스터디' },
  camping: { list: '동행 찾기', detail: '동행 상세', action: '동행 신청', done: '신청 완료' },
  cafe: { list: '메뉴', detail: '메뉴 상세', action: '미리 주문', done: '주문 완료' },
  walk: { list: '산책러 찾기', detail: '산책러 상세', action: '산책 예약', done: '예약 완료' },
};

/** 별자리 지도 위 자리 (페이지 순서대로) */
const SLOTS: ReadonlyArray<[number, number, number]> = [
  [12, 50, 20],
  [32, 26, 14],
  [52, 42, 16],
  [72, 22, 16],
  [88, 44, 12],
  [28, 78, 12],
  [62, 76, 14],
  [80, 74, 12],
];

const MOOD_TAGLINE: Record<string, string> = {
  '따뜻하고 친근하게': '이웃처럼 편하게, 함께',
  '신뢰감 있게': '믿고 맡길 수 있는 곳',
  활기차게: '오늘도 신나게 시작해요',
  차분하게: '천천히, 나에게 맞게',
  고급스럽게: '조금 더 특별한 하루',
};

function pickBase(input: GenerateInput): DemoSlug | null {
  if (input.method === 'template' && input.templateId) {
    const b = TEMPLATE_BASE[input.templateId];
    if (b) return b;
  }
  const text = `${input.name ?? ''} ${input.idea}`;
  for (const [slug, re] of KEYWORDS) if (re.test(text)) return slug;
  return null;
}

/** 아이디어 글에서 서비스 이름 후보를 뽑는다 */
export function suggestName(idea: string): string {
  const cleaned = idea
    .split(/[.!?\n。]/)[0]
    .replace(/(서비스|플랫폼|앱|사이트|웹사이트)\s*$/u, '')
    .trim();
  const words = cleaned.split(/\s+/).filter((w) => w && !/^(을|를|위한|하는|있는|그리고|및)$/.test(w));
  const tail = words.slice(-2).join(' ').replace(/(을|를|의|은|는|이|가)$/u, '');
  return (tail || '나의 데모').slice(0, 20);
}

function buildPages(kind: string, base: DemoSlug | null, features: readonly string[]): { pages: SitePage[]; links: SiteLink[] } {
  const flow = FLOWS[kind] ?? FLOWS['쇼핑몰'];
  const names = base ? BASE_PAGE_NAMES[base] ?? {} : {};
  const seeds: Array<[string, string, string[], boolean]> = flow.map(([id, name, contents]) => [id, names[id] ?? name, [...contents], false]);

  if (features.includes('회원가입·로그인') && !seeds.some(([id]) => id === 'login')) {
    seeds.push(['login', '로그인', ['이메일 로그인', '소셜 로그인'], false]);
  }
  // 후기는 고르지 않았으면 '추가 제안'으로 점선 별
  seeds.push(['review', '후기', ['별점과 한 줄 후기', '사진 후기'], !features.includes('후기·댓글')]);

  const pages: SitePage[] = seeds.slice(0, SLOTS.length).map(([id, name, contents, suggested], i) => ({
    id,
    name,
    x: SLOTS[i][0],
    y: SLOTS[i][1],
    dot: SLOTS[i][2],
    contents,
    ...(suggested ? { suggested: true } : {}),
  }));
  const has = (id: string) => pages.some((p) => p.id === id);
  const links: SiteLink[] = [];
  const chain = ['home', 'list', 'detail', 'action', 'done'].filter(has);
  for (let i = 0; i < chain.length - 1; i++) links.push({ from: chain[i], to: chain[i + 1] });
  if (has('mypage')) links.push({ from: 'home', to: 'mypage' });
  if (has('login')) links.push({ from: has('mypage') ? 'mypage' : 'home', to: 'login' });
  if (has('review')) links.push({ from: 'detail', to: 'review', dashed: pages.find((p) => p.id === 'review')?.suggested });
  return { pages, links };
}

function genericCopy(kind: string, brand: string): Omit<DemoData, 'brand' | 'color' | 'dark' | 'tint' | 'image'> {
  switch (kind) {
    case '예약':
      return {
        nav: ['둘러보기', '내 예약'],
        tagline: `${brand}에서 만나요`,
        meta: '이번 주 토요일 오후 2시',
        title: `${brand} 첫 방문 예약`,
        price: '20,000원',
        progress: '예약 현황 6 / 10자리',
        pct: 60,
        cta: '예약하기',
        infoH: '이용 안내',
        infoP: '예약 시간 10분 전까지 도착해 주세요. 일정 변경은 하루 전까지 가능해요.',
        listH: '다른 일정',
        items: [
          { name: '평일 저녁 타임', sub: '20,000원 · 3/8자리' },
          { name: '주말 오전 타임', sub: '20,000원 · 7/10자리' },
          { name: '2인 함께 예약', sub: '36,000원 · 2/4팀' },
        ],
      };
    case '커뮤니티':
      return {
        nav: ['모임 찾기', '내 모임'],
        tagline: '혼자보다 함께',
        meta: '매주 수요일 저녁 8시',
        title: `${brand} 첫 모임 멤버 모집`,
        price: '참가비 무료',
        progress: '모집 현황 5 / 8명',
        pct: 62,
        cta: '참여 신청',
        infoH: '진행 방식',
        infoP: '처음 오신 분도 편하게 참여할 수 있어요. 모임 전날 안내 메시지를 보내드려요.',
        listH: '모집 중인 모임',
        items: [
          { name: '주말 오전 모임', sub: '무료 · 4/6명' },
          { name: '온라인 모임', sub: '무료 · 9/12명' },
          { name: '번개 모임', sub: '무료 · 2/5명' },
        ],
      };
    case 'SaaS':
      return {
        nav: ['기능', '요금제'],
        tagline: '복잡한 일을 단순하게',
        meta: '14일 무료 체험',
        title: `${brand}로 일을 더 가볍게`,
        price: '월 9,900원부터',
        progress: '이번 달 가입 128 / 200팀',
        pct: 64,
        cta: '무료로 시작하기',
        infoH: '이렇게 써요',
        infoP: '가입하고 3분이면 첫 화면을 볼 수 있어요. 카드 등록 없이 체험할 수 있어요.',
        listH: '요금제',
        items: [
          { name: '개인', sub: '무료 · 기본 기능' },
          { name: '팀', sub: '월 9,900원 · 5명까지' },
          { name: '비즈니스', sub: '월 29,000원 · 무제한' },
        ],
      };
    case '정보 소개':
      return {
        nav: ['소개', '소식'],
        tagline: `${brand}를 소개해요`,
        meta: '언제든 문의하세요',
        title: `${brand}는 이런 일을 해요`,
        price: '상담 무료',
        progress: '이번 달 문의 18 / 30건',
        pct: 60,
        cta: '문의하기',
        infoH: '찾아오는 길',
        infoP: '평일 오전 10시부터 오후 6시까지 운영해요. 방문 전에 연락 주시면 더 자세히 안내해 드려요.',
        listH: '자주 묻는 질문',
        items: [
          { name: '처음인데 어떻게 시작하나요?', sub: '안내 보기' },
          { name: '비용은 얼마인가요?', sub: '안내 보기' },
          { name: '어디에 있나요?', sub: '안내 보기' },
        ],
      };
    default:
      return {
        nav: ['상품', '내 주문'],
        tagline: `${brand}의 오늘의 추천`,
        meta: '오늘 저녁 8시 마감',
        title: `${brand} 대표 상품`,
        price: '12,000원',
        progress: '남은 수량 8 / 20개',
        pct: 40,
        cta: '구매하기',
        infoH: '배송 안내',
        infoP: '오후 2시 전 주문은 오늘 출발해요. 동네 픽업도 선택할 수 있어요.',
        listH: '함께 보면 좋은 상품',
        items: [
          { name: '인기 상품', sub: '9,900원' },
          { name: '새로 나온 상품', sub: '14,000원' },
          { name: '묶음 할인', sub: '25,000원' },
        ],
      };
  }
}

/** 생성 입력 → 사이트. 같은 입력이면 항상 같은 결과. */
export function generateSite(input: GenerateInput): SiteSpec {
  const base = pickBase(input);
  const baseData = base ? DEMOS[base] : null;
  const template = input.templateId ? TEMPLATES.find((t) => t.id === input.templateId) : undefined;
  const kind = input.kind || (template?.type as string | undefined) || (base ? BASE_KIND[base] : '쇼핑몰');
  const brand = (input.name?.trim() || template?.brand || baseData?.brand || suggestName(input.idea)).slice(0, 30);
  const features = input.features ?? [];

  const copy = baseData
    ? {
        nav: [baseData.nav[0], baseData.nav[1]] as [string, string],
        tagline: baseData.tagline ?? genericCopy(kind, brand).tagline,
        meta: baseData.meta,
        title: baseData.title,
        price: baseData.price,
        progress: baseData.progress,
        pct: baseData.pct,
        cta: baseData.cta,
        infoH: baseData.infoH,
        infoP: baseData.infoP,
        listH: baseData.listH,
        items: baseData.items.map((it) => ({ ...it })),
      }
    : genericCopy(kind, brand);

  const palette = paletteFrom(input.color || baseData?.color || '#2f7d5b');
  const { pages, links } = buildPages(kind, base, features);
  const mood = input.mood ?? '';

  return {
    brand,
    ...palette,
    mood,
    kind,
    ...copy,
    tagline: (mood && MOOD_TAGLINE[mood]) || copy.tagline || brand,
    ...(baseData?.image ? { image: { ...baseData.image } } : {}),
    ctaAction: 'navigate',
    ctaTarget: pages.some((p) => p.id === 'action') ? 'action' : pages[pages.length - 1].id,
    pages,
    links,
  };
}

/** 기본 예시 데모(DemoData)를 SiteSpec 으로 (공개 데모 화면이 같은 모양으로 그리도록) */
export function siteFromDemo(slug: DemoSlug): SiteSpec {
  const d = DEMOS[slug];
  const kind = BASE_KIND[slug];
  const { pages, links } = buildPages(kind, slug, ['후기·댓글']);
  return {
    brand: d.brand,
    color: d.color,
    dark: d.dark,
    tint: d.tint,
    mood: '',
    kind,
    nav: [d.nav[0], d.nav[1]],
    ...(d.image ? { image: { ...d.image } } : {}),
    tagline: d.tagline ?? d.brand,
    meta: d.meta,
    title: d.title,
    price: d.price,
    progress: d.progress,
    pct: d.pct,
    cta: d.cta,
    ctaAction: 'fake',
    ctaTarget: 'action',
    infoH: d.infoH,
    infoP: d.infoP,
    listH: d.listH,
    items: d.items.map((it) => ({ ...it })),
    pages,
    links,
  };
}

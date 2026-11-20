/** 템플릿 갤러리 목업 데이터 (Gallery.dc.html의 TEMPLATES) */

export type TemplateCategory = '쇼핑몰' | '예약' | '커뮤니티' | 'SaaS';

/** [x(%), y(%), 반지름(px)] */
export type TemplateStar = readonly [x: number, y: number, r: number];

export type Template = {
  id: string;
  name: string;
  type: TemplateCategory;
  pages: number;
  desc: string;
  bg: string;
  brand: string;
  hero: string;
  cta: string;
  pageList: readonly string[];
  cards: readonly string[];
  stars: readonly TemplateStar[];
};

export const TEMPLATES: readonly Template[] = [
  {
    id: 'banchan',
    name: '동네 반찬 공동구매',
    type: '쇼핑몰',
    pages: 6,
    desc: '상품 목록, 공동구매 모집 현황, 결제 완료까지 이어지는 소분 공동구매몰.',
    bg: 'var(--night-900)',
    brand: '반찬나눔',
    hero: '오늘 저녁, 이웃과 반찬을 나눠요',
    cta: '공동구매 둘러보기',
    pageList: ['홈', '상품 목록', '상품 상세', '참여', '결제 완료', '마이'],
    cards: ['한우 장조림 200g', '시금치 나물 150g', '멸치 볶음 100g'],
    stars: [[12, 70, 5], [34, 34, 7], [58, 52, 5], [82, 24, 8]],
  },
  {
    id: 'craft',
    name: '핸드메이드 소품샵',
    type: '쇼핑몰',
    pages: 5,
    desc: '작가 소개와 작품 갤러리, 장바구니를 갖춘 작은 온라인 공방.',
    bg: 'var(--violet-700)',
    brand: '손끝공방',
    hero: '한 사람이 하나씩 만든 물건들',
    cta: '작품 보러 가기',
    pageList: ['홈', '작품', '작가', '장바구니', '주문 완료'],
    cards: ['도자기 머그', '라탄 바구니', '면 손수건'],
    stars: [[18, 30, 6], [40, 66, 5], [64, 40, 7], [86, 70, 5]],
  },
  {
    id: 'walk',
    name: '반려견 산책 매칭',
    type: '예약',
    pages: 7,
    desc: '산책러 프로필을 보고 원하는 시간에 예약하고 후기를 남기는 서비스.',
    bg: 'var(--night-900)',
    brand: '함께걸개',
    hero: '바쁜 날에도 산책은 거르지 않게',
    cta: '산책러 찾기',
    pageList: ['홈', '산책러', '상세', '예약', '완료', '후기', '마이'],
    cards: ['산책러 지은', '산책러 도윤', '산책러 하린'],
    stars: [[14, 46, 5], [36, 22, 6], [56, 60, 8], [80, 38, 5]],
  },
  {
    id: 'salon',
    name: '동네 미용실 예약',
    type: '예약',
    pages: 5,
    desc: '디자이너와 시술, 빈 시간을 고르면 예약이 끝나는 간단한 예약 페이지.',
    bg: 'var(--violet-700)',
    brand: '오늘머리',
    hero: '원하는 시간, 원하는 디자이너로',
    cta: '예약하기',
    pageList: ['홈', '디자이너', '시술', '시간 선택', '예약 완료'],
    cards: ['커트', '펌', '염색'],
    stars: [[10, 24, 5], [32, 58, 7], [60, 30, 5], [84, 56, 6]],
  },
  {
    id: 'study',
    name: '동네 스터디 모임',
    type: '커뮤니티',
    pages: 5,
    desc: '관심사별 모임을 찾고, 참여 신청하고, 모임 소식을 나누는 커뮤니티.',
    bg: 'var(--night-900)',
    brand: '같이공부',
    hero: '혼자 하던 공부, 이제 같이 해요',
    cta: '모임 찾기',
    pageList: ['홈', '모임 목록', '모임 상세', '신청', '마이'],
    cards: ['토익 아침반', '코딩 입문', '독서 모임'],
    stars: [[16, 62, 6], [38, 30, 5], [62, 36, 7], [84, 70, 5]],
  },
  {
    id: 'parent',
    name: '육아 정보 나눔',
    type: '커뮤니티',
    pages: 6,
    desc: '지역별 육아 정보 게시판과 질문 답변, 물품 나눔 게시판.',
    bg: 'var(--violet-700)',
    brand: '우리동네육아',
    hero: '먼저 겪은 이웃에게 물어보세요',
    cta: '질문 남기기',
    pageList: ['홈', '게시판', '글 상세', '글쓰기', '나눔', '마이'],
    cards: ['어린이집 후기', '이유식 질문', '유모차 나눔'],
    stars: [[12, 36, 5], [34, 70, 6], [58, 24, 8], [82, 48, 5]],
  },
  {
    id: 'team',
    name: '팀 일정 관리 도구',
    type: 'SaaS',
    pages: 6,
    desc: '팀원 일정과 할 일을 한눈에 보는 대시보드형 업무 도구.',
    bg: 'var(--night-900)',
    brand: '팀캘린더',
    hero: '팀의 한 주를 한 화면에서',
    cta: '무료로 시작',
    pageList: ['소개', '가격', '가입', '대시보드', '일정', '설정'],
    cards: ['주간 일정', '할 일 보드', '팀원 현황'],
    stars: [[20, 50, 6], [42, 24, 5], [62, 58, 6], [84, 30, 7]],
  },
  {
    id: 'money',
    name: '1인 가계부',
    type: 'SaaS',
    pages: 4,
    desc: '지출을 기록하고 이번 달 소비를 그래프로 보는 개인 가계부.',
    bg: 'var(--violet-700)',
    brand: '한달살림',
    hero: '이번 달, 어디에 썼는지 한눈에',
    cta: '기록 시작하기',
    pageList: ['소개', '가입', '기록', '리포트'],
    cards: ['식비', '교통비', '구독료'],
    stars: [[14, 30, 5], [36, 56, 6], [60, 70, 5], [84, 40, 8]],
  },
];

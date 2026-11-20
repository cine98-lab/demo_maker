import type { DemoSlug } from '../routes.ts';

export interface DemoItem {
  name: string;
  sub: string;
}

export interface DemoData {
  /** 데모 서비스 이름(헤더 브랜드) */
  brand: string;
  /** 대표 색: 브랜드명, 링크, 진행 막대, CTA */
  color: string;
  /** 링크 hover 색 */
  dark: string;
  /** 사진 자리/목록 썸네일 배경색 */
  tint: string;
  /** 헤더 메뉴 앞 두 개 (세 번째 '로그인'은 공통) */
  nav: [string, string];
  /** 실제 사진이 있으면 사진, 없으면 tint 배경 + tagline */
  image?: { src: string; alt: string; position: string };
  tagline?: string;
  meta: string;
  title: string;
  price: string;
  progress: string;
  /** 진행 막대 너비(%) */
  pct: number;
  cta: string;
  infoH: string;
  infoP: string;
  listH: string;
  items: [DemoItem, DemoItem, DemoItem];
}

export const DEMOS: Record<DemoSlug, DemoData> = {
  banchan: {
    brand: '반찬나눔',
    color: '#2f7d5b',
    dark: '#1f5a40',
    tint: '#f5ece4',
    nav: ['상품', '내 공동구매'],
    image: {
      src: '/images/jangjorim.jpg',
      alt: '투명 반찬 용기에 담긴 윤기 나는 한우 장조림. 메추리알, 마늘, 꽈리고추가 함께 들어 있다',
      position: 'center 55%',
    },
    meta: '망원동 · 오늘 저녁 7시 마감',
    title: '한우 장조림 소분 (200g)',
    price: '4,500원',
    progress: '모집 현황 8 / 10명',
    pct: 80,
    cta: '공동구매 참여',
    infoH: '픽업 안내',
    infoP: '마감 후 다음 날 오후 2시부터 6시까지 망원시장 입구 반찬나눔 부스에서 받아가실 수 있어요.',
    listH: '함께 모집 중인 반찬',
    items: [
      { name: '시금치 나물 150g', sub: '2,800원 · 5/8명' },
      { name: '멸치 볶음 100g', sub: '3,200원 · 3/6명' },
      { name: '감자 조림 200g', sub: '2,500원 · 7/10명' },
    ],
  },
  bookstore: {
    brand: '동네책방 한켠',
    color: '#7a4a24',
    dark: '#5a3418',
    tint: '#f6eee4',
    nav: ['책 둘러보기', '모임 예약'],
    image: {
      src: '/images/demo-bookstore.jpg',
      alt: '햇살이 드는 동네 책방 창가 자리에서 두 사람이 음료를 앞에 두고 이야기를 나누고 있다. 벽 선반에 책과 화분이 놓여 있다',
      position: 'center 62%',
    },
    tagline: '책 한 권, 한 자리',
    meta: '연남동 · 이번 주 토요일 오후 3시',
    title: '북토크 「작은 가게의 기록」 좌석 예약',
    price: '12,000원 (음료 포함)',
    progress: '예약 현황 14 / 20석',
    pct: 70,
    cta: '좌석 예약하기',
    infoH: '찾아오는 길',
    infoP: '연남동 골목 2층, 초록 문을 열고 올라오세요. 시작 10분 전부터 입장할 수 있어요.',
    listH: '다가오는 책방 모임',
    items: [
      { name: '필사 모임 · 화요일 저녁', sub: '8,000원 · 6/8석' },
      { name: '그림책 낭독회 · 목요일', sub: '무료 · 9/15석' },
      { name: '독립출판 워크숍 · 일요일', sub: '25,000원 · 4/10석' },
    ],
  },
  pottery: {
    brand: '흙손 공방',
    color: '#8c4528',
    dark: '#6a321b',
    tint: '#f7ebe4',
    nav: ['클래스', '작품 판매'],
    image: {
      src: '/images/demo-pottery.jpg',
      alt: '도자기 공방에서 앞치마를 두른 사람이 물레 위의 작은 그릇을 두 손으로 빚고 있다. 뒤 선반에 초벌 작품들이 놓여 있다',
      position: 'center 68%',
    },
    tagline: '손으로 빚는 하루',
    meta: '성수동 · 매주 수·토 오전 10시',
    title: '원데이 물레 클래스 (머그컵 2개)',
    price: '68,000원',
    progress: '이번 달 신청 5 / 6명',
    pct: 83,
    cta: '클래스 신청하기',
    infoH: '준비물',
    infoP: '앞치마와 도구는 공방에서 준비해요. 작품은 가마에 구운 뒤 3주 후에 받아가실 수 있어요.',
    listH: '다른 클래스',
    items: [
      { name: '핸드빌딩 접시 만들기', sub: '52,000원 · 3/6명' },
      { name: '커플 머그 클래스', sub: '120,000원 · 2/4팀' },
      { name: '4주 정규반', sub: '240,000원 · 5/8명' },
    ],
  },
  study: {
    brand: '함께 코딩',
    color: '#2d4fa3',
    dark: '#1f3a7d',
    tint: '#e9eefb',
    nav: ['스터디 찾기', '내 스터디'],
    image: {
      src: '/images/demo-study.jpg',
      alt: '카페 테이블에 둘러앉은 사람들이 노트북과 태블릿, 메모를 펼쳐 놓고 함께 공부하고 있다',
      position: 'center 45%',
    },
    tagline: '혼자보다 함께, 끝까지',
    meta: '온라인 + 강남 오프라인 · 다음 주 월요일 시작',
    title: '8주 완성 파이썬 기초 스터디',
    price: '보증금 30,000원 (완주 시 환급)',
    progress: '모집 현황 6 / 8명',
    pct: 75,
    cta: '스터디 참여 신청',
    infoH: '진행 방식',
    infoP: '매주 월요일 저녁 8시 온라인으로 만나 과제를 나눠요. 한 달에 한 번은 강남에서 오프라인 모임을 해요.',
    listH: '모집 중인 스터디',
    items: [
      { name: '웹 프론트엔드 입문', sub: '보증금 20,000원 · 4/6명' },
      { name: '알고리즘 매일 1문제', sub: '무료 · 11/15명' },
      { name: '데이터 분석 실습', sub: '보증금 30,000원 · 3/8명' },
    ],
  },
  camping: {
    brand: '함께 캠핑',
    color: '#356b2f',
    dark: '#264f21',
    tint: '#e8f1e4',
    nav: ['동행 찾기', '캠핑장'],
    image: {
      src: '/images/demo-camping.jpg',
      alt: '전구 줄 조명이 걸린 밤의 캠핑장에서 사람들이 화로 주위 캠핑 의자에 둘러앉아 있다',
      position: 'center 62%',
    },
    tagline: '텐트 하나, 사람 여럿',
    meta: '가평 · 다음 달 첫째 주 1박 2일',
    title: '초보 환영! 가평 계곡 캠핑 동행',
    price: '1인 45,000원 (사이트·식비 포함)',
    progress: '동행 현황 7 / 10명',
    pct: 70,
    cta: '동행 신청하기',
    infoH: '모이는 곳',
    infoP: '토요일 오전 10시 가평역 2번 출구에서 만나 카풀로 이동해요. 텐트가 없어도 공용 장비를 빌려드려요.',
    listH: '다른 캠핑 동행',
    items: [
      { name: '양평 강변 차박', sub: '1인 30,000원 · 4/6명' },
      { name: '홍천 백패킹 입문', sub: '1인 55,000원 · 3/8명' },
      { name: '태안 바닷가 글램핑', sub: '1인 80,000원 · 6/8명' },
    ],
  },
  cafe: {
    brand: '골목 카페 온',
    color: '#7a4528',
    dark: '#5a311a',
    tint: '#f5ece5',
    nav: ['메뉴', '미리 주문'],
    image: {
      src: '/images/demo-cafe.jpg',
      alt: '종이 봉투마다 가득 담긴 갓 볶은 원두를 위에서 내려다본 모습',
      position: 'center 50%',
    },
    tagline: '줄 서지 않는 아침 커피',
    meta: '합정동 · 오전 8시~오후 9시',
    title: '오늘의 원두 · 에티오피아 핸드드립',
    price: '5,500원',
    progress: '오늘 남은 수량 12 / 30잔',
    pct: 40,
    cta: '미리 주문하기',
    infoH: '픽업 안내',
    infoP: '주문 후 약 10분 뒤 카페 입구의 픽업대에서 이름을 확인하고 가져가세요.',
    listH: '함께 많이 주문하는 메뉴',
    items: [
      { name: '바닐라 라떼', sub: '5,800원' },
      { name: '수제 버터 스콘', sub: '3,800원' },
      { name: '콜드브루 1L', sub: '18,000원' },
    ],
  },
  walk: {
    brand: '산책 메이트',
    color: '#a3402a',
    dark: '#7d2f1d',
    tint: '#fbece7',
    nav: ['산책러 찾기', '내 예약'],
    image: {
      src: '/images/demo-walk.jpg',
      alt: '가로등이 켜진 저녁 공원 산책로에서 한 사람이 작은 갈색 강아지와 함께 걷고 있다',
      position: 'center 62%',
    },
    tagline: '우리 강아지의 동네 친구',
    meta: '망원한강공원 · 평일 저녁 7시',
    title: '소형견 저녁 산책 메이트 (1시간)',
    price: '15,000원',
    progress: '이번 주 예약 4 / 5회',
    pct: 80,
    cta: '산책 예약하기',
    infoH: '산책러 소개',
    infoP: '반려견 돌봄 3년 차 이웃 산책러예요. 산책이 끝나면 사진과 함께 짧은 산책 일지를 보내드려요.',
    listH: '근처 산책러',
    items: [
      { name: '지우 님 · 대형견 가능', sub: '20,000원 · 후기 32개' },
      { name: '민서 님 · 주말 오전', sub: '15,000원 · 후기 18개' },
      { name: '하람 님 · 노견 전문', sub: '18,000원 · 후기 25개' },
    ],
  },
};

export function isDemoSlug(s: string | undefined): s is DemoSlug {
  return s !== undefined && Object.prototype.hasOwnProperty.call(DEMOS, s);
}

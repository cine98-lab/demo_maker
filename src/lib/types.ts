/**
 * 데모메이커 도메인 타입.
 * DB 의 projects.site(jsonb) 에 SiteSpec 이 그대로 들어간다.
 */

export type Method = 'idea' | 'wizard' | 'template';
export type ProjectStatus = 'draft' | 'published';
export type Visibility = 'public' | 'link' | 'password';
export type FeedbackStatus = 'open' | 'resolved';

/** 데모 사이트의 페이지 하나 (구조 확인 화면의 별 하나) */
export interface SitePage {
  id: string;
  name: string;
  /** 별자리 지도에서의 위치(%) */
  x: number;
  y: number;
  /** 별 지름(px) */
  dot: number;
  /** 페이지에 들어갈 핵심 내용 */
  contents: string[];
  /** AI 가 새로 추가를 제안한 페이지 (점선 별) */
  suggested?: boolean;
}

/** 페이지 사이의 이동 (별자리 선) */
export interface SiteLink {
  from: string;
  to: string;
  dashed?: boolean;
}

export interface SiteItem {
  name: string;
  sub: string;
}

export interface SiteImage {
  src: string;
  alt: string;
  /** CSS object-position */
  position: string;
}

/**
 * 생성된 데모 사이트 전체 내용.
 * 공개 데모 화면(PublicDemo)이 이걸로 그린다. 기본 예시 데모(src/data/demos.ts)도 같은 모양이다.
 */
export interface SiteSpec {
  /** 서비스 이름 (헤더 브랜드) */
  brand: string;
  /** 대표 색 / 진한 색(hover) / 연한 배경색 */
  color: string;
  dark: string;
  tint: string;
  /** 분위기, 서비스 유형 (생성 입력값 보관) */
  mood: string;
  kind: string;
  /** 헤더 메뉴 앞 두 개 (세 번째 '로그인'은 공통) */
  nav: [string, string];
  /** 대표 사진. 없으면 tint 배경 + tagline */
  image?: SiteImage;
  tagline: string;
  meta: string;
  title: string;
  price: string;
  progress: string;
  /** 진행 막대 % (0~100) */
  pct: number;
  cta: string;
  /** CTA 를 누르면: 다른 페이지로 이동 / 동작만 흉내 */
  ctaAction: 'navigate' | 'fake';
  /** ctaAction 이 navigate 일 때 이동할 페이지 id */
  ctaTarget: string;
  infoH: string;
  infoP: string;
  listH: string;
  items: SiteItem[];
  pages: SitePage[];
  links: SiteLink[];
}

/** projects 테이블 한 줄 */
export interface Project {
  id: string;
  owner_id: string;
  name: string;
  idea: string;
  method: Method;
  site: SiteSpec;
  status: ProjectStatus;
  slug: string | null;
  visibility: Visibility;
  /** 비밀번호가 설정돼 있는지만 알려준다 (해시는 화면에 쓰지 않는다) */
  password_hash: string | null;
  feedback_enabled: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  project_id: string;
  feedback_open: number;
  feedback_total: number;
  likes: number;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_no: number;
  label: string;
  site: SiteSpec;
  created_at: string;
}

export interface Feedback {
  id: string;
  project_id: string;
  page_key: string;
  x_pct: number;
  y_px: number;
  author_name: string;
  body: string;
  would_use: boolean | null;
  status: FeedbackStatus;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  notify_feedback: boolean;
  created_at: string;
}

/** 방문자가 보는 배포된 데모 (get_published_site RPC 결과) */
export type PublishedSite =
  | { locked: true; name: string }
  | {
      locked: false;
      id: string;
      name: string;
      site: SiteSpec;
      feedback_enabled: boolean;
      likes: number;
      liked: boolean;
    };

/** 새 프로젝트 만들기 화면에서 모은 입력 */
export interface GenerateInput {
  method: Method;
  /** 아이디어 입력 / 마법사 요약 문장 */
  idea: string;
  /** 서비스 이름 (비우면 자동) */
  name?: string;
  kind?: string;
  features?: string[];
  mood?: string;
  /** 대표 색 hex */
  color?: string;
  /** 템플릿으로 시작했을 때 템플릿 id */
  templateId?: string;
}

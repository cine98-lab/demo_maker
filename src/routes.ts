/** 화면 경로. 프로젝트 화면은 /project/:id/... (로그인 전 초안은 id = 'draft') */
export const ROUTES = {
  main: '/', // Main.dc.html
  gallery: '/templates', // Gallery.dc.html
  newProject: '/new', // NewProject.dc.html
  generating: '/new/generating', // Generating.dc.html
  login: '/login', // Login.dc.html
  resetPassword: '/reset-password',
  dashboard: '/dashboard', // Dashboard.dc.html
  account: '/account', // Account.dc.html
  structure: (id: string) => `/project/${id}/structure`, // Structure.dc.html
  editor: (id: string) => `/project/${id}/editor`, // Editor.dc.html
  preview: (id: string) => `/project/${id}/preview`, // Preview.dc.html
  published: (id: string) => `/project/${id}/published`, // Published.dc.html
  feedback: (id: string) => `/project/${id}/feedback`, // Feedback.dc.html
  settings: (id: string) => `/project/${id}/settings`, // Settings.dc.html
  /** 기본 예시 데모 (PublicDemo.dc.html, Demo*.dc.html) */
  demo: (slug: string) => `/demo/${slug}`,
  /** 사용자가 배포한 데모 */
  site: (slug: string) => `/p/${slug}`,
} as const;

/** 로그인 화면으로 보내면서, 로그인 후 돌아올 곳을 함께 전달 */
export function loginPath(next?: string): string {
  return next ? `${ROUTES.login}?next=${encodeURIComponent(next)}` : ROUTES.login;
}

/** 로그인 후 이동 경로가 이 사이트 안쪽인지 확인 (다른 사이트로 튕기는 것 방지) */
export function safeNext(next: string | null | undefined, fallback: string = ROUTES.dashboard): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

/** 공개 데모 slug: PublicDemo → banchan, DemoBookstore → bookstore ... */
export type DemoSlug = 'banchan' | 'bookstore' | 'pottery' | 'study' | 'camping' | 'cafe' | 'walk';

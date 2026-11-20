/**
 * 로그인 전 초안. "가입 없이 바로 시작"한 사용자의 작업을 이 브라우저에 보관하고,
 * 로그인하면 claimDraft(api.ts)가 계정으로 옮긴다.
 * 저장소 접근이 막힌 환경(사생활 보호 모드 등)에서도 화면이 깨지지 않도록 모두 try/catch.
 */
import type { GenerateInput, Method, SiteSpec } from './types.ts';

const KEY = 'dm:draft:v1';
const VISITOR_KEY = 'dm:visitor';

export interface Draft {
  input: GenerateInput;
  name: string;
  idea: string;
  method: Method;
  /** 생성 전에는 null */
  site: SiteSpec | null;
  updatedAt: string;
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(d: Omit<Draft, 'updatedAt'>): Draft {
  const draft: Draft = { ...d, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* 저장 불가 환경: 이번 화면에서만 유지 */
  }
  memory = draft;
  return draft;
}

export function clearDraft() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

/** localStorage 가 막혀 있을 때를 위한 메모리 사본 */
let memory: Draft | null = null;
export function currentDraft(): Draft | null {
  return loadDraft() ?? memory;
}

/** 방문자 구분용 id (좋아요 중복 방지). 브라우저마다 하나 */
export function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** 공개 데모 비밀번호를 탭이 열려 있는 동안 기억 */
export function rememberDemoPassword(slug: string, password: string | null) {
  try {
    if (password) sessionStorage.setItem(`dm:pw:${slug}`, password);
    else sessionStorage.removeItem(`dm:pw:${slug}`);
  } catch {
    /* noop */
  }
}
export function recallDemoPassword(slug: string): string | null {
  try {
    return sessionStorage.getItem(`dm:pw:${slug}`);
  } catch {
    return null;
  }
}

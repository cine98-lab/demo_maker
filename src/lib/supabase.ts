import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** .env.local 에 Supabase 값이 들어 있는지 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Supabase 클라이언트 (브라우저 하나에 하나).
 * 값이 없으면 null — 화면은 "연결 필요" 안내를 보여주고 로그인 없이 쓸 수 있는 기능만 동작한다.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/** Supabase 가 꼭 필요한 곳에서 쓴다. 연결이 안 돼 있으면 알기 쉬운 오류를 던진다. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new AppError('not_configured', 'Supabase 연결 정보가 없어요. .env.local 에 VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 를 넣어 주세요.');
  }
  return supabase;
}

/** 화면에 그대로 보여줄 수 있는 한국어 메시지를 가진 오류 */
export class AppError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
  }
}

/** Supabase/네트워크 오류를 사용자에게 보여줄 한국어 문장으로 바꾼다 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const e = err as { message?: string; code?: string; status?: number } | null;
  const msg = e?.message ?? '';
  const code = e?.code ?? '';
  const map: Array<[RegExp | string, string, string]> = [
    ['Invalid login credentials', 'invalid_credentials', '이메일 또는 비밀번호가 맞지 않아요.'],
    ['Email not confirmed', 'email_not_confirmed', '이메일 인증이 아직 안 됐어요. 받은편지함의 인증 메일을 확인해 주세요.'],
    ['User already registered', 'user_exists', '이미 가입된 이메일이에요. 로그인해 주세요.'],
    [/Password should be at least/i, 'weak_password', '비밀번호는 6자 이상으로 정해 주세요.'],
    [/rate limit/i, 'rate_limited', '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'],
    [/provider is not enabled/i, 'provider_disabled', '이 로그인 방식은 아직 설정되지 않았어요. 이메일로 로그인해 주세요.'],
    ['projects_slug_key', 'slug_taken', '이미 다른 데모가 쓰고 있는 주소예요. 다른 주소를 입력해 주세요.'],
    ['projects_slug_check', 'slug_invalid', '주소는 영어 소문자, 숫자, 하이픈(-)으로 3~40자로 정해 주세요.'],
    ['password_too_short', 'password_too_short', '비밀번호는 4자 이상으로 정해 주세요.'],
    ['feedback_disabled', 'feedback_disabled', '지금은 이 데모에 피드백을 받지 않고 있어요.'],
    ['locked', 'locked', '비밀번호가 필요한 데모예요.'],
    ['not_found', 'not_found', '데모를 찾을 수 없어요.'],
    [/Failed to fetch|NetworkError|network/i, 'network', '인터넷 연결을 확인해 주세요.'],
  ];
  for (const [pat, c, text] of map) {
    if (typeof pat === 'string' ? msg.includes(pat) : pat.test(msg)) return new AppError(c, text);
  }
  if (code === '23505') return new AppError('duplicate', '이미 있는 값이에요.');
  if (code === '42501') return new AppError('forbidden', '권한이 없어요. 다시 로그인해 주세요.');
  if (code === 'PGRST116' || code === 'P0002') return new AppError('not_found', '찾을 수 없어요.');
  return new AppError('unknown', msg ? `문제가 생겼어요: ${msg}` : '알 수 없는 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
}

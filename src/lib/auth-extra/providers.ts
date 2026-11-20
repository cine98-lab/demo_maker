/**
 * 소셜 로그인 제공자가 Supabase 프로젝트에서 켜져 있는지 미리 확인한다.
 * supabase-js 의 signInWithOAuth 는 서버에 묻지 않고 곧장 /authorize 로 이동하기 때문에,
 * 제공자가 꺼져 있으면 사용자가 Supabase 의 JSON 오류 화면에 떨어진다. 그 전에 막기 위한 확인.
 */
import { AppError } from '../supabase.ts';

let cache: Promise<Record<string, boolean> | null> | null = null;

function loadSettings(): Promise<Record<string, boolean> | null> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return Promise.resolve(null);
  return fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: key } })
    .then((r) => (r.ok ? (r.json() as Promise<{ external?: Record<string, boolean> }>) : null))
    .then((j) => j?.external ?? null)
    .catch(() => null);
}

/** 꺼져 있으면 AppError('provider_disabled'). 확인 자체가 실패하면 그냥 통과시킨다. */
export async function assertProviderEnabled(provider: string): Promise<void> {
  if (!cache) cache = loadSettings();
  const external = await cache;
  if (!external) {
    cache = null; // 다음에 다시 시도
    return;
  }
  if (external[provider] === false) {
    throw new AppError('provider_disabled', '이 로그인 방식은 아직 설정되지 않았어요. 이메일로 로그인해 주세요.');
  }
}

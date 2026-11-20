/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase Project URL (https://xxxx.supabase.co) */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon(public) key — 브라우저에 공개돼도 되는 키. 데이터 보호는 RLS 가 한다 */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

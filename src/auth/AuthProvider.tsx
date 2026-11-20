import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, requireSupabase, toAppError } from '../lib/supabase.ts';
import { getMyProfile } from '../lib/api.ts';
import type { Profile } from '../lib/types.ts';

export type OAuthProvider = 'google' | 'kakao';

export interface AuthState {
  /** Supabase 연결 정보가 있는지 */
  configured: boolean;
  /** 첫 세션 확인 중 */
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** 화면에 보여줄 이름 (프로필 이름 → 이메일 앞부분) */
  displayName: string;
  signIn: (email: string, password: string) => Promise<void>;
  /** 가입. 이메일 인증이 켜져 있으면 needsConfirm: true */
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirm: boolean }>;
  signInWithOAuth: (provider: OAuthProvider, next?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;
  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await getMyProfile());
    } catch {
      setProfile(null);
    }
  }, [userId]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const value = useMemo<AuthState>(() => {
    const user = session?.user ?? null;
    const displayName = profile?.display_name || (user?.email ? user.email.split('@')[0] : '') || '나';
    return {
      configured: isSupabaseConfigured,
      loading,
      session,
      user,
      profile,
      displayName,
      async signIn(email, password) {
        const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw toAppError(error);
      },
      async signUp(email, password, name) {
        const { data, error } = await requireSupabase().auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw toAppError(error);
        // 이미 가입된 이메일이면 Supabase 는 오류 없이 identities 가 빈 사용자를 돌려준다
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw toAppError({ message: 'User already registered' });
        }
        return { needsConfirm: !data.session };
      },
      async signInWithOAuth(provider, next) {
        const redirectTo = `${window.location.origin}/login${next ? `?next=${encodeURIComponent(next)}` : ''}`;
        const { error } = await requireSupabase().auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) throw toAppError(error);
      },
      async sendPasswordReset(email) {
        const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw toAppError(error);
      },
      async updatePassword(password) {
        const { error } = await requireSupabase().auth.updateUser({ password });
        if (error) throw toAppError(error);
      },
      async signOut() {
        await requireSupabase().auth.signOut();
        setProfile(null);
      },
      refreshProfile,
    };
  }, [session, profile, loading, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있어요.');
  return ctx;
}

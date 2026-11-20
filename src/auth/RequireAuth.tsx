import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider.tsx';
import { loginPath } from '../routes.ts';
import { ConfigNotice, PageLoading } from '../components/StatusViews.tsx';

/**
 * 로그인해야 볼 수 있는 화면을 감싼다.
 * allowDraft: /project/draft/... 처럼 로그인 전 초안을 다루는 화면이면 로그인 없이 통과
 */
export function RequireAuth({ children, allowDraft = false, draft = false }: { children: ReactNode; allowDraft?: boolean; draft?: boolean }) {
  const { configured, loading, user } = useAuth();
  const location = useLocation();
  if (allowDraft && draft) return <>{children}</>;
  if (!configured) return <ConfigNotice />;
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  return <>{children}</>;
}

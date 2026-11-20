import type { ReactNode } from 'react';
import { ROUTES } from '../routes.ts';
import { ButtonLink } from './Button.tsx';
import LogoMark from './LogoMark.tsx';

/** 화면 전체 로딩: 별 세 개가 차례로 반짝인다 */
export function PageLoading({ label = '불러오는 중이에요' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        color: 'var(--ink-muted)',
        fontSize: 14,
      }}
    >
      <span className="dm-loading-stars" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {label}
    </div>
  );
}

/** 오류 안내 + 다시 시도 */
export function PageError({ message, onRetry, action }: { message: string; onRetry?: () => void; action?: ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <LogoMark size={36} dark />
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, maxWidth: '28em' }}>{message}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {onRetry && (
          <button type="button" className="dm-btn dm-btn--secondary dm-btn--md" onClick={onRetry}>
            다시 시도
          </button>
        )}
        {action ?? (
          <ButtonLink to={ROUTES.dashboard} variant="ghost">
            대시보드로 →
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

/** Supabase 연결 정보가 없을 때 */
export function ConfigNotice() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--night-900)', color: 'var(--ink-on-night)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <LogoMark size={36} />
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Supabase 연결이 필요해요</h1>
        <p style={{ margin: 0, lineHeight: 1.7, color: '#d8d5ef' }}>
          로그인과 저장은 Supabase 로 동작해요. 프로젝트 폴더의 <code>.env.example</code> 을 <code>.env.local</code> 로 복사하고
          <code> VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> 를 채운 뒤 개발 서버를 다시 켜 주세요.
        </p>
        <p style={{ margin: 0, lineHeight: 1.7, color: '#d8d5ef' }}>로그인 없이도 새 프로젝트 만들기와 예시 데모는 쓸 수 있어요.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ButtonLink to={ROUTES.newProject} variant="primary">
            로그인 없이 만들어 보기
          </ButtonLink>
          <ButtonLink to={ROUTES.main} variant="violet">
            처음으로
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

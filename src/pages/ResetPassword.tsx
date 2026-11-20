import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ROUTES } from '../routes.ts';
import { Brand, Button, ButtonLink, TextField } from '../components';
import { ConfigNotice } from '../components/StatusViews.tsx';
import { Starfield } from '../animation/Starfield.tsx';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { toAppError } from '../lib/supabase.ts';

const MIN_PASSWORD = 6;

/**
 * 비밀번호 재설정. 메일의 링크를 누르면 Supabase 가 주소에 복구 세션을 실어 보내고,
 * supabase-js(detectSessionInUrl)가 그걸 읽어 AuthProvider 의 세션이 채워진다.
 */
export default function ResetPassword() {
  const { configured, loading, user, updatePassword } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollMotion(rootRef);

  if (!configured) return <ConfigNotice />;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (pw.length < MIN_PASSWORD) {
      setError(`비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`);
      return;
    }
    if (pw !== pw2) {
      setError('두 비밀번호가 서로 달라요. 다시 확인해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(pw);
      setDone(true);
      setPw('');
      setPw2('');
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (loading) {
    body = (
      <p role="status" style={{ margin: 0, fontSize: 15, color: 'var(--ink-muted)' }}>
        링크를 확인하는 중이에요…
      </p>
    );
  } else if (done) {
    body = (
      <>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>새 비밀번호로 바꿨어요</h1>
        <div role="status" className="dm-alert dm-alert--success">
          다음부터는 새 비밀번호로 로그인해 주세요.
        </div>
        <ButtonLink to={ROUTES.dashboard} variant="primary" size="lg" block>
          대시보드로 가기
        </ButtonLink>
      </>
    );
  } else if (!user) {
    body = (
      <>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>링크가 만료됐어요</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-muted)' }}>
          비밀번호 재설정 링크는 한 번만, 짧은 시간 동안만 쓸 수 있어요. 로그인 화면의 "비밀번호를 잊으셨나요?"에서 메일을 새로 받아 주세요.
        </p>
        <ButtonLink to={ROUTES.login} variant="primary" size="lg" block>
          로그인 화면으로
        </ButtonLink>
      </>
    );
  } else {
    body = (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>새 비밀번호 정하기</h1>
          {user.email && (
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>
              {user.email} 계정의 비밀번호를 바꿔요.
            </p>
          )}
        </div>
        {error && (
          <div role="alert" className="dm-alert dm-alert--error">
            {error}
          </div>
        )}
        <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={busy} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 비밀번호 관리자가 어느 계정인지 알 수 있게 */}
          <input type="email" name="email" autoComplete="username" value={user.email ?? ''} readOnly hidden />
          <TextField
            id="new-pw"
            label="새 비밀번호"
            type="password"
            autoComplete="new-password"
            hint={`${MIN_PASSWORD}자 이상으로 정해 주세요.`}
            minLength={MIN_PASSWORD}
            required
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <TextField
            id="new-pw2"
            label="새 비밀번호 확인"
            type="password"
            autoComplete="new-password"
            required
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          <Button type="submit" variant="primary" size="lg" block disabled={busy}>
            {busy ? '바꾸는 중…' : '비밀번호 바꾸기'}
          </Button>
        </form>
      </>
    );
  }

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        background: 'var(--night-900)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '48px 16px',
      }}
    >
      <Starfield seed={21} gold={2} />
      <div data-intro="0" style={{ position: 'relative' }}>
        <Brand to={ROUTES.main} night size={28} />
      </div>
      <main
        data-intro="1"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
        }}
      >
        {body}
      </main>
    </div>
  );
}

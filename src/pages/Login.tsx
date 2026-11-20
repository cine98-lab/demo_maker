import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES, safeNext } from '../routes.ts';
import { Brand, Button, Tabs, TextField } from '../components';
import { ConfigNotice } from '../components/StatusViews.tsx';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { Starfield } from '../animation/Starfield.tsx';
import { useAuth } from '../auth/AuthProvider.tsx';
import type { OAuthProvider } from '../auth/AuthProvider.tsx';
import { claimDraft } from '../lib/api.ts';
import { currentDraft } from '../lib/draft.ts';
import { toAppError } from '../lib/supabase.ts';
import { assertProviderEnabled } from '../lib/auth-extra/providers.ts';

type Mode = 'login' | 'signup' | 'reset';
type TabMode = Exclude<Mode, 'reset'>;

const MODE_TABS = [
  { id: 'login', label: '로그인' },
  { id: 'signup', label: '회원가입' },
] as const;

const MIN_PASSWORD = 6;

const divider: CSSProperties = { flex: 1, height: 1, background: 'var(--line)' };
const linkButton: CSSProperties = {
  alignSelf: 'center',
  border: 0,
  background: 'none',
  color: 'var(--dawn-coral-ink)',
  font: 'inherit',
  fontSize: 14,
  fontWeight: 500,
  padding: '8px 0',
  textDecoration: 'underline',
  cursor: 'pointer',
};

const preventNav = (e: MouseEvent<HTMLAnchorElement>) => e.preventDefault();

/** toAppError 에 없는 인증 오류 몇 가지를 더 한국어로 */
function authMessage(err: unknown): string {
  const msg = (err as { message?: string } | null)?.message ?? '';
  if (/Email address .* is invalid|invalid format|Unable to validate email/i.test(msg)) return '이메일 주소를 다시 확인해 주세요.';
  if (/signups? not allowed|Signups not allowed/i.test(msg)) return '지금은 새로 가입할 수 없어요.';
  return toAppError(err).message;
}

/** 리다이렉트로 돌아올 때 주소에 실려 온 오류 (OAuth 취소, 만료된 인증 링크 등) */
function redirectError(): string | null {
  try {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const desc = search.get('error_description') ?? hash.get('error_description');
    const code = search.get('error_code') ?? hash.get('error_code') ?? search.get('error') ?? hash.get('error');
    if (!desc && !code) return null;
    if (code === 'otp_expired' || /expired/i.test(desc ?? '')) return '인증 링크가 만료됐어요. 다시 로그인하거나 메일을 새로 받아 주세요.';
    if (code === 'access_denied') return '로그인이 취소됐어요.';
    return toAppError({ message: desc ?? code ?? '' }).message;
  } catch {
    return null;
  }
}

export default function Login() {
  const { configured, loading, user, signIn, signUp, signInWithOAuth, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextParam = params.get('next');
  const draft = currentDraft();
  const draftName = draft?.site ? draft.name || draft.site.brand || '새 프로젝트' : null;

  const [mode, setMode] = useState<Mode>(() => (params.get('mode') === 'signup' || draftName ? 'signup' : 'login'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => redirectError());
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  /** 로그인 후 초안 옮기기 + 이동 (StrictMode 에서 두 번 돌지 않도록) */
  const finishing = useRef(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  useScrollMotion(rootRef);

  const finish = async () => {
    setFinishError(null);
    try {
      const project = await claimDraft();
      if (project) {
        navigate(ROUTES.editor(project.id), { replace: true });
        return;
      }
      navigate(safeNext(nextParam), { replace: true });
    } catch (e) {
      setFinishError(`작업 중이던 데모를 계정으로 옮기지 못했어요. ${toAppError(e).message}`);
    }
  };

  // 로그인 성공, 또는 OAuth·인증 메일 링크로 세션을 받아 돌아온 경우 모두 여기서 이어간다
  useEffect(() => {
    if (loading || !user || finishing.current) return;
    finishing.current = true;
    void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (!configured) return <ConfigNotice />;

  const changeMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
    setSuccess(null);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setInfo(null);
    setSuccess(null);
    const mail = email.trim();
    if (!mail) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    if (mode !== 'reset' && !password) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }
    if (mode === 'signup') {
      if (!name.trim()) {
        setError('이름을 입력해 주세요.');
        return;
      }
      if (password.length < MIN_PASSWORD) {
        setError(`비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`);
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(mail, password);
        // 세션이 생기면 위 useEffect 가 초안 옮기기와 이동을 한다
      } else if (mode === 'signup') {
        const { needsConfirm } = await signUp(mail, password, name);
        if (needsConfirm) {
          setPassword('');
          setSuccess(`인증 메일을 보냈어요. ${mail} 받은편지함에서 링크를 누르면 가입이 끝나요.`);
        }
      } else {
        await sendPasswordReset(mail);
        setSuccess(`비밀번호를 다시 정하는 링크를 ${mail} 로 보냈어요. 메일함을 확인해 주세요.`);
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: OAuthProvider) => {
    setError(null);
    setInfo(null);
    setSuccess(null);
    try {
      await assertProviderEnabled(provider);
      await signInWithOAuth(provider, nextParam ?? undefined);
    } catch (err) {
      setError(toAppError(err).message);
    }
  };

  const signup = mode === 'signup';
  const reset = mode === 'reset';
  const signedIn = Boolean(user);

  return (
    <div
      ref={rootRef}
      style={{
        color: 'var(--ink)',
        background: 'var(--night-900)',
        minHeight: '100vh',
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      {/* 왼쪽: 밤하늘 */}
      <section
        aria-hidden="true"
        style={{
          position: 'relative',
          overflow: 'hidden',
          flex: '1 1 420px',
          minWidth: 0,
          color: 'var(--ink-on-night)',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        <Starfield seed={13} gold={2} />
        <div style={{ position: 'relative', display: 'flex' }}>
          <Brand to={ROUTES.main} tabIndex={-1} night size={28} />
        </div>
        <svg viewBox="0 0 400 260" style={{ position: 'relative', width: '100%', maxWidth: 440, height: 'auto' }}>
          <g fill="#f4f2ff" opacity="0.35">
            <circle cx="30" cy="30" r="1.5" />
            <circle cx="370" cy="20" r="1" />
            <circle cx="210" cy="240" r="1.5" />
            <circle cx="390" cy="200" r="1" />
            <circle cx="10" cy="180" r="1" />
          </g>
          <polyline
            points="50,190 130,110 220,140 310,60"
            fill="none"
            stroke="#ffb3a7"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="310"
            y1="60"
            x2="350"
            y2="150"
            stroke="#ffb3a7"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 6"
          />
          <circle cx="50" cy="190" r="7" fill="#ffd66b" />
          <circle cx="130" cy="110" r="9" fill="#ffd66b" />
          <circle cx="220" cy="140" r="6" fill="#ffd66b" />
          <circle cx="310" cy="60" r="11" fill="#ffd66b" />
          <circle cx="350" cy="150" r="6" fill="none" stroke="#ff7a59" strokeWidth="2" />
        </svg>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 32, lineHeight: 1.3, fontWeight: 800, letterSpacing: '-0.02em' }}>
            다음 별은
            <br />
            당신이 이어 주세요
          </p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--dawn-pink)' }}>
            로그인하면 만든 데모를 저장하고, 링크로 나누고, 피드백을 모아 볼 수 있어요.
          </p>
        </div>
      </section>

      {/* 오른쪽: 폼 */}
      <main
        style={{
          flex: '1 1 480px',
          minWidth: 0,
          background: 'var(--surface)',
          padding: '48px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <h1 className="sr-only">{reset ? '비밀번호 찾기' : signup ? '회원가입' : '로그인'}</h1>

          {draftName && (
            <div
              data-intro="0"
              role="status"
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '14px 16px',
                borderRadius: 12,
                background: 'var(--night-900)',
                color: 'var(--ink-on-night)',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  marginTop: 6,
                  borderRadius: 999,
                  background: 'var(--star-gold)',
                  boxShadow: '0 0 12px rgba(255, 214, 107, 0.6)',
                  flex: 'none',
                }}
              />
              <span style={{ fontSize: 14, lineHeight: 1.6 }}>
                {signedIn ? (
                  <>
                    작업 중인 데모 <b>"{draftName}"</b>를 계정에 저장하고 있어요.
                  </>
                ) : (
                  <>
                    {signup ? '가입하면' : '로그인하면'} 작업 중인 데모 <b>"{draftName}"</b>가 계정에 저장되고, 바로 이어서 고칠 수 있어요.
                  </>
                )}
              </span>
            </div>
          )}

          {signedIn ? (
            <div data-intro="1" role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {finishError ? (
                <>
                  <div role="alert" className="dm-alert dm-alert--error">
                    {finishError}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Button variant="primary" onClick={() => void finish()}>
                      다시 시도
                    </Button>
                    <Button onClick={() => navigate(safeNext(nextParam), { replace: true })}>나중에 하고 계속하기</Button>
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 16, color: 'var(--ink-muted)' }}>로그인됐어요. 이동하는 중이에요…</p>
              )}
            </div>
          ) : (
            <>
              {reset ? (
                <div data-intro="1" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>비밀번호 찾기</h2>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-muted)' }}>
                    가입한 이메일을 적어 주시면 새 비밀번호를 정하는 링크를 보내드려요.
                  </p>
                </div>
              ) : (
                <>
                  <div data-intro="1">
                    <Tabs<TabMode>
                      label="로그인 또는 회원가입"
                      variant="pill"
                      fill
                      items={MODE_TABS}
                      value={mode as TabMode}
                      onChange={changeMode}
                    />
                  </div>

                  <div data-intro="2" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Button size="lg" block onClick={() => void social('google')}>
                      Google로 계속하기
                    </Button>
                    <Button variant="kakao" size="lg" block onClick={() => void social('kakao')}>
                      카카오로 계속하기
                    </Button>
                    <Button
                      variant="naver"
                      size="lg"
                      block
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        setInfo('네이버 로그인은 준비 중이에요. 다른 방법으로 계속해 주세요.');
                      }}
                    >
                      네이버로 계속하기
                    </Button>
                  </div>

                  <div data-intro="3" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--ink-muted)' }}>
                    <span style={divider} />
                    또는 이메일로
                    <span style={divider} />
                  </div>
                </>
              )}

              {error && (
                <div role="alert" className="dm-alert dm-alert--error">
                  {error}
                </div>
              )}
              {info && (
                <div role="status" className="dm-alert dm-alert--info">
                  {info}
                </div>
              )}
              {success && (
                <div role="status" className="dm-alert dm-alert--success">
                  {success}
                </div>
              )}

              <form
                data-intro="4"
                onSubmit={(e) => void onSubmit(e)}
                noValidate
                aria-busy={busy}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {signup && (
                  <TextField
                    id="name"
                    label="이름"
                    type="text"
                    autoComplete="name"
                    placeholder="화면에 보일 이름"
                    maxLength={40}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
                <TextField
                  id="email"
                  label="이메일"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {!reset && (
                  <TextField
                    id="pw"
                    label="비밀번호"
                    type="password"
                    autoComplete={signup ? 'new-password' : 'current-password'}
                    placeholder={signup ? `${MIN_PASSWORD}자 이상` : '비밀번호'}
                    hint={signup ? `${MIN_PASSWORD}자 이상으로 정해 주세요.` : undefined}
                    minLength={signup ? MIN_PASSWORD : undefined}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
                {signup && (
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-muted)' }}>
                    가입하면{' '}
                    <a href="#" onClick={preventNav}>
                      이용약관
                    </a>
                    과{' '}
                    <a href="#" onClick={preventNav}>
                      개인정보처리방침
                    </a>
                    에 동의하는 것으로 봐요.
                  </p>
                )}
                <Button type="submit" variant="primary" size="lg" block disabled={busy}>
                  {busy
                    ? '잠시만요…'
                    : reset
                      ? '재설정 링크 보내기'
                      : signup
                        ? draftName
                          ? '가입하고 데모 저장하기'
                          : '가입하기'
                        : '로그인'}
                </Button>
                {mode === 'login' && (
                  <button type="button" style={linkButton} onClick={() => changeMode('reset')}>
                    비밀번호를 잊으셨나요?
                  </button>
                )}
                {reset && (
                  <button type="button" style={linkButton} onClick={() => changeMode('login')}>
                    ← 로그인으로 돌아가기
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

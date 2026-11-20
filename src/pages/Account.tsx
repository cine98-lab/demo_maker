import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { AppHeader, Avatar, Button, ButtonLink, Card, Dialog, StatusLabel, Switch, TextField, Toast } from '../components';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { deleteMyAccount, listMyProjects, updateMyProfile } from '../lib/api.ts';
import { toAppError } from '../lib/supabase.ts';

const MIN_PASSWORD = 6;
const DELETE_WORD = '탈퇴';

const providerRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'var(--surface)',
};
const providerName: CSSProperties = { fontSize: 15, fontWeight: 500 };

const PROVIDERS = [
  { id: 'email', label: '이메일' },
  { id: 'google', label: 'Google' },
  { id: 'kakao', label: '카카오' },
  { id: 'naver', label: '네이버' },
] as const;

export default function Account() {
  const { user, profile, displayName, refreshProfile, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollMotion(rootRef);

  const [toast, setToast] = useState('');

  // ── 프로필 이름
  const savedName = profile?.display_name ?? '';
  const [name, setName] = useState(savedName);
  const [nameDirty, setNameDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  useEffect(() => {
    if (!nameDirty) setName(savedName);
  }, [savedName, nameDirty]);
  const nameChanged = name.trim() !== savedName.trim();

  const saveName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nameChanged || savingName) return;
    if (!name.trim()) {
      setNameError('이름을 입력해 주세요.');
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateMyProfile({ display_name: name });
      await refreshProfile();
      setNameDirty(false);
      setToast('저장됨');
    } catch (err) {
      setNameError(toAppError(err).message);
    } finally {
      setSavingName(false);
    }
  };

  // ── 알림 (낙관적 반영, 실패하면 되돌림)
  const [notify, setNotify] = useState(profile?.notify_feedback ?? true);
  useEffect(() => {
    if (profile) setNotify(profile.notify_feedback);
  }, [profile]);
  const changeNotify = async (v: boolean) => {
    setNotify(v);
    try {
      await updateMyProfile({ notify_feedback: v });
      await refreshProfile();
      setToast(v ? '새 피드백 알림을 켰어요' : '새 피드백 알림을 껐어요');
    } catch (err) {
      setNotify(!v);
      setToast(toAppError(err).message);
    }
  };

  // ── 프로필을 한 번 새로 읽고 나서야 "못 불러옴" 안내를 띄운다 (첫 로딩 중 깜빡임 방지)
  const [profileChecked, setProfileChecked] = useState(false);
  useEffect(() => {
    void refreshProfile().finally(() => setProfileChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 만든 프로젝트 수
  const [projectCount, setProjectCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    listMyProjects()
      .then((list) => alive && setProjectCount(list.length))
      .catch(() => alive && setProjectCount(null));
    return () => {
      alive = false;
    };
  }, []);

  // ── 로그인 수단
  const linked = new Set((user?.identities ?? []).map((i) => i.provider));
  if (user?.app_metadata?.provider) linked.add(String(user.app_metadata.provider));
  const hasEmailLogin = linked.has('email');

  // ── 비밀번호 변경
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const pwFirstRef = useRef<HTMLInputElement>(null);
  const openPw = () => {
    setPw('');
    setPw2('');
    setPwError(null);
    setPwOpen(true);
  };
  const submitPw = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pwBusy) return;
    if (pw.length < MIN_PASSWORD) {
      setPwError(`비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`);
      return;
    }
    if (pw !== pw2) {
      setPwError('두 비밀번호가 서로 달라요. 다시 확인해 주세요.');
      return;
    }
    setPwBusy(true);
    setPwError(null);
    try {
      await updatePassword(pw);
      setPwOpen(false);
      setToast('비밀번호를 바꿨어요');
    } catch (err) {
      setPwError(toAppError(err).message);
    } finally {
      setPwBusy(false);
    }
  };

  // ── 로그아웃
  const [loggingOut, setLoggingOut] = useState(false);
  const logout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      /* 서버 응답과 관계없이 화면은 로그아웃 상태로 */
    }
    navigate(ROUTES.main, { replace: true });
  };

  // ── 회원 탈퇴
  const [delOpen, setDelOpen] = useState(false);
  const [delWord, setDelWord] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const delInputRef = useRef<HTMLInputElement>(null);
  const openDelete = () => {
    setDelWord('');
    setDelError(null);
    setDelOpen(true);
  };
  const submitDelete = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (delWord.trim() !== DELETE_WORD || delBusy) return;
    setDelBusy(true);
    setDelError(null);
    try {
      await deleteMyAccount();
      navigate(ROUTES.main, { replace: true });
    } catch (err) {
      setDelError(toAppError(err).message);
      setDelBusy(false);
    }
  };

  return (
    <div ref={rootRef} style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink)', background: 'var(--surface)', minHeight: '100vh' }}>
      <AppHeader
        brandTo={ROUTES.dashboard}
        right={
          <ButtonLink to={ROUTES.dashboard} variant="ghost">
            대시보드로 →
          </ButtonLink>
        }
      />

      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '40px 24px 64px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div data-intro style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={displayName} size={64} ring />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>계정 설정</h1>
            <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>
              {projectCount === null
                ? `${displayName}님의 계정`
                : projectCount === 0
                  ? '아직 그린 별자리가 없어요'
                  : `별자리 ${projectCount}개를 그렸어요`}
            </span>
          </div>
        </div>

        {profileChecked && !profile && (
          <div role="alert" className="dm-alert dm-alert--error">
            프로필 정보를 불러오지 못했어요. 잠시 후 새로고침해 주세요.
          </div>
        )}

        <Card data-reveal title="프로필" gap={16}>
          <form onSubmit={(e) => void saveName(e)} noValidate style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10 }}>
            <TextField
              id="name"
              label="이름"
              type="text"
              autoComplete="name"
              maxLength={40}
              fieldStyle={{ flex: '1 1 240px', maxWidth: 360 }}
              value={name}
              error={nameError ?? undefined}
              onChange={(e) => {
                setName(e.target.value);
                setNameDirty(true);
                setNameError(null);
              }}
            />
            <Button type="submit" variant="primary" disabled={!nameChanged || savingName}>
              {savingName ? '저장 중…' : '저장'}
            </Button>
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>이메일</span>
            <span style={{ fontSize: 15, color: 'var(--ink-muted)' }}>{user?.email ?? '이메일 없음'}</span>
          </div>
        </Card>

        <Card data-reveal title="로그인 수단">
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PROVIDERS.map((p) => (
              <li key={p.id} style={providerRow}>
                <span style={providerName}>{p.label}</span>
                {linked.has(p.id) ? (
                  <StatusLabel tone="success">연결됨</StatusLabel>
                ) : p.id === 'email' ? (
                  <StatusLabel tone="muted">연결 안 됨</StatusLabel>
                ) : (
                  <Button size="sm" onClick={() => setToast('소셜 계정 연결은 준비 중이에요')}>
                    연결하기
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {hasEmailLogin && (
            <Button style={{ alignSelf: 'flex-start' }} onClick={openPw}>
              비밀번호 변경
            </Button>
          )}
        </Card>

        <Card data-reveal title="알림 설정">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span id="noti-label" style={{ fontSize: 15, fontWeight: 500 }}>
                새 피드백 알림
              </span>
              <span id="noti-desc" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                누군가 내 데모에 별(핀)을 남기면 이메일로 알려드려요
              </span>
            </div>
            <Switch
              checked={notify}
              aria-labelledby="noti-label"
              aria-describedby="noti-desc"
              disabled={!profile}
              onChange={(v) => void changeNotify(v)}
            />
          </div>
        </Card>

        <div
          data-reveal="fade"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 20,
            borderTop: '1px solid var(--line)',
          }}
        >
          <Button variant="ghost" disabled={loggingOut} onClick={() => void logout()}>
            {loggingOut ? '로그아웃 중…' : '로그아웃'}
          </Button>
          <Button variant="danger-text" onClick={openDelete}>
            회원 탈퇴
          </Button>
        </div>
      </main>

      <Dialog
        open={pwOpen}
        onClose={() => !pwBusy && setPwOpen(false)}
        title="비밀번호 변경"
        initialFocusRef={pwFirstRef}
      >
        <form id="pw-form" onSubmit={(e) => void submitPw(e)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="email" name="email" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
          {pwError && (
            <div role="alert" className="dm-alert dm-alert--error">
              {pwError}
            </div>
          )}
          <TextField
            ref={pwFirstRef}
            id="acc-new-pw"
            label="새 비밀번호"
            type="password"
            autoComplete="new-password"
            hint={`${MIN_PASSWORD}자 이상으로 정해 주세요.`}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <TextField
            id="acc-new-pw2"
            label="새 비밀번호 확인"
            type="password"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          <div className="dm-dialog__actions" style={{ marginTop: 4 }}>
            <Button onClick={() => setPwOpen(false)} disabled={pwBusy}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={pwBusy}>
              {pwBusy ? '바꾸는 중…' : '바꾸기'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={delOpen}
        onClose={() => !delBusy && setDelOpen(false)}
        title="정말 탈퇴할까요?"
        alert
        initialFocusRef={delInputRef}
      >
        <form onSubmit={(e) => void submitDelete(e)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
            만든 데모{projectCount ? ` ${projectCount}개` : ''}와 배포된 링크, 받은 피드백이 모두 지워지고 되돌릴 수 없어요.
          </p>
          {delError && (
            <div role="alert" className="dm-alert dm-alert--error">
              {delError}
            </div>
          )}
          <TextField
            ref={delInputRef}
            id="delete-confirm"
            label={`확인을 위해 "${DELETE_WORD}"를 입력해 주세요`}
            type="text"
            autoComplete="off"
            value={delWord}
            onChange={(e) => setDelWord(e.target.value)}
          />
          <div className="dm-dialog__actions" style={{ marginTop: 4 }}>
            <Button onClick={() => setDelOpen(false)} disabled={delBusy}>
              취소
            </Button>
            <Button type="submit" variant="danger" disabled={delWord.trim() !== DELETE_WORD || delBusy}>
              {delBusy ? '탈퇴하는 중…' : '탈퇴하기'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Toast message={toast} onDone={() => setToast('')} placement="top" />
    </div>
  );
}

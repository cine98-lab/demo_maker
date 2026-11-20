import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ROUTES } from '../routes.ts';
import { Button, ButtonLink, Card, Dialog, Switch, TextField, Toast } from '../components';
import { PageError, PageLoading } from '../components/StatusViews.tsx';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { Starfield } from '../animation/Starfield.tsx';
import { useProject } from '../lib/useProject.ts';
import { isValidSlug, normalizeSlug, publicUrl, publishProject, suggestSlug, unpublishProject } from '../lib/api.ts';
import { toAppError } from '../lib/supabase.ts';
import { downloadQrPng, qrMatrix, qrSvgPath } from '../lib/publish/qr.ts';
import type { Project, Visibility } from '../lib/types.ts';
import './Published.css';

const SCOPES: readonly { id: Visibility; label: string; hint: string }[] = [
  { id: 'public', label: '전체 공개', hint: '주소를 아는 누구나 볼 수 있어요' },
  { id: 'link', label: '링크가 있는 사람만', hint: '링크를 받은 사람만 찾아올 수 있어요' },
  { id: 'password', label: '비밀번호 보호', hint: '비밀번호를 아는 사람만 볼 수 있어요' },
];

const gold = 'var(--star-gold)';
const pink = 'var(--dawn-pink)';

/** 배경의 작은 별 */
const BG_STARS: readonly { cx: number; cy: number; r: number }[] = [
  { cx: 20, cy: 30, r: 1.5 },
  { cx: 140, cy: 12, r: 1 },
  { cx: 380, cy: 20, r: 1.5 },
  { cx: 500, cy: 60, r: 1 },
  { cx: 30, cy: 150, r: 1 },
  { cx: 470, cy: 150, r: 1.5 },
  { cx: 260, cy: 160, r: 1 },
];

/** 별자리의 별 */
const STARS: readonly { cx: number; cy: number; r: number }[] = [
  { cx: 60, cy: 120, r: 6 },
  { cx: 140, cy: 70, r: 8 },
  { cx: 220, cy: 95, r: 6 },
  { cx: 300, cy: 45, r: 11 },
  { cx: 380, cy: 85, r: 7 },
  { cx: 460, cy: 60, r: 6 },
  { cx: 250, cy: 145, r: 5 },
  { cx: 410, cy: 140, r: 5 },
];

/** 입력 중에는 하이픈을 지우지 않는 가벼운 정리 (끝의 하이픈은 저장할 때 normalizeSlug 가 정리) */
function slugInput(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40);
}

function Constellation({ dim }: { dim?: boolean }) {
  return (
    <svg data-speed="clamp(1.2)" viewBox="0 0 520 170" style={{ width: '100%', maxWidth: 520, height: 'auto', opacity: dim ? 0.55 : 1 }} aria-hidden="true">
      <g fill="var(--ink-on-night)" opacity="0.35">
        {BG_STARS.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
        ))}
      </g>
      <polyline points="60,120 140,70 220,95 300,45 380,85 460,60" fill="none" stroke={pink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dim ? '4 6' : undefined} />
      <line x1="220" y1="95" x2="250" y2="145" stroke={pink} strokeWidth="1.5" strokeLinecap="round" strokeDasharray={dim ? '4 6' : undefined} />
      <line x1="380" y1="85" x2="410" y2="140" stroke={pink} strokeWidth="1.5" strokeLinecap="round" strokeDasharray={dim ? '4 6' : undefined} />
      <circle cx="300" cy="45" r="34" fill={gold} opacity="0.12" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={gold} />
      ))}
    </svg>
  );
}

export default function Published() {
  const { id, project, setProject, loading, error, reload } = useProject();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');

  // 화면 상태(설정 폼 ↔ 배포 완료)가 바뀔 때마다 등장 애니메이션을 다시
  const view = !project ? 'none' : project.status === 'published' && !editing ? 'done' : 'form';
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollMotion(rootRef, [view]);

  return (
    <div
      ref={rootRef}
      className="published-page"
      style={{ position: 'relative', overflow: 'hidden', color: 'var(--ink-on-night)', background: 'var(--night-900)', minHeight: '100vh' }}
    >
      <Starfield seed={31} gold={3} />
      <div
        style={{
          position: 'relative',
          maxWidth: 1120,
          margin: '0 auto',
          padding: '48px 24px 64px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {loading && !project ? (
          <PageLoading label="배포 정보를 불러오는 중이에요" />
        ) : error || !project ? (
          <div className="published-error" style={{ width: '100%', maxWidth: 560, background: 'var(--surface-raised)', color: 'var(--ink)', borderRadius: 20 }}>
            <PageError message={error ?? '프로젝트를 찾을 수 없어요.'} onRetry={reload} />
          </div>
        ) : view === 'done' ? (
          <PublishedDone
            project={project}
            onEdit={() => setEditing(true)}
            onUnpublished={(p) => {
              setProject(p);
              setToast('배포를 멈췄어요. 이제 링크로 데모를 볼 수 없어요');
            }}
            onToast={setToast}
          />
        ) : (
          <PublishForm
            key={`${project.id}-${project.status}`}
            id={id}
            project={project}
            canCancel={project.status === 'published'}
            onCancel={() => setEditing(false)}
            onPublished={(p, first) => {
              setProject(p);
              setEditing(false);
              setToast(first ? '배포했어요! 링크를 나눠 보세요' : '배포 설정을 바꿨어요');
            }}
          />
        )}
      </div>
      <Toast message={toast} onDone={() => setToast('')} duration={3500} />
    </div>
  );
}

function PublishForm({
  id,
  project,
  canCancel,
  onCancel,
  onPublished,
}: {
  id: string;
  project: Project;
  canCancel: boolean;
  onCancel: () => void;
  onPublished: (p: Project, first: boolean) => void;
}) {
  const [slug, setSlug] = useState(() => project.slug ?? suggestSlug(project.name));
  const [scope, setScope] = useState<Visibility>(project.visibility);
  const [password, setPassword] = useState('');
  const [feedbackOn, setFeedbackOn] = useState(project.feedback_enabled);
  const [busy, setBusy] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [pwError, setPwError] = useState('');
  const [formError, setFormError] = useState('');

  const hasPassword = Boolean(project.password_hash);
  const finalSlug = normalizeSlug(slug);
  const first = project.status !== 'published';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSlugError('');
    setPwError('');
    setFormError('');
    if (!isValidSlug(finalSlug)) {
      setSlugError('주소는 영어 소문자, 숫자, 하이픈(-)으로 3~40자로 정해 주세요.');
      return;
    }
    if (scope === 'password') {
      if (!password && !hasPassword) {
        setPwError('비밀번호를 입력해 주세요.');
        return;
      }
      if (password && password.length < 4) {
        setPwError('비밀번호는 4자 이상으로 정해 주세요.');
        return;
      }
    }
    setBusy(true);
    try {
      const p = await publishProject(id, { slug: finalSlug, visibility: scope, feedback_enabled: feedbackOn, password: scope === 'password' ? password || null : null });
      onPublished(p, first);
    } catch (err) {
      const ae = toAppError(err);
      if (ae.code === 'slug_taken' || ae.code === 'slug_invalid' || ae.code === 'duplicate') setSlugError(ae.code === 'duplicate' ? '이미 다른 데모가 쓰고 있는 주소예요. 다른 주소를 입력해 주세요.' : ae.message);
      else if (ae.code === 'password_too_short' || ae.code === 'password_required') setPwError(ae.message);
      else setFormError(ae.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <Constellation dim />
        <p data-intro="1" style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', color: pink }}>
          {first ? '배포 준비' : '배포 설정'}
        </p>
        <h1 data-intro="2" style={{ margin: 0, fontSize: 36, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.02em', textWrap: 'balance' }}>
          {first ? (
            <>
              <span style={{ color: gold }}>{project.name}</span>을(를)
              <br />
              밤하늘에 띄워볼까요?
            </>
          ) : (
            '배포 설정 바꾸기'
          )}
        </h1>
        <p data-intro="2" style={{ margin: 0, fontSize: 15, color: '#d8d5ef' }}>
          주소와 공개 범위를 정하면 바로 링크로 나눌 수 있어요.
        </p>
      </div>

      <Card
        as="form"
        data-intro="3"
        aria-label="배포 설정"
        aria-busy={busy}
        onSubmit={submit}
        gap={22}
        style={{
          width: '100%',
          maxWidth: 640,
          boxSizing: 'border-box',
          color: 'var(--ink)',
          border: 0,
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 0 48px rgba(255, 214, 107, 0.18)',
        }}
      >
        <TextField
          label="데모 주소"
          id="slug"
          type="text"
          inputMode="url"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          value={slug}
          onChange={(e) => {
            setSlug(slugInput(e.target.value));
            setSlugError('');
          }}
          onBlur={() => setSlug(finalSlug)}
          hint={
            <>
              영어 소문자, 숫자, 하이픈(-)으로 3~40자 ·{' '}
              <span style={{ color: 'var(--ink)', fontWeight: 600, overflowWrap: 'anywhere' }}>{publicUrl(finalSlug || '…')}</span>
            </>
          }
          error={slugError || undefined}
          disabled={busy}
        />

        <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: 10 }} disabled={busy}>
          <legend style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>공개 범위</legend>
          {SCOPES.map((s) => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 15, cursor: 'pointer' }}>
              <input type="radio" name="scope" value={s.id} checked={scope === s.id} onChange={() => setScope(s.id)} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {s.label}
                <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{s.hint}</span>
              </span>
            </label>
          ))}
          {scope === 'password' && (
            <TextField
              label="데모 비밀번호"
              id="demo-pw"
              type="password"
              autoComplete="new-password"
              placeholder={hasPassword ? '변경하려면 입력' : '4자 이상'}
              hint={hasPassword ? '비워 두면 지금 비밀번호를 그대로 써요' : '방문자에게 이 비밀번호를 함께 알려 주세요'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPwError('');
              }}
              error={pwError || undefined}
              fieldStyle={{ marginLeft: 26, marginTop: 4 }}
            />
          )}
        </fieldset>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 18, borderTop: '1px solid #f0efea' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span id="fb-label" style={{ fontSize: 14, fontWeight: 700 }}>
              피드백 받기
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>방문자가 화면에 별(핀)을 남길 수 있어요</span>
          </div>
          <Switch checked={feedbackOn} onChange={setFeedbackOn} aria-labelledby="fb-label" disabled={busy} />
        </div>

        {formError && (
          <p className="dm-alert dm-alert--error" role="alert" style={{ margin: 0 }}>
            {formError}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
          {canCancel ? (
            <Button variant="secondary" size="lg" onClick={onCancel} disabled={busy}>
              취소
            </Button>
          ) : (
            <ButtonLink to={ROUTES.editor(id)} variant="secondary" size="lg">
              에디터로 돌아가기
            </ButtonLink>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={busy}>
            {busy ? '배포하는 중…' : first ? '배포하기' : '설정 저장'}
          </Button>
        </div>
      </Card>
    </>
  );
}

function PublishedDone({
  project,
  onEdit,
  onUnpublished,
  onToast,
}: {
  project: Project;
  onEdit: () => void;
  onUnpublished: (p: Project) => void;
  onToast: (msg: string) => void;
}) {
  const slug = project.slug ?? '';
  const url = publicUrl(slug);
  const linkRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState('');

  const qr = useMemo(() => {
    try {
      return qrMatrix(url);
    } catch {
      return null;
    }
  }, [url]);
  const qrPath = useMemo(() => (qr ? qrSvgPath(qr) : null), [qr]);

  useEffect(() => {
    setStopError('');
  }, [confirmOpen]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      onToast('링크를 복사했어요');
    } catch {
      // 클립보드 권한이 없으면 글자를 선택해 두고 직접 복사하도록
      linkRef.current?.select();
      onToast('링크를 선택해 두었어요. Ctrl+C 로 복사해 주세요');
    }
  };

  const stop = async () => {
    setStopping(true);
    setStopError('');
    try {
      const p = await unpublishProject(project.id);
      setConfirmOpen(false);
      onUnpublished(p);
    } catch (e) {
      setStopError(toAppError(e).message);
    } finally {
      setStopping(false);
    }
  };

  const scopeLabel = SCOPES.find((s) => s.id === project.visibility)?.label ?? '';

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <Constellation />
        <p data-intro="1" style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', color: pink }}>
          배포 완료
        </p>
        <h1 data-intro="2" style={{ margin: 0, fontSize: 40, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.02em', textWrap: 'balance' }}>
          이제 다른 사람들도
          <br />
          당신의 꿈을 볼 수 있어요
        </h1>
      </div>

      <Card
        data-intro="3"
        aria-label="공유하기"
        gap={28}
        style={{
          width: '100%',
          maxWidth: 760,
          boxSizing: 'border-box',
          color: 'var(--ink)',
          border: 0,
          borderRadius: 20,
          padding: 28,
          flexDirection: 'row',
          flexWrap: 'wrap',
          boxShadow: '0 0 48px rgba(255, 214, 107, 0.18)',
        }}
      >
        <div style={{ flex: '999 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8 }}>
            <TextField
              ref={linkRef}
              label="공유 링크"
              id="share-url"
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              fieldStyle={{ flex: '1 1 220px' }}
            />
            <Button variant="primary" size="lg" onClick={() => void copyLink()}>
              복사
            </Button>
          </div>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 16px', fontSize: 15 }}>
            <dt style={{ fontWeight: 700, fontSize: 14 }}>공개 범위</dt>
            <dd style={{ margin: 0 }}>
              {scopeLabel}
              {project.visibility === 'password' && <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}> · 방문자에게 비밀번호도 알려 주세요</span>}
            </dd>
            <dt style={{ fontWeight: 700, fontSize: 14 }}>피드백</dt>
            <dd style={{ margin: 0 }}>{project.feedback_enabled ? '받는 중' : '받지 않음'}</dd>
          </dl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 18, borderTop: '1px solid #f0efea' }}>
            <Button variant="secondary" onClick={onEdit}>
              배포 설정 바꾸기
            </Button>
            <ButtonLink to={ROUTES.feedback(project.id)} variant="ghost">
              받은 피드백 보기
            </ButtonLink>
            <Button variant="danger-text" onClick={() => setConfirmOpen(true)} style={{ marginLeft: 'auto' }}>
              배포 중단
            </Button>
          </div>
        </div>
        <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {qrPath ? (
            <svg
              role="img"
              aria-label={`데모 주소 QR 코드: ${url}`}
              viewBox={`0 0 ${qrPath.size} ${qrPath.size}`}
              shapeRendering="crispEdges"
              style={{ width: 168, height: 168, borderRadius: 12, border: '1px solid var(--line)', background: '#ffffff', display: 'block' }}
            >
              <path d={qrPath.path} fill="#141b3a" />
            </svg>
          ) : (
            <div
              role="img"
              aria-label="QR 코드를 만들 수 없어요"
              style={{ width: 168, height: 168, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--ink-muted)' }}
            >
              QR 코드
            </div>
          )}
          <Button
            disabled={!qr}
            onClick={() => {
              if (!qr) return;
              try {
                downloadQrPng(qr, `${slug}-qr.png`);
              } catch (e) {
                onToast(toAppError(e).message);
              }
            }}
          >
            이미지 저장
          </Button>
        </div>
      </Card>

      <div data-intro="4" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
        <ButtonLink to={ROUTES.site(slug)} target="_blank" rel="noopener" variant="primary" size="lg">
          데모 열기 ↗
        </ButtonLink>
        <ButtonLink to={ROUTES.dashboard} variant="violet" size="lg">
          대시보드로
        </ButtonLink>
        <ButtonLink to={ROUTES.editor(project.id)} variant="ghost" size="lg" style={{ color: gold, fontSize: 15, padding: '0 18px' }}>
          계속 편집하기 →
        </ButtonLink>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!stopping) setConfirmOpen(false);
        }}
        alert
        title="배포를 멈출까요?"
        initialFocusRef={cancelRef}
        actions={
          <>
            <Button ref={cancelRef} variant="secondary" onClick={() => setConfirmOpen(false)} disabled={stopping}>
              취소
            </Button>
            <Button variant="danger" onClick={() => void stop()} disabled={stopping}>
              {stopping ? '멈추는 중…' : '배포 중단'}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-muted)' }}>
          <b style={{ color: 'var(--ink)' }}>{url}</b> 로 들어오는 사람은 더 이상 데모를 볼 수 없어요. 받은 피드백은 그대로 남고, 언제든 다시 배포할 수 있어요.
        </p>
        {stopError && (
          <p className="dm-alert dm-alert--error" role="alert" style={{ margin: '12px 0 0' }}>
            {stopError}
          </p>
        )}
      </Dialog>
    </>
  );
}

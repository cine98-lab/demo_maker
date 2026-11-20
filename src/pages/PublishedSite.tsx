import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { Button, ButtonLink, Card, LogoMark, TextField } from '../components';
import { ConfigNotice, PageLoading } from '../components/StatusViews.tsx';
import { Starfield } from '../animation/Starfield.tsx';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { getPublishedSite, submitFeedback, toggleLike } from '../lib/api.ts';
import { recallDemoPassword, rememberDemoPassword, visitorId } from '../lib/draft.ts';
import { isSupabaseConfigured, toAppError } from '../lib/supabase.ts';
import type { PublishedSite as PublishedData, SiteSpec } from '../lib/types.ts';
import { DemoShell } from '../site/DemoShell.tsx';

type Loaded = Extract<PublishedData, { locked: false }>;

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'missing' }
  | { kind: 'locked'; name: string }
  | { kind: 'ok'; data: Loaded };

/** 사용자가 배포한 데모 (/p/:slug). 로그인 없이 누구나 본다. */
export default function PublishedSite() {
  const { slug = '' } = useParams<{ slug: string }>();
  if (!isSupabaseConfigured) return <ConfigNotice />;
  return <PublishedSiteView key={slug} slug={slug.toLowerCase()} />;
}

function PublishedSiteView({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [password, setPassword] = useState<string | null>(() => recallDemoPassword(slug));
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => (s.kind === 'ok' ? s : { kind: 'loading' }));
    getPublishedSite(slug, password, visitorId())
      .then((r) => {
        if (!alive) return;
        if (!r) setState({ kind: 'missing' });
        else if (r.locked) setState({ kind: 'locked', name: r.name });
        else setState({ kind: 'ok', data: r });
      })
      .catch((e) => {
        if (alive) setState({ kind: 'error', message: toAppError(e).message });
      });
    return () => {
      alive = false;
    };
    // password 는 잠금 화면이 직접 확인한 뒤 바꾼다 (여기서 다시 부르지 않게 nonce 만 본다)
  }, [slug, nonce]);

  // 잘못 기억된 비밀번호는 지운다
  useEffect(() => {
    if (state.kind === 'locked' && password) {
      rememberDemoPassword(slug, null);
      setPassword(null);
    }
  }, [state.kind, password, slug]);

  const title = state.kind === 'ok' ? state.data.site.brand : state.kind === 'locked' ? state.name : '';
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = `${title} · 데모메이커`;
    return () => {
      document.title = prev;
    };
  }, [title]);

  if (state.kind === 'loading') return <PageLoading label="데모를 불러오는 중이에요" />;
  if (state.kind === 'missing') return <DemoMissing />;
  if (state.kind === 'error')
    return (
      <NightCenter>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>데모를 열지 못했어요</h1>
        <p role="alert" style={{ margin: 0, color: 'var(--dawn-pink)', lineHeight: 1.6 }}>
          {state.message}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="primary" onClick={() => setNonce((n) => n + 1)}>
            다시 시도
          </Button>
          <ButtonLink to={ROUTES.main} variant="violet">
            처음으로
          </ButtonLink>
        </div>
      </NightCenter>
    );
  if (state.kind === 'locked')
    return (
      <PasswordGate
        slug={slug}
        name={state.name}
        onUnlocked={(pw, data) => {
          rememberDemoPassword(slug, pw);
          setPassword(pw);
          setState({ kind: 'ok', data });
        }}
      />
    );
  return <LiveDemo slug={slug} password={password} data={state.data} />;
}

function LiveDemo({ slug, password, data }: { slug: string; password: string | null; data: Loaded }) {
  const site: SiteSpec = data.site;
  const [page, setPage] = useState(site.pages[0]?.id ?? 'home');
  const [likes, setLikes] = useState(data.likes);
  const [liked, setLiked] = useState(data.liked);
  const busy = useRef(false);

  const onToggleLike = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    const prevLiked = liked;
    const prevLikes = likes;
    // 먼저 화면에 반영하고, 실패하면 되돌린다
    setLiked(!prevLiked);
    setLikes(prevLikes + (prevLiked ? -1 : 1));
    toggleLike(slug, password, visitorId())
      .then((r) => {
        setLiked(r.liked);
        setLikes(r.count);
      })
      .catch(() => {
        setLiked(prevLiked);
        setLikes(prevLikes);
      })
      .finally(() => {
        busy.current = false;
      });
  }, [liked, likes, slug, password]);

  return (
    <DemoShell
      site={site}
      pageId={page}
      onNavigate={setPage}
      feedbackEnabled={data.feedback_enabled}
      likes={likes}
      liked={liked}
      onToggleLike={onToggleLike}
      onSubmitFeedback={async (fb) => {
        await submitFeedback({ slug, password, ...fb });
      }}
    />
  );
}

function PasswordGate({ slug, name, onUnlocked }: { slug: string; name: string; onUnlocked: (pw: string, data: Loaded) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await getPublishedSite(slug, value, visitorId());
      if (!r) setError('데모를 찾을 수 없어요. 주소를 다시 확인해 주세요.');
      else if (r.locked) setError('비밀번호가 맞지 않아요.');
      else onUnlocked(value, r);
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <NightCenter>
      <Card as="div" gap={18} style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box', color: 'var(--ink)', textAlign: 'left', padding: 28, borderRadius: 20 }}>
        <LogoMark size={32} dark />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>비밀번호가 필요한 데모예요</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            <b style={{ color: 'var(--ink)' }}>{name}</b>을(를) 보려면 만든 사람에게 받은 비밀번호를 입력해 주세요.
          </p>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-busy={busy}>
          <TextField
            id="demo-password"
            label="비밀번호"
            type="password"
            autoComplete="off"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={error || undefined}
            disabled={busy}
          />
          <Button type="submit" variant="primary" size="lg" block disabled={busy}>
            {busy ? '확인하는 중…' : '데모 열기'}
          </Button>
        </form>
      </Card>
    </NightCenter>
  );
}

function DemoMissing() {
  return (
    <NightCenter>
      <h1 data-intro="0" style={{ margin: 0, fontSize: 32 }}>
        데모를 찾을 수 없어요
      </h1>
      <p data-intro="1" style={{ margin: 0, color: 'var(--dawn-pink)', lineHeight: 1.6 }}>
        주소가 바뀌었거나, 만든 사람이 배포를 멈췄을 수 있어요.
      </p>
      <ButtonLink data-intro="2" to={ROUTES.main} variant="primary" size="lg" style={{ marginTop: 8 }}>
        처음으로 돌아가기 →
      </ButtonLink>
    </NightCenter>
  );
}

function NightCenter({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  useScrollMotion(rootRef);
  return (
    <main
      ref={rootRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        background: 'var(--night-900)',
        color: 'var(--ink-on-night)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      <Starfield seed={77} gold={2} />
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>{children}</div>
    </main>
  );
}

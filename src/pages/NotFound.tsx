import { useRef } from 'react';
import { ROUTES } from '../routes.ts';
import { ButtonLink } from '../components';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { Starfield } from '../animation/Starfield.tsx';

export default function NotFound() {
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
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <Starfield seed={404} gold={1} />
      <h1 data-intro="0" style={{ position: 'relative', margin: 0, fontSize: 32 }}>
        길을 잃은 별이에요
      </h1>
      <p data-intro="1" style={{ position: 'relative', margin: 0, color: 'var(--dawn-pink)' }}>
        찾으시는 화면이 없어요.
      </p>
      <ButtonLink data-intro="2" to={ROUTES.main} variant="primary" size="lg" style={{ position: 'relative', marginTop: 8 }}>
        처음으로 돌아가기 →
      </ButtonLink>
    </main>
  );
}

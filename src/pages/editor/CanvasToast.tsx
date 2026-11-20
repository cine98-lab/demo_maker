import { useEffect, useRef } from 'react';

/** 기기 틀(캔버스) 안에 잠깐 뜨는 알림. 가짜 동작을 눌렀을 때 (에디터, 미리보기 공통) */
export function CanvasToast({ message, onDone, duration = 2600 }: { message: string; onDone: () => void; duration?: number }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = window.setTimeout(() => done.current(), duration);
    return () => window.clearTimeout(t);
  }, [message, duration]);
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        maxWidth: 'calc(100% - 32px)',
        padding: '10px 14px',
        borderRadius: 10,
        background: 'var(--night-900)',
        color: 'var(--ink-on-night)',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxSizing: 'border-box',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--star-gold)', flex: 'none' }} />
      {message}
    </div>
  );
}

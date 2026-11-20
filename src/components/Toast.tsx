import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx.ts';
import { Portal } from './Portal.tsx';

export type ToastProps = {
  /** null/빈 문자열이면 숨김 */
  message: ReactNode;
  /** 자동으로 사라질 때 호출 (여기서 상태를 비운다) */
  onDone: () => void;
  /** ms. 0 이면 자동으로 사라지지 않음 */
  duration?: number;
  placement?: 'bottom' | 'top';
  /** 화면 끝에서 떨어진 거리(px). 기본 bottom 32 / top 84. 하단 고정 바가 있으면 그 높이만큼 올린다 */
  offset?: number;
  className?: string;
};

/** 화면 아래(또는 위)에 잠깐 뜨는 알림. 금색 별 점 + 문장. role="status". */
export function Toast({ message, onDone, duration = 3000, placement = 'bottom', offset, className }: ToastProps) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!message || !duration) return;
    const t = window.setTimeout(() => done.current(), duration);
    return () => window.clearTimeout(t);
  }, [message, duration]);

  if (!message) return null;
  return (
    <Portal>
    <div
      role="status"
      className={cx('dm-toast', placement === 'top' && 'dm-toast--top', className)}
      style={offset !== undefined ? ({ '--dm-toast-offset': `${offset}px` } as CSSProperties) : undefined}
    >
      <span className="dm-toast__star" aria-hidden="true" />
      {message}
    </div>
    </Portal>
  );
}

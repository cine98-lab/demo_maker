import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx.ts';

export type BadgeTone = 'coral' | 'success' | 'neutral' | 'night' | 'gold' | 'violet';

/** 분류, 상태 꼬리표. 예: 쇼핑몰, 배포됨, 새 피드백 3 */
export function Badge({ tone = 'neutral', children, className, style }: { tone?: BadgeTone; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx('dm-badge', `dm-badge--${tone}`, className)} style={style}>
      {children}
    </span>
  );
}

export type StatusTone = 'success' | 'muted' | 'danger' | 'gold';

/** 점 + 글자 상태 표시. 예: ● 연결됨, ● 배포됨 */
export function StatusLabel({ tone = 'success', children, className }: { tone?: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('dm-status', `dm-status--${tone}`, className)}>
      <span className="dm-status__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

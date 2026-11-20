import type { CSSProperties } from 'react';
import { cx } from './cx.ts';

export type ProgressBarProps = {
  /** 0~100 */
  value: number;
  /** 스크린리더용 이름. 화면에 같은 글자가 보이면 생략하고 decorative 를 쓴다. */
  label?: string;
  /** 보이는 숫자 글자가 따로 있어 막대가 장식일 때 */
  decorative?: boolean;
  /** 막대 색 (기본 코랄). CSS 색 또는 변수 */
  color?: string;
  height?: number;
  night?: boolean;
  className?: string;
};

export function ProgressBar({ value, label, decorative, color, height, night, className }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value));
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(v) };
  return (
    <span
      className={cx('dm-progress', night && 'dm-progress--night', className)}
      style={{ ...(height ? { height } : null), ...(color ? ({ '--dm-progress-color': color } as CSSProperties) : null) }}
      {...a11y}
    >
      <span className="dm-progress__bar" style={{ width: `${v}%` }} />
    </span>
  );
}

import { cx } from './cx.ts';

/** 이름 첫 글자 원형 아바타. ring: 금색 테두리(내 계정 강조). */
export function Avatar({ name, size = 36, ring, label, className }: { name: string; size?: number; ring?: boolean; label?: string; className?: string }) {
  return (
    <span
      className={cx('dm-avatar', ring && 'dm-avatar--ring', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
    >
      {name.slice(0, 1)}
    </span>
  );
}

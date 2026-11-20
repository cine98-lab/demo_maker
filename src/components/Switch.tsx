import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx.ts';

export type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 보이는 라벨이 없을 때만. 보이는 라벨이 있으면 aria-labelledby 로 연결한다. */
  label?: string;
};

/** 켜고 끄는 스위치 (role="switch"). 켜짐: 밤하늘 바탕 + 금색 별. */
export function Switch({ checked, onChange, label, className, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cx('dm-switch', className)}
      onClick={() => onChange(!checked)}
      {...rest}
    >
      <span className="dm-switch__knob" />
    </button>
  );
}

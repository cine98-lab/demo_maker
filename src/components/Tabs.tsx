import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from './cx.ts';

export type TabItem<T extends string> = { id: T; label: ReactNode; count?: number };

export type TabsProps<T extends string> = {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  /** 탭 묶음의 이름 (aria-label) */
  label: string;
  /** underline: 페이지 탭 · pill: 작은 전환 · chip: 필터 칩 */
  variant?: 'underline' | 'pill' | 'chip';
  /** 탭이 폭을 똑같이 나눠 갖는다 (로그인/회원가입 전환, 좁은 패널) */
  fill?: boolean;
  /** 좁은 패널용 작은 크기 */
  size?: 'sm' | 'md';
  className?: string;
  /** 탭 패널 id 접두사. 주면 aria-controls 를 `${idPrefix}-${id}` 로 연결한다. */
  idPrefix?: string;
};

/** 탭 목록. 좌우 화살표/Home/End 로 이동한다. 패널은 화면에서 직접 그린다. */
export function Tabs<T extends string>({ items, value, onChange, label, variant = 'underline', fill, size = 'md', className, idPrefix }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={cx('dm-tabs', `dm-tabs--${variant}`, fill && 'dm-tabs--fill', size === 'sm' && 'dm-tabs--sm', className)} onKeyDown={onKeyDown}>
      {items.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${t.id}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-${t.id}` : undefined}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className="dm-tab"
            onClick={() => onChange(t.id)}
          >
            {t.label}
            {t.count !== undefined && <span className="dm-tab__count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

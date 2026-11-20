import { useId } from 'react';
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx.ts';

export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  /** 기본 section. 제목이 있으면 aria-labelledby 가 자동으로 연결된다. */
  as?: ElementType;
  title?: ReactNode;
  /** 제목 오른쪽 영역 (버튼 등) */
  actions?: ReactNode;
  /** 안쪽 여백 없이 (이미지 카드 등) */
  flush?: boolean;
  night?: boolean;
  gap?: CSSProperties['gap'];
};

/** 흰 면 + 테두리 카드. 설정 섹션, 패널, 목록 카드에 쓴다. */
export function Card({ as: Tag = 'section', title, actions, flush, night, gap, className, style, children, ...rest }: CardProps) {
  const titleId = useId();
  return (
    <Tag
      aria-labelledby={title ? titleId : undefined}
      className={cx('dm-card', flush && 'dm-card--flush', night && 'dm-card--night', className)}
      style={gap !== undefined ? { gap, ...style } : style}
      {...rest}
    >
      {(title || actions) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {title && (
            <h2 id={titleId} className="dm-card__title">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </Tag>
  );
}

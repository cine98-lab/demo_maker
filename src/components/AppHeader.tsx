import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import LogoMark from './LogoMark.tsx';
import { cx } from './cx.ts';

export type BrandProps = {
  /** 이동할 경로. 없으면 링크가 아닌 글자로 그린다 (진행 중 화면 등) */
  to?: string;
  night?: boolean;
  size?: number;
  /** 키보드 순서에서 뺄 때 -1 (같은 링크가 화면에 또 있을 때) */
  tabIndex?: number;
  className?: string;
};

/** 로고 + "데모메이커" 글자. night: 밤하늘 바탕용 */
export function Brand({ to, night, size = 26, tabIndex, className }: BrandProps) {
  const cls = cx('dm-brand', night && 'dm-brand--night', className);
  const body = (
    <>
      <LogoMark size={size} dark={!night} />
      데모메이커
    </>
  );
  if (!to) return <span className={cls}>{body}</span>;
  return (
    <Link to={to} className={cls} tabIndex={tabIndex}>
      {body}
    </Link>
  );
}

export type AppHeaderProps = {
  /** 로고가 가리킬 경로 */
  brandTo: string;
  /** 로고 옆에 붙는 것 (프로젝트 이름, 뒤로가기 등) */
  left?: ReactNode;
  /** 오른쪽 영역 (메뉴, 버튼) */
  right?: ReactNode;
  /** 로고 자리를 통째로 바꿀 때 */
  brand?: ReactNode;
  night?: boolean;
  maxWidth?: CSSProperties['maxWidth'];
  sticky?: boolean;
};

/** 상단 바. 작업 화면(대시보드·에디터·설정 등)과 밤하늘 화면 모두에 쓴다. */
export function AppHeader({ brandTo, left, right, brand, night, maxWidth, sticky }: AppHeaderProps) {
  return (
    <header className={cx('dm-appbar', night && 'dm-appbar--night')} style={sticky ? { position: 'sticky', top: 0, zIndex: 20 } : undefined}>
      <div className="dm-appbar__inner" style={maxWidth ? { maxWidth } : undefined}>
        <div className="dm-appbar__side">
          {brand ?? <Brand to={brandTo} night={night} />}
          {left}
        </div>
        {right && <div className="dm-appbar__side">{right}</div>}
      </div>
    </header>
  );
}

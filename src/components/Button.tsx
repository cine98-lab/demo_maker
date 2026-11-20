import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import { cx } from './cx.ts';

export type ButtonVariant =
  | 'primary'
  | 'soft'
  | 'secondary'
  | 'night'
  | 'violet'
  | 'ghost'
  | 'danger'
  | 'danger-outline'
  | 'danger-text'
  | 'success-text'
  | 'kakao'
  | 'naver';
export type ButtonSize = 'sm' | 'md' | 'lg';

type StyleProps = {
  /**
   * primary: 코랄 주요 행동 · soft: 연한 코랄 보조 강조 · secondary: 흰 면+테두리 · night: 밤하늘
   * violet: 밤하늘 위 보조 · ghost: 글자만 · danger / danger-outline / danger-text: 삭제 계열
   * success-text: 완료 처리 글자 버튼 · kakao / naver: 소셜 로그인
   */
  variant?: ButtonVariant;
  /** sm 34px · md 40px · lg 48px */
  size?: ButtonSize;
  pill?: boolean;
  block?: boolean;
  /** 아이콘만 있는 정사각 버튼 (aria-label 필수) */
  square?: boolean;
  /** 글자 앞에 붙는 아이콘 (장식용) */
  icon?: ReactNode;
};

export function buttonClass({ variant = 'secondary', size = 'md', pill, block, square }: StyleProps, extra?: string) {
  return cx(
    'dm-btn',
    `dm-btn--${variant}`,
    `dm-btn--${size}`,
    pill && 'dm-btn--pill',
    block && 'dm-btn--block',
    square && 'dm-btn--square',
    extra,
  );
}

export type ButtonProps = StyleProps & ButtonHTMLAttributes<HTMLButtonElement>;

/** 동작 버튼. 화면 이동이면 ButtonLink 를 쓴다. ref 는 <button> 으로 전달된다. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, pill, block, square, icon, className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass({ variant, size, pill, block, square }, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export type ButtonLinkProps = StyleProps & LinkProps;

/** 버튼처럼 보이는 화면 이동 링크. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant, size, pill, block, square, icon, className, children, ...rest },
  ref,
) {
  return (
    <Link ref={ref} className={buttonClass({ variant, size, pill, block, square }, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
});

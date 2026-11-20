import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * document.body 에 바로 그린다.
 * 부드러운 스크롤(ScrollSmoother) 안의 요소는 화면과 함께 움직이므로,
 * 화면에 고정돼야 하는 모달·토스트·하단 바는 이걸로 감싼다.
 */
export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

import { useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { cx } from './cx.ts';
import { Portal } from './Portal.tsx';
import { pauseSmoothScroll } from '../animation/SmoothScroll.tsx';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** 제목 (aria-labelledby 로 연결). titleHidden 이면 스크린리더에만 */
  title: ReactNode;
  titleHidden?: boolean;
  children?: ReactNode;
  /** 버튼 줄 */
  actions?: ReactNode;
  /** alert: 되돌릴 수 없는 확인 (role="alertdialog") */
  alert?: boolean;
  /** lg: 미리보기처럼 넓은 창 (안쪽 여백 없음, 내용이 직접 배치) */
  size?: 'md' | 'lg';
  /** 열릴 때 포커스할 요소. 없으면 창 자체 */
  initialFocusRef?: RefObject<HTMLElement>;
  /**
   * 주면 제목이 위쪽 머리줄(구분선 있음)에 들어간다. 큰 창(lg)용.
   * lead: 제목 옆에 붙는 것(배지 등) · actions: 머리줄 오른쪽(기기 전환, 닫기 등)
   */
  header?: { lead?: ReactNode; actions?: ReactNode };
  /** 바깥(어두운 영역) 클릭으로 닫기. 기본 true */
  closeOnOverlay?: boolean;
  className?: string;
};

/** 모달 창. Esc/바깥 클릭으로 닫히고, 닫히면 열기 전 포커스로 돌아가며, Tab 이 창 안에서만 돈다. */
export function Dialog({
  open,
  onClose,
  title,
  titleHidden,
  children,
  actions,
  alert,
  size = 'md',
  initialFocusRef,
  header,
  closeOnOverlay = true,
  className,
}: DialogProps) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? boxRef.current)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    pauseSmoothScroll(true);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current();
        return;
      }
      if (e.key !== 'Tab' || !boxRef.current) return;
      const f = boxRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      pauseSmoothScroll(false);
      prev?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;
  return (
    <Portal>
    <div
      className="dm-overlay"
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={boxRef}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx('dm-dialog', size === 'lg' && 'dm-dialog--lg', className)}
      >
        {header ? (
          <div className="dm-dialog__header">
            <div className="dm-dialog__header-lead">
              <h2 id={titleId} className={titleHidden ? 'sr-only' : 'dm-dialog__title'}>
                {title}
              </h2>
              {header.lead}
            </div>
            {header.actions}
          </div>
        ) : (
          <h2 id={titleId} className={titleHidden ? 'sr-only' : 'dm-dialog__title'}>
            {title}
          </h2>
        )}
        {children}
        {actions && <div className="dm-dialog__actions">{actions}</div>}
      </div>
    </div>
    </Portal>
  );
}

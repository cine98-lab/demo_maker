import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { Avatar } from './Avatar.tsx';
import './UserMenu.css';

const itemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 14px',
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--ink)',
  font: 'inherit',
  fontSize: 15,
  textAlign: 'left',
  textDecoration: 'none',
  cursor: 'pointer',
};

/**
 * 로그인한 사용자의 아바타 버튼 + 메뉴 (대시보드 / 계정 설정 / 로그아웃).
 * 버튼: aria-haspopup="menu" · aria-expanded. Esc·바깥 클릭으로 닫히고, 위아래 화살표로 항목을 오간다.
 */
export function UserMenu({ night }: { night?: boolean }) {
  const { displayName, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    // 열리면 첫 항목에 포커스
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (i + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (next < 0) return;
    e.preventDefault();
    items[next]?.focus();
  };

  const logout = async () => {
    setOpen(false);
    try {
      await signOut();
    } finally {
      navigate(ROUTES.main);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${displayName} 계정 메뉴`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 4,
          border: 0,
          borderRadius: 999,
          background: 'transparent',
          cursor: 'pointer',
          color: night ? 'var(--ink-on-night)' : 'var(--ink)',
        }}
      >
        <Avatar name={displayName} size={36} ring={night} />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="계정 메뉴"
          onKeyDown={onMenuKey}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 50,
            minWidth: 200,
            padding: 6,
            borderRadius: 12,
            background: 'var(--surface-raised)',
            border: '1px solid var(--line)',
            boxShadow: '0 12px 32px rgba(20, 27, 58, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{displayName}</div>
            {user?.email && (
              <div style={{ fontSize: 13, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            )}
          </div>
          <Link role="menuitem" tabIndex={-1} to={ROUTES.dashboard} className="dm-usermenu__item" style={itemStyle} onClick={() => setOpen(false)}>
            대시보드
          </Link>
          <Link role="menuitem" tabIndex={-1} to={ROUTES.account} className="dm-usermenu__item" style={itemStyle} onClick={() => setOpen(false)}>
            계정 설정
          </Link>
          <button role="menuitem" tabIndex={-1} type="button" className="dm-usermenu__item" style={itemStyle} onClick={() => void logout()}>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

import { useCallback, useRef, useState } from 'react';
import type { SiteSpec } from '../../lib/types.ts';

const MAX = 50;
/** 같은 칸을 이 시간 안에 계속 고치면 되돌리기 한 번으로 묶는다 */
const MERGE_MS = 1000;

interface History {
  past: SiteSpec[];
  present: SiteSpec | null;
  future: SiteSpec[];
}

/**
 * 에디터의 사이트 상태 + 되돌리기/다시하기 (최대 50단계).
 *   update(fn, key)  key 가 같은 연속 입력(글자 치기)은 한 단계로 묶인다
 */
export function useSiteHistory() {
  const [h, setH] = useState<History>({ past: [], present: null, future: [] });
  const last = useRef<{ key: string | null; at: number }>({ key: null, at: 0 });

  const reset = useCallback((site: SiteSpec) => {
    last.current = { key: null, at: 0 };
    setH({ past: [], present: site, future: [] });
  }, []);

  const update = useCallback((fn: (s: SiteSpec) => SiteSpec, key?: string) => {
    const now = Date.now();
    const merge = !!key && last.current.key === key && now - last.current.at < MERGE_MS;
    last.current = { key: key ?? null, at: now };
    setH((cur) => {
      if (!cur.present) return cur;
      const next = fn(cur.present);
      if (next === cur.present) return cur;
      return {
        past: merge ? cur.past : [...cur.past, cur.present].slice(-MAX),
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = { key: null, at: 0 };
    setH((cur) => {
      if (!cur.present || cur.past.length === 0) return cur;
      return { past: cur.past.slice(0, -1), present: cur.past[cur.past.length - 1], future: [cur.present, ...cur.future] };
    });
  }, []);

  const redo = useCallback(() => {
    last.current = { key: null, at: 0 };
    setH((cur) => {
      if (!cur.present || cur.future.length === 0) return cur;
      return { past: [...cur.past, cur.present].slice(-MAX), present: cur.future[0], future: cur.future.slice(1) };
    });
  }, []);

  return {
    site: h.present,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
    reset,
    update,
    undo,
    redo,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { updateProject } from '../../lib/api.ts';
import { toAppError } from '../../lib/supabase.ts';
import type { Project, SiteSpec } from '../../lib/types.ts';

export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

/**
 * site 가 바뀌면 delay(ms) 뒤에 updateProject 로 저장한다 (구조 확인 화면).
 * flush() 로 기다리지 않고 바로 저장할 수 있다 (다음 화면으로 넘어가기 전).
 */
export function useAutosave(id: string, site: SiteSpec | null, onSaved: (p: Project) => void, delay = 800) {
  const [state, setState] = useState<SaveState>('saved');
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef<string | null>(null);
  const timer = useRef<number | null>(null);
  const latest = useRef(site);
  latest.current = site;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const save = useCallback(async (): Promise<boolean> => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const s = latest.current;
    if (!s) return true;
    const json = JSON.stringify(s);
    if (json === lastSaved.current) {
      setState('saved');
      return true;
    }
    setState('saving');
    try {
      const p = await updateProject(id, { site: s });
      lastSaved.current = json;
      onSavedRef.current(p);
      setError(null);
      setState(JSON.stringify(latest.current) === json ? 'saved' : 'pending');
      return true;
    } catch (e) {
      setError(toAppError(e).message);
      setState('error');
      return false;
    }
  }, [id]);

  useEffect(() => {
    if (!site) return;
    const json = JSON.stringify(site);
    // 처음 불러온 내용은 이미 저장된 것
    if (lastSaved.current === null) {
      lastSaved.current = json;
      return;
    }
    if (json === lastSaved.current) return;
    setState('pending');
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), delay);
  }, [site, save, delay]);

  // 떠날 때 남은 저장은 바로 처리
  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        void save();
      }
    },
    [save],
  );

  return { state, error, flush: save };
}

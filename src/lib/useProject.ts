import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProject } from './api.ts';
import { toAppError } from './supabase.ts';
import type { Project } from './types.ts';

/**
 * /project/:id/... 화면 공통: URL 의 프로젝트를 불러온다.
 *   const { id, project, setProject, loading, error, reload } = useProject();
 * id 가 'draft' 면 이 브라우저의 초안.
 */
export function useProject() {
  const { id = '' } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getProject(id)
      .then((p) => {
        if (alive) setProject(p);
      })
      .catch((e) => {
        if (alive) setError(toAppError(e).message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { id, isDraft: id === 'draft', project, setProject, loading, error, reload };
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { Button, ButtonLink, Segmented, SelectField } from '../components';
import { PageError, PageLoading } from '../components/StatusViews.tsx';
import { useProject } from '../lib/useProject.ts';
import { SiteView } from '../site/SiteView.tsx';
import { CanvasToast } from './editor/CanvasToast.tsx';
import { DraftLoginDialog } from './editor/DraftLoginDialog.tsx';

type Device = 'pc' | 'tablet' | 'mobile';

const DEVICES: readonly { value: Device; label: string; w: string }[] = [
  { value: 'pc', label: '데스크톱', w: '1040px' },
  { value: 'tablet', label: '태블릿', w: '720px' },
  { value: 'mobile', label: '모바일', w: '375px' },
];

export default function Preview() {
  const navigate = useNavigate();
  const { id, isDraft, project, loading, error, reload } = useProject();
  const [page, setPage] = useState('');
  const [device, setDevice] = useState<Device>('pc');
  const [fakeToast, setFakeToast] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  if (loading && !project) return <PageLoading label="미리보기를 준비하는 중이에요" />;
  if (error || !project) return <PageError message={error ?? '프로젝트를 찾지 못했어요.'} onRetry={reload} />;

  const site = project.site;
  const pageId = site.pages.some((p) => p.id === page) ? page : site.pages[0]?.id ?? '';
  const frameW = (DEVICES.find((d) => d.value === device) ?? DEVICES[0]).w;

  const onPublish = () => {
    if (isDraft) setLoginOpen(true);
    else navigate(ROUTES.published(id));
  };

  return (
    <div
      style={{
        color: 'var(--ink)',
        background: '#eeede8',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 얇은 상단 바 (로고 없는 작업 바라 AppHeader 대신 직접 배치) */}
      <header
        style={{
          background: 'var(--night-900)',
          color: 'var(--ink-on-night)',
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <ButtonLink
            to={ROUTES.editor(id)}
            variant="violet"
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            }
          >
            편집으로
          </ButtonLink>
          <span style={{ fontSize: 13, color: 'var(--dawn-pink)' }}>
            {project.name} 미리보기 · 방문자에게 보이는 화면이에요
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <SelectField id="page-jump" label="페이지" inline night size="sm" value={pageId} onChange={(e) => setPage(e.target.value)}>
            {site.pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || '이름 없음'}
              </option>
            ))}
          </SelectField>
          <Segmented night label="기기 전환" value={device} onChange={setDevice} options={DEVICES} />
          <Button variant="primary" onClick={onPublish}>
            배포
          </Button>
        </div>
      </header>

      {/* 방문자 화면 */}
      <main style={{ flex: 1, padding: '28px 16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div
          style={{
            position: 'relative',
            width: frameW,
            maxWidth: '100%',
            background: '#ffffff',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(20, 27, 58, 0.06), 0 12px 40px rgba(20, 27, 58, 0.12)',
            transition: 'width 0.3s ease',
          }}
        >
          <SiteView
            site={site}
            pageId={pageId}
            onNavigate={setPage}
            onFakeAction={() => setFakeToast('데모 동작이에요 · 실제 결제나 신청은 일어나지 않아요')}
            compact={device !== 'pc'}
            bottomPadding={64}
          />
          {fakeToast && <CanvasToast message={fakeToast} onDone={() => setFakeToast(null)} />}
        </div>
      </main>

      <DraftLoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

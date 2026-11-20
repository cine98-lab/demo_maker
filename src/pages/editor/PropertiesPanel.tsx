import { useId, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Button, SelectField, TextArea, TextField } from '../../components';
import { uploadProjectImage } from '../../lib/api.ts';
import { deletePage, updatePage } from '../../lib/editor/siteOps.ts';
import { toAppError } from '../../lib/supabase.ts';
import type { SiteItem, SiteSpec } from '../../lib/types.ts';
import { ContentLinesEditor } from './ContentLinesEditor.tsx';

export type Update = (fn: (s: SiteSpec) => SiteSpec, key?: string) => void;

const MAX_ITEMS = 6;

/** 왼쪽 "블록" 탭에서 바로 가기 할 때 쓰는 섹션 목록 */
export const HOME_SECTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'basic', label: '기본 정보 · 메뉴' },
  { id: 'hero', label: '대표 화면' },
  { id: 'photo', label: '대표 사진' },
  { id: 'info', label: '안내' },
  { id: 'list', label: '목록' },
];

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  paddingTop: 16,
  borderTop: '1px solid #f0efea',
};
const h3Style: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 700 };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`prop-${id}`} style={sectionStyle}>
      <h3 id={`prop-${id}`} tabIndex={-1} style={h3Style}>
        {title}
      </h3>
      {children}
    </section>
  );
}

const POSITIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'center', label: '가운데' },
  { value: 'top', label: '위쪽' },
  { value: 'bottom', label: '아래쪽' },
];

export function PropertiesPanel({
  site,
  pageId,
  update,
  projectId,
  canUpload,
  onMessage,
  onPageDeleted,
}: {
  site: SiteSpec;
  pageId: string;
  update: Update;
  projectId: string;
  /** 로그인했고 초안이 아닐 때만 사진 올리기 가능 */
  canUpload: boolean;
  onMessage: (msg: string) => void;
  onPageDeleted: () => void;
}) {
  const home = site.pages[0];
  const page = site.pages.find((p) => p.id === pageId) ?? home;
  const isHome = !page || page.id === home?.id;

  if (!isHome && page) {
    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--dawn-coral-ink)' }}>선택한 페이지</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{page.name || '이름 없음'}</span>
        </div>
        <TextField
          label="페이지 이름"
          maxLength={30}
          value={page.name}
          error={page.name.trim() ? undefined : '페이지 이름을 적어 주세요.'}
          onChange={(e) => {
            const name = e.target.value;
            update((s) => updatePage(s, page.id, { name }), `page-name-${page.id}`);
          }}
        />
        <ContentLinesEditor
          pageName={page.name}
          lines={page.contents}
          onChange={(contents) => update((s) => updatePage(s, page.id, { contents }), `page-contents-${page.id}`)}
        />
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-muted)' }}>
          이 페이지는 이름과 핵심 내용 목록으로 보여요. 페이지 사이 연결은 구조 확인 화면에서 정해져요.
        </p>
        <Button
          variant="danger-outline"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => {
            update((s) => deletePage(s, page.id));
            onPageDeleted();
            onMessage(`"${page.name}" 페이지를 지웠어요. 되돌리기로 살릴 수 있어요.`);
          }}
        >
          이 페이지 삭제
        </Button>
      </>
    );
  }

  return <HomeFields site={site} update={update} projectId={projectId} canUpload={canUpload} onMessage={onMessage} />;
}

function HomeFields({
  site,
  update,
  projectId,
  canUpload,
  onMessage,
}: {
  site: SiteSpec;
  update: Update;
  projectId: string;
  canUpload: boolean;
  onMessage: (msg: string) => void;
}) {
  const fileId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** 글자 칸 하나: key 로 연속 입력을 되돌리기 한 단계로 묶는다 */
  const text = <K extends 'brand' | 'tagline' | 'meta' | 'title' | 'price' | 'progress' | 'cta' | 'infoH' | 'listH'>(k: K, label: string, max = 40) => (
    <TextField
      label={label}
      size="sm"
      maxLength={max}
      value={site[k]}
      onChange={(e) => {
        const v = e.target.value;
        update((s) => ({ ...s, [k]: v }), k);
      }}
    />
  );

  const setItem = (i: number, patch: Partial<SiteItem>) =>
    update((s) => ({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }), `item-${i}-${Object.keys(patch)[0]}`);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const src = await uploadProjectImage(projectId, file);
      update((s) => ({ ...s, image: { src, alt: s.image?.alt || s.title, position: s.image?.position || 'center' } }));
      onMessage('사진을 올렸어요. 사진 설명도 확인해 주세요.');
    } catch (e) {
      setUploadError(toAppError(e).message);
    } finally {
      setUploading(false);
    }
  };

  const otherPages = site.pages.slice(1);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--dawn-coral-ink)' }}>첫 화면 편집</span>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.5 }}>고치는 대로 가운데 화면에 바로 보여요.</span>
      </div>

      <Section id="basic" title="기본 정보 · 메뉴">
        {text('brand', '서비스 이름', 30)}
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1].map((i) => (
            <TextField
              key={i}
              label={`메뉴 ${i + 1}`}
              size="sm"
              maxLength={12}
              value={site.nav[i]}
              fieldStyle={{ flex: 1, minWidth: 0 }}
              onChange={(e) => {
                const v = e.target.value;
                update((s) => ({ ...s, nav: (i === 0 ? [v, s.nav[1]] : [s.nav[0], v]) as [string, string] }), `nav-${i}`);
              }}
            />
          ))}
        </div>
      </Section>

      <Section id="hero" title="대표 화면">
        {text('meta', '작은 안내 (제목 위)', 40)}
        {text('title', '제목', 50)}
        {text('price', '가격', 30)}
        {text('progress', '진행 현황 문구', 40)}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 700 }}>
            진행 막대
            <input
              type="range"
              min={0}
              max={100}
              value={site.pct}
              onChange={(e) => {
                const pct = Number(e.target.value);
                update((s) => ({ ...s, pct }), 'pct');
              }}
              style={{ accentColor: site.color }}
            />
          </label>
          <TextField
            label="진행 막대 %"
            hideLabel
            size="sm"
            type="number"
            min={0}
            max={100}
            value={site.pct}
            fieldStyle={{ width: 72 }}
            onChange={(e) => {
              const n = Number(e.target.value);
              const pct = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
              update((s) => ({ ...s, pct }), 'pct');
            }}
          />
        </div>
        {text('cta', '버튼 글자', 20)}
        <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <legend style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>버튼을 누르면</legend>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="radio"
              name="cta-action"
              value="navigate"
              checked={site.ctaAction === 'navigate'}
              disabled={otherPages.length === 0}
              onChange={() =>
                update((s) => ({
                  ...s,
                  ctaAction: 'navigate',
                  ctaTarget: s.pages.some((p) => p.id === s.ctaTarget) && s.ctaTarget !== s.pages[0]?.id ? s.ctaTarget : s.pages[1]?.id ?? '',
                }))
              }
            />
            페이지로 이동
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="radio" name="cta-action" value="fake" checked={site.ctaAction === 'fake'} onChange={() => update((s) => ({ ...s, ctaAction: 'fake' }))} />
            가짜 동작 (신청·결제 흉내만)
          </label>
        </fieldset>
        {site.ctaAction === 'navigate' && otherPages.length > 0 && (
          <SelectField
            label="연결할 페이지"
            size="sm"
            value={otherPages.some((p) => p.id === site.ctaTarget) ? site.ctaTarget : ''}
            onChange={(e) => {
              const ctaTarget = e.target.value;
              update((s) => ({ ...s, ctaTarget }));
            }}
            hint={`${site.pages[0]?.name ?? '홈'} → ${site.pages.find((p) => p.id === site.ctaTarget)?.name ?? '페이지를 골라 주세요'}로 이어져요`}
          >
            {!otherPages.some((p) => p.id === site.ctaTarget) && <option value="">페이지 고르기</option>}
            {otherPages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || '이름 없음'}
              </option>
            ))}
          </SelectField>
        )}
      </Section>

      <Section id="photo" title="대표 사진">
        {site.image ? (
          <>
            <img
              src={site.image.src}
              alt=""
              style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', objectPosition: site.image.position, borderRadius: 8, display: 'block' }}
            />
            <TextField
              label="사진 설명 (화면 읽기 프로그램용)"
              size="sm"
              maxLength={80}
              value={site.image.alt}
              onChange={(e) => {
                const alt = e.target.value;
                update((s) => (s.image ? { ...s, image: { ...s.image, alt } } : s), 'image-alt');
              }}
            />
            <SelectField
              label="사진에서 보일 부분"
              size="sm"
              value={POSITIONS.some((p) => p.value === site.image?.position) ? site.image.position : 'center'}
              onChange={(e) => {
                const position = e.target.value;
                update((s) => (s.image ? { ...s, image: { ...s.image, position } } : s));
              }}
            >
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </SelectField>
            <Button
              size="sm"
              variant="danger-text"
              style={{ alignSelf: 'flex-start' }}
              onClick={() =>
                update((s) => {
                  const { image: _image, ...rest } = s;
                  return rest;
                })
              }
            >
              사진 빼기
            </Button>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            사진이 없으면 대표 색 바탕에 한 줄 소개가 보여요.
          </p>
        )}
        {text('tagline', '한 줄 소개 (사진이 없을 때)', 30)}
        {canUpload ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor={fileId} className="dm-btn dm-btn--secondary dm-btn--sm" style={{ alignSelf: 'flex-start', cursor: uploading ? 'wait' : 'pointer' }}>
              {uploading ? '올리는 중…' : site.image ? '다른 사진 올리기' : '사진 올리기'}
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>PNG, JPG, WEBP, GIF · 5MB 이하</span>
            {uploadError && (
              <p role="alert" className="dm-alert dm-alert--error" style={{ margin: 0 }}>
                {uploadError}
              </p>
            )}
          </div>
        ) : (
          <p className="dm-alert dm-alert--info" style={{ margin: 0 }}>
            사진은 로그인 후 올릴 수 있어요.
          </p>
        )}
      </Section>

      <Section id="info" title="안내">
        {text('infoH', '안내 제목', 30)}
        <TextArea
          label="안내 내용"
          rows={4}
          maxLength={300}
          value={site.infoP}
          onChange={(e) => {
            const infoP = e.target.value;
            update((s) => ({ ...s, infoP }), 'infoP');
          }}
        />
      </Section>

      <Section id="list" title="목록">
        {text('listH', '목록 제목', 30)}
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {site.items.map((it, i) => (
            <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 8, background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>항목 {i + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  square
                  aria-label={`항목 ${i + 1} 지우기`}
                  disabled={site.items.length <= 1}
                  onClick={() => update((s) => ({ ...s, items: s.items.filter((_, j) => j !== i) }))}
                >
                  ✕
                </Button>
              </div>
              <TextField label={`항목 ${i + 1} 이름`} size="sm" maxLength={30} value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} />
              <TextField label={`항목 ${i + 1} 설명`} size="sm" maxLength={40} value={it.sub} onChange={(e) => setItem(i, { sub: e.target.value })} />
            </li>
          ))}
        </ol>
        <Button
          size="sm"
          style={{ alignSelf: 'flex-start' }}
          disabled={site.items.length >= MAX_ITEMS}
          onClick={() => update((s) => ({ ...s, items: [...s.items, { name: '새 항목', sub: '설명' }] }))}
        >
          + 항목 추가 ({site.items.length} / {MAX_ITEMS})
        </Button>
      </Section>
    </>
  );
}

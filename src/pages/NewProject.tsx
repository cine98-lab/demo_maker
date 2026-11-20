import { useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../routes.ts';
import { AppHeader, Badge, Button, ButtonLink, Card, TextArea, TextField } from '../components';
import { useScrollMotion } from '../animation/useScrollMotion.ts';
import { TEMPLATES } from '../data/templates.ts';
import { useAuth } from '../auth/AuthProvider.tsx';
import { saveDraft } from '../lib/draft.ts';
import { suggestName } from '../lib/generator.ts';
import type { GenerateInput, Method } from '../lib/types.ts';

const IDEA_MIN = 5;

const METHOD_NAMES: Record<Method, string> = { idea: '아이디어 입력', wizard: '질문형 마법사', template: '템플릿' };

type MethodOption = { id: Method; title: string; desc: string; icon: ReactNode };
const METHODS: readonly MethodOption[] = [
  {
    id: 'idea',
    title: '아이디어 입력',
    desc: '만들고 싶은 서비스를 글로 설명해요. 가장 빠른 방법이에요.',
    icon: (
      <>
        <path d="M4 20h4L19 9l-4-4L4 16z" />
        <path d="M13 7l4 4" />
      </>
    ),
  },
  {
    id: 'wizard',
    title: '질문형 마법사',
    desc: '무엇을 써야 할지 막막하다면, 질문 4개에 답해 주세요.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4" />
        <circle cx="12" cy="17" r="0.6" fill="#b8461f" />
      </>
    ),
  },
  {
    id: 'template',
    title: '템플릿',
    desc: '비슷한 서비스 템플릿에서 시작해 이름과 내용만 바꿔요.',
    icon: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </>
    ),
  },
];

type Example = { label: string; text: string };
const EXAMPLES: readonly Example[] = [
  {
    label: '반찬 공동구매',
    text: '1인 가구를 위한 동네 반찬 공동구매 서비스. 반찬을 소분해서 이웃과 함께 사고, 정해진 장소에서 픽업해요.',
  },
  {
    label: '반려견 산책 매칭',
    text: '바쁜 직장인과 동네 산책러를 이어주는 반려견 산책 예약 서비스. 산책 후 사진과 후기를 남겨요.',
  },
  { label: '동네 스터디', text: '같은 동네 사람들끼리 관심사별 스터디 모임을 찾고 참여 신청하는 커뮤니티.' },
];
const KINDS: readonly string[] = ['쇼핑몰', '예약', '커뮤니티', 'SaaS', '정보 소개', '기타'];
const FEATURES: readonly string[] = [
  '상품·게시글 목록',
  '상세 페이지',
  '회원가입·로그인',
  '예약·신청',
  '장바구니·결제',
  '후기·댓글',
];
const MOODS: readonly string[] = ['따뜻하고 친근하게', '신뢰감 있게', '활기차게', '차분하게', '고급스럽게'];
type ColorOption = { label: string; hex: string };
const COLORS: readonly ColorOption[] = [
  { label: '코랄', hex: '#ff7a59' },
  { label: '숲', hex: '#2f7d5b' },
  { label: '바다', hex: '#2f5bea' },
  { label: '보라', hex: '#6b4fd8' },
  { label: '먹', hex: '#1e2233' },
  { label: '햇살', hex: '#f2b705' },
];
const Q_TITLES: readonly string[] = [
  '어떤 종류의 서비스인가요?',
  '꼭 필요한 기능을 골라 주세요',
  '어떤 분위기였으면 하나요?',
  '대표 색상을 골라 주세요',
];

type SummaryItem = { label: string; value: string; lit: boolean };

/* ───────── 공통 스타일 ───────── */

const sel = (on: boolean): string => (on ? 'var(--dawn-coral)' : 'var(--line)');
const h1Style: CSSProperties = { margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' };
const leadStyle: CSSProperties = { margin: 0, fontSize: 16, color: 'var(--ink-muted)' };
const headGroup: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };
const stepDot = (active: boolean, idleBg: string): CSSProperties => ({
  width: 12,
  height: 12,
  borderRadius: 999,
  background: active ? 'var(--star-gold)' : idleBg,
  boxShadow: `0 0 0 ${active ? 3 : 0}px var(--night-900)`,
});

/** 마법사 답을 한 문장으로 (생성기의 아이디어 글로 쓰인다) */
function wizardIdea(kind: string, features: string[], mood: string): string {
  const k = kind && kind !== '기타' ? `${kind} 서비스` : '서비스';
  const parts = [`${k}를 만들고 싶어요`];
  if (features.length) parts.push(`주요 기능은 ${features.join(', ')}`);
  if (mood) parts.push(`분위기는 ${mood}`);
  return `${parts.join('. ')}.`;
}

export default function NewProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  // ?idea= (메인 화면 입력), ?template= (템플릿 갤러리)
  const [initial] = useState(() => {
    const ideaParam = (params.get('idea') ?? '').slice(0, 500);
    const tplParam = params.get('template') ?? '';
    const tpl = TEMPLATES.some((t) => t.id === tplParam) ? tplParam : '';
    const m: Method = tpl ? 'template' : 'idea';
    return { idea: ideaParam, templateId: tpl, method: m, step: (tpl || ideaParam ? 2 : 1) as 1 | 2 };
  });
  const [step, setStep] = useState<1 | 2>(initial.step);
  const [method, setMethod] = useState<Method>(initial.method);
  const [idea, setIdea] = useState(initial.idea);
  const [q, setQ] = useState(0);
  const [kind, setKind] = useState('');
  const [feats, setFeats] = useState<Partial<Record<string, boolean>>>({});
  const [customFeat, setCustomFeat] = useState('');
  const [mood, setMood] = useState('');
  const [color, setColor] = useState('');
  const [templateId, setTemplateId] = useState(initial.templateId);
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [pname, setPname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const template = TEMPLATES.find((t) => t.id === templateId);
  const colorHex = COLORS.find((c) => c.label === color)?.hex;

  const pickMethod = (m: Method) => {
    setMethod(m);
    setError(null);
    if (m === 'wizard') setQ(0);
  };

  const featList = FEATURES.filter((f) => feats[f]);
  const allFeatures = customFeat.trim() ? [...featList, customFeat.trim()] : featList;

  /** 지금 입력으로 GenerateInput 만들기. 모자라면 오류 문장 */
  const buildInput = (): GenerateInput | string => {
    const name = pname.trim() || undefined;
    if (method === 'idea') {
      const text = idea.trim();
      if (text.length < IDEA_MIN) return `서비스 설명을 ${IDEA_MIN}자 이상 적어 주세요.`;
      return { method, idea: text, name };
    }
    if (method === 'wizard') {
      if (!kind) return '첫 번째 질문에서 서비스 종류를 골라 주세요.';
      return {
        method,
        idea: wizardIdea(kind, allFeatures, mood),
        name,
        kind: kind === '기타' ? undefined : kind,
        features: allFeatures,
        mood: mood || undefined,
        color: colorHex,
      };
    }
    if (!template) return '시작할 템플릿을 골라 주세요.';
    const b = brand.trim();
    return {
      method,
      idea: `${template.name}${product.trim() ? ` · ${product.trim()}` : ''}`,
      name: b || name,
      kind: template.type,
      templateId: template.id,
    };
  };

  const submit = () => {
    const input = buildInput();
    if (typeof input === 'string') {
      setError(input);
      if (method === 'idea') document.getElementById('idea-text')?.focus();
      return;
    }
    setError(null);
    const projectName = (pname.trim() || input.name || (template && method === 'template' ? template.name : suggestName(input.idea))).slice(0, 80);
    saveDraft({ input, name: projectName, idea: input.idea, method: input.method, site: null });
    navigate(ROUTES.generating);
  };

  // 오른쪽 요약: 지금까지 모인 별
  const raw: { label: string; value: string; filled?: boolean }[] = [
    { label: '시작 방법', value: METHOD_NAMES[method] },
  ];
  if (method === 'idea') raw.push({ label: '서비스 설명', value: idea || '아직 비어 있어요', filled: idea.trim().length >= IDEA_MIN });
  if (method === 'wizard') {
    raw.push({ label: '서비스 종류', value: kind || '아직 고르지 않았어요', filled: !!kind });
    raw.push({
      label: '주요 기능',
      value: allFeatures.length ? allFeatures.join(', ') : '아직 고르지 않았어요',
      filled: allFeatures.length > 0,
    });
    raw.push({ label: '분위기', value: mood || '아직 고르지 않았어요', filled: !!mood });
    raw.push({ label: '대표 색상', value: color || '아직 고르지 않았어요', filled: !!color });
  }
  if (method === 'template') {
    raw.push({ label: '템플릿', value: template?.name ?? '아직 고르지 않았어요', filled: !!template });
    raw.push({ label: '서비스 이름', value: brand || '아직 비어 있어요', filled: !!brand });
    raw.push({ label: '상품 종류', value: product || '아직 비어 있어요', filled: !!product });
  }
  raw.push({ label: '프로젝트 이름', value: pname || '아직 비어 있어요', filled: !!pname });
  const summary: SummaryItem[] = raw.map((s, i) => ({
    label: s.label,
    value: s.value,
    lit: i === 0 ? step >= 1 : !!s.filled,
  }));
  const litCount = summary.filter((s) => s.lit).length;

  // 왼쪽 단계 화면은 단계·방법이 바뀔 때마다 새로 떠오르고, 오른쪽 요약은 처음 한 번만
  const stepRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);
  useScrollMotion(stepRef, [step, method]);
  useScrollMotion(asideRef);

  return (
    <div
      style={{
        color: 'var(--ink)',
        background: 'var(--surface)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppHeader
        brandTo={user ? ROUTES.dashboard : ROUTES.main}
        maxWidth={1200}
        right={
          <ol
            aria-label="진행 단계"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
            }}
          >
            <li
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: step === 1 ? 700 : 400,
                color: step === 1 ? 'var(--ink)' : 'var(--ink-muted)',
              }}
            >
              <span style={stepDot(step === 1, 'var(--night-900)')} />
              시작 방법
            </li>
            <li aria-hidden="true" style={{ width: 32, height: 1, background: 'var(--dawn-coral)' }} />
            <li
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: step === 2 ? 700 : 400,
                color: step === 2 ? 'var(--ink)' : 'var(--ink-muted)',
              }}
            >
              <span style={stepDot(step === 2, 'var(--line)')} />
              정보 입력
            </li>
            <li aria-hidden="true" style={{ width: 32, height: 1, background: 'var(--line)' }} />
            <li style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-muted)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, border: '2px dashed #c9c7bf' }} />
              구조 확인
            </li>
          </ol>
        }
      />

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          padding: '40px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        <div ref={stepRef} style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* ① 시작 방법 선택 */}
          {step === 1 && (
            <>
              <div data-intro style={headGroup}>
                <h1 style={h1Style}>어디서부터 시작해 볼까요?</h1>
                <p style={leadStyle}>편한 방법을 고르세요. 어떤 방법이든 나중에 자유롭게 고칠 수 있어요.</p>
              </div>
              <div
                role="radiogroup"
                aria-label="시작 방법"
                data-reveal-stagger
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}
              >
                {METHODS.map((m) => {
                  const on = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => pickMethod(m.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: 24,
                        borderRadius: 12,
                        border: `2px solid ${sel(on)}`,
                        background: 'var(--surface-raised)',
                        color: 'var(--ink)',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#b8461f"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {m.icon}
                      </svg>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>{m.title}</span>
                      <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-muted)' }}>{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ② 정보 입력 */}
          {step === 2 && (
            <>
              {method === 'idea' && (
                <>
                  <div data-intro style={headGroup}>
                    <h1 style={h1Style}>당신의 꿈을 들려주세요</h1>
                    <p style={leadStyle}>누구를 위한 서비스인지, 무엇을 할 수 있는지 적으면 더 정확해져요.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <TextArea
                      id="idea-text"
                      label="서비스 설명"
                      rows={5}
                      placeholder="예: 1인 가구를 위한 동네 반찬 공동구매 서비스. 반찬을 소분해서 이웃과 함께 사고, 정해진 장소에서 픽업해요."
                      value={idea}
                      maxLength={500}
                      error={method === 'idea' ? error : null}
                      hint={`${IDEA_MIN}자 이상 적어 주세요 · ${idea.length} / 500`}
                      onChange={(e) => {
                        setIdea(e.target.value);
                        if (error) setError(null);
                      }}
                      style={{ fontSize: 16 }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>예시로 채우기</span>
                      {EXAMPLES.map((ex) => (
                        <Button
                          key={ex.label}
                          size="sm"
                          pill
                          style={{ fontWeight: 500 }}
                          onClick={() => {
                            setIdea(ex.text);
                            setError(null);
                          }}
                        >
                          {ex.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {method === 'wizard' && (
                <>
                  <div data-intro style={headGroup}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--dawn-coral-ink)' }}>
                      질문 {q + 1} / 4
                    </p>
                    <h1 style={h1Style}>{Q_TITLES[q]}</h1>
                  </div>

                  {q === 0 && (
                    <div
                      role="radiogroup"
                      aria-label="서비스 종류"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}
                    >
                      {KINDS.map((k) => {
                        const on = kind === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => {
                              setKind(k);
                              setError(null);
                            }}
                            style={{
                              height: 64,
                              borderRadius: 12,
                              border: `2px solid ${sel(on)}`,
                              background: on ? '#fff1ec' : 'var(--surface-raised)',
                              fontSize: 16,
                              fontWeight: 700,
                              color: 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q === 1 && (
                    <>
                      <fieldset
                        style={{
                          margin: 0,
                          padding: 0,
                          border: 0,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: 10,
                        }}
                      >
                        <legend className="sr-only">주요 기능</legend>
                        {FEATURES.map((f) => {
                          const on = !!feats[f];
                          return (
                            <label
                              key={f}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                minHeight: 52,
                                padding: '0 16px',
                                borderRadius: 12,
                                border: `1px solid ${sel(on)}`,
                                background: 'var(--surface-raised)',
                                fontSize: 15,
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => setFeats((prev) => ({ ...prev, [f]: !on }))}
                                style={{ width: 18, height: 18, accentColor: 'var(--dawn-coral)' }}
                              />
                              {f}
                            </label>
                          );
                        })}
                      </fieldset>
                      <TextField
                        id="feature-custom"
                        label="직접 입력"
                        optional
                        type="text"
                        placeholder="예: 픽업 장소 지도"
                        maxLength={30}
                        value={customFeat}
                        onChange={(e) => setCustomFeat(e.target.value)}
                      />
                    </>
                  )}

                  {q === 2 && (
                    <div role="radiogroup" aria-label="분위기" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {MOODS.map((m) => {
                        const on = mood === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setMood(m)}
                            style={{
                              height: 48,
                              padding: '0 20px',
                              borderRadius: 999,
                              border: `2px solid ${sel(on)}`,
                              background: on ? '#fff1ec' : 'var(--surface-raised)',
                              fontSize: 15,
                              fontWeight: 700,
                              color: 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q === 3 && (
                    <div role="radiogroup" aria-label="대표 색상" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                      {COLORS.map((c) => {
                        const on = color === c.label;
                        return (
                          <button
                            key={c.label}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-label={c.label}
                            onClick={() => setColor(c.label)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 8,
                              padding: 0,
                              border: 0,
                              background: 'transparent',
                              fontSize: 13,
                              color: 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            <span
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 999,
                                background: c.hex,
                                boxShadow: `0 0 0 ${on ? 3 : 0}px var(--surface-raised), 0 0 0 ${on ? 5 : 0}px var(--night-900)`,
                              }}
                            />
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <Button onClick={() => setQ((n) => Math.max(0, n - 1))} disabled={q === 0}>
                      이전 질문
                    </Button>
                    {q < 3 && (
                      <Button variant="night" onClick={() => setQ((n) => Math.min(3, n + 1))}>
                        다음 질문
                      </Button>
                    )}
                  </div>
                </>
              )}

              {method === 'template' && (
                <>
                  <div data-intro style={headGroup}>
                    <h1 style={h1Style}>{template ? '이 템플릿으로 시작할게요' : '어떤 템플릿으로 시작할까요?'}</h1>
                    <p style={leadStyle}>서비스 이름과 상품 종류를 알려주시면 샘플 데이터를 바꿔 드려요.</p>
                  </div>
                  {template && (
                    <Card
                      as="div"
                      gap={16}
                      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', padding: 16 }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: 160,
                          height: 100,
                          borderRadius: 8,
                          background: template.bg,
                          flex: 'none',
                        }}
                      >
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                          aria-hidden="true"
                        >
                          <polyline
                            points={template.stars.map((s) => `${s[0]},${s[1]}`).join(' ')}
                            fill="none"
                            stroke="#ffb3a7"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                        {template.stars.map((s, i) => (
                          <span
                            key={i}
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              left: `${s[0]}%`,
                              top: `${s[1]}%`,
                              width: s[2] * 1.4,
                              height: s[2] * 1.4,
                              transform: 'translate(-50%, -50%)',
                              borderRadius: 999,
                              background: '#ffd66b',
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Badge tone="coral">{template.type}</Badge>
                        <span style={{ fontSize: 17, fontWeight: 700 }}>{template.name}</span>
                        <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>페이지 {template.pages}개 · {template.desc}</span>
                      </div>
                      <Link
                        to={ROUTES.gallery}
                        style={{ fontSize: 14, fontWeight: 700, textDecoration: 'none', padding: '10px 0' }}
                      >
                        갤러리에서 자세히 보기
                      </Link>
                    </Card>
                  )}
                  <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <legend style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                      {template ? '다른 템플릿 고르기' : '템플릿 고르기'}
                    </legend>
                    <div
                      role="radiogroup"
                      aria-label="템플릿"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}
                    >
                      {TEMPLATES.map((t) => {
                        const on = t.id === templateId;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => {
                              setTemplateId(t.id);
                              setError(null);
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 2,
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: `2px solid ${sel(on)}`,
                              background: on ? '#fff1ec' : 'var(--surface-raised)',
                              color: 'var(--ink)',
                              textAlign: 'left',
                              font: 'inherit',
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                              {t.type} · 페이지 {t.pages}개
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div data-reveal-stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                    <TextField
                      id="brand"
                      label="서비스 이름"
                      type="text"
                      placeholder={template ? `예: ${template.brand}` : '예: 반찬나눔'}
                      optional
                      maxLength={30}
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                    <TextField
                      id="product"
                      label="상품 종류"
                      type="text"
                      placeholder="예: 소분 반찬, 밀키트"
                      optional
                      maxLength={40}
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                    />
                  </div>
                </>
              )}

              {error && method !== 'idea' && (
                <p role="alert" className="dm-alert dm-alert--error" style={{ margin: 0 }}>
                  {error}
                </p>
              )}

              <div style={{ paddingTop: 20, borderTop: '1px solid var(--line)' }}>
                <TextField
                  id="project-name"
                  label="프로젝트 이름"
                  type="text"
                  placeholder="대시보드에 보일 이름이에요"
                  optional
                  hint="비워 두면 설명을 보고 지어 드려요."
                  maxLength={80}
                  value={pname}
                  onChange={(e) => setPname(e.target.value)}
                  style={{ maxWidth: 420 }}
                />
              </div>
            </>
          )}
        </div>

        {/* 오른쪽: 지금까지 모인 별 */}
        <div ref={asideRef} style={{ display: 'contents' }}>
        <aside
          data-reveal="right"
          aria-labelledby="sum-title"
          style={{
            flex: '1 1 300px',
            minWidth: 0,
            background: 'var(--night-900)',
            color: 'var(--ink-on-night)',
            borderRadius: 20,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 id="sum-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              지금까지 모인 별
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--dawn-pink)' }}>
              하나씩 채울 때마다 별이 켜져요 · {litCount} / {summary.length}
            </p>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {summary.map((s) => (
              <li key={s.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {s.lit ? (
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      marginTop: 4,
                      borderRadius: 999,
                      background: 'var(--star-gold)',
                      boxShadow: '0 0 12px rgba(255, 214, 107, 0.6)',
                      flex: 'none',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      marginTop: 4,
                      borderRadius: 999,
                      border: '1.5px dashed #8d86b8',
                      flex: 'none',
                    }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dawn-pink)' }}>{s.label}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{s.value}</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        </div>
      </main>

      <footer style={{ background: 'var(--surface-raised)', borderTop: '1px solid var(--line)' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {step === 1 ? (
            <>
              <ButtonLink to={user ? ROUTES.dashboard : ROUTES.main} size="lg">
                취소
              </ButtonLink>
              <Button variant="primary" size="lg" onClick={() => setStep(2)}>
                다음
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
              >
                시작 방법 바꾸기
              </Button>
              <Button variant="primary" size="lg" onClick={submit}>
                다음: 구조 확인
              </Button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

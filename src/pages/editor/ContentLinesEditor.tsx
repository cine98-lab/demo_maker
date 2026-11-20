import { Button, TextField } from '../../components';

/** 페이지 핵심 내용 줄 목록: 고치기 · 지우기 · 추가 (구조 확인, 에디터 공통) */
export function ContentLinesEditor({
  lines,
  onChange,
  pageName,
  max = 8,
}: {
  lines: string[];
  onChange: (next: string[]) => void;
  pageName: string;
  max?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>핵심 내용</h3>
      {lines.length === 0 && <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>아직 내용이 없어요. 이 페이지에 들어갈 것을 적어 주세요.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lines.map((line, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <TextField
              label={`${pageName} 내용 ${i + 1}`}
              hideLabel
              size="sm"
              value={line}
              maxLength={80}
              onChange={(e) => onChange(lines.map((l, j) => (j === i ? e.target.value : l)))}
              fieldStyle={{ flex: 1, minWidth: 0 }}
            />
            <Button
              size="sm"
              variant="ghost"
              square
              aria-label={`내용 ${i + 1} 지우기`}
              onClick={() => onChange(lines.filter((_, j) => j !== i))}
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        style={{ alignSelf: 'flex-start' }}
        disabled={lines.length >= max}
        onClick={() => onChange([...lines, ''])}
      >
        + 내용 추가
      </Button>
    </div>
  );
}

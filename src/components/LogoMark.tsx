type LogoMarkProps = {
  /** 한 변 길이(px). 기본 28 */
  size?: number;
  /**
   * true면 밝은 바탕용 어두운 로고(코랄 선 + 밤하늘 점),
   * false(기본)면 밤하늘 바탕용 로고(분홍 선 + 금색 점).
   */
  dark?: boolean;
};

/** 데모메이커 별자리 로고 마크. 장식용이므로 aria-hidden. */
export default function LogoMark({ size = 28, dark = false }: LogoMarkProps) {
  const line = dark ? '#ff7a59' : '#ffb3a7';
  const dot = dark ? '#141b3a' : '#ffd66b';
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <polyline points="4,20 12,8 24,14" fill="none" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="4" cy="20" r="3" fill={dot} />
      <circle cx="12" cy="8" r="3.5" fill={dot} />
      <circle cx="24" cy="14" r="2.5" fill={dot} />
    </svg>
  );
}

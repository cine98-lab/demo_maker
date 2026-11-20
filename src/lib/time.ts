/** 상대 시간: "방금 전", "5분 전", "3시간 전", "어제", "3일 전", "11월 12일", "2025년 11월 12일" */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const sec = Math.round((now.getTime() - t.getTime()) / 1000);
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(t)) / 86400000);
  if (days <= 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (t.getFullYear() === now.getFullYear()) return `${t.getMonth() + 1}월 ${t.getDate()}일`;
  return `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일`;
}

/** 툴팁·title 용 전체 날짜 */
export function fullDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

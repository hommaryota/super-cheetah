// "12.34" / "1:02.34" → ms（空なら null、形式エラーなら NaN）
export function parseTime(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/^(?:(\d+):)?(\d+(?:\.\d{1,3})?)$/);
  if (!m) return NaN;
  const min = m[1] ? Number(m[1]) : 0;
  const sec = Number(m[2]);
  if (m[1] && sec >= 60) return NaN;
  const ms = Math.round((min * 60 + sec) * 1000);
  return ms > 0 ? ms : NaN;
}

// ms → "12.34" / "1:02.34"
export function formatTime(ms: number | null | undefined): string {
  if (ms == null) return '--.--';
  const totalCs = Math.round(ms / 10);
  const min = Math.floor(totalCs / 6000);
  const sec = (totalCs % 6000) / 100;
  return min > 0 ? `${min}:${sec.toFixed(2).padStart(5, '0')}` : sec.toFixed(2);
}

export const pacePer100 = (splitMs: number, distanceM: number) => (splitMs / distanceM) * 100;

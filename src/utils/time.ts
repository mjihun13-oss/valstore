export const secondsLeft = (fetchedAt: number, seconds: number, now: number): number =>
  Math.max(0, Math.floor((fetchedAt + seconds * 1000 - now) / 1000));

const pad = (n: number): string => String(n).padStart(2, '0');

export function formatCountdown(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return d > 0 ? `${d}일 ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

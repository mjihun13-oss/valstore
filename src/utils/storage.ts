import type { Region } from '../services/riotStore';
import type { CatalogSkin, DailyShop } from '../types/valorant';

const K_REVEALED = 'vs-revealed-v1';
const K_TOKEN = 'vs-token-v1';
const K_SNAPSHOT = 'vs-shop-v2';
const K_REGION = 'vs-region-v1';
const K_WISH = 'vs-wish-v1';
const K_STATS = 'vs-stats-v1';
const K_CATALOG = 'vs-catalog-v1';
const K_NOTIFIED = 'vs-notified-v1';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 실패는 무시 */
  }
}

export interface SavedToken {
  token: string;
  expiresAt: number;
  region: Region;
}

export const loadToken = (): SavedToken | null => read<SavedToken>(K_TOKEN);
export const saveToken = (t: SavedToken): void => write(K_TOKEN, t);

export const loadRegion = (): Region => read<Region>(K_REGION) ?? 'kr';
export const saveRegion = (r: Region): void => write(K_REGION, r);

/** 한 번 긁은 카드는 다시 긁을 수 없도록 기기에 기억한다. */
export function loadRevealed(): Set<string> {
  return new Set(read<string[]>(K_REVEALED) ?? []);
}
export function saveRevealed(ids: Set<string>): void {
  write(K_REVEALED, Array.from(ids).slice(-120));
}

/** 로그인이 만료돼도 오늘 상점은 다시 볼 수 있게 마지막 상점을 저장한다. */
export function loadSnapshot(): DailyShop | null {
  const s = read<DailyShop>(K_SNAPSHOT);
  if (!s || !Array.isArray(s.skins)) return null;
  return Date.now() < s.fetchedAt + s.remainingSeconds * 1000 ? s : null;
}
export const saveSnapshot = (s: DailyShop): void => write(K_SNAPSHOT, s);

export const loadWishlist = (): string[] => read<string[]>(K_WISH) ?? [];
export const saveWishlist = (ids: string[]): void => write(K_WISH, ids);

export interface UserStats {
  reveals: number;
  premiumSeen: number;
  exclusiveSeen: number;
  ultraSeen: number;
  wishHits: number;
  shares: number;
  nightVisits: number;
}
export const EMPTY_STATS: UserStats = {
  reveals: 0,
  premiumSeen: 0,
  exclusiveSeen: 0,
  ultraSeen: 0,
  wishHits: 0,
  shares: 0,
  nightVisits: 0,
};
export const loadStats = (): UserStats => ({ ...EMPTY_STATS, ...(read<UserStats>(K_STATS) ?? {}) });
export const saveStats = (s: UserStats): void => write(K_STATS, s);

export const loadCatalog = (): CatalogSkin[] => read<CatalogSkin[]>(K_CATALOG) ?? [];
export const saveCatalog = (c: CatalogSkin[]): void => write(K_CATALOG, c);

/** 위시리스트 알림을 이미 보낸 상점 카드 */
export const loadNotified = (): string[] => read<string[]>(K_NOTIFIED) ?? [];
export const saveNotified = (ids: string[]): void => write(K_NOTIFIED, ids.slice(-60));

export function clearSession(): void {
  try {
    localStorage.removeItem(K_TOKEN);
    localStorage.removeItem(K_SNAPSHOT);
  } catch {
    /* 무시 */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(K_TOKEN);
  } catch {
    /* 무시 */
  }
}

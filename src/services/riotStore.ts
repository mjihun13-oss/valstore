import { Capacitor } from '@capacitor/core';
import type { DailyShop, SkinChroma, SkinTier, ValorantSkin } from '../types/valorant';

export type Region = 'kr' | 'ap' | 'na' | 'eu';

export const REGIONS: { id: Region; label: string }[] = [
  { id: 'kr', label: '한국' },
  { id: 'ap', label: '아시아' },
  { id: 'na', label: '북미' },
  { id: 'eu', label: '유럽' },
];

/** Riot 공식 로그인 페이지. 로그인이 끝나면 주소 뒤에 access_token 이 붙는다. */
export const RIOT_LOGIN_URL =
  'https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid';

const VP_CURRENCY_ID = '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741';
const CLIENT_PLATFORM = btoa(
  JSON.stringify({
    platform: 'PC',
    systemOS: 'Windows',
    systemOSVersion: '10.0.19042.1.256.64bit',
    systemChipset: 'Unknown',
  }),
);

export class AuthExpiredError extends Error {}

export interface ParsedToken {
  token: string;
  expiresAt: number;
}

/** 붙여넣은 주소(또는 토큰 자체)에서 access_token 을 꺼낸다. */
export function parseAccessToken(input: string): ParsedToken | null {
  const text = input.trim();
  const m = text.match(/access_token=([^&\s]+)/);
  const token = m
    ? decodeURIComponent(m[1])
    : /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(text)
      ? text
      : null;
  if (!token) return null;
  const e = text.match(/expires_in=(\d+)/);
  const ttl = e ? Number(e[1]) : 3500;
  return { token, expiresAt: Date.now() + Math.max(60, ttl - 60) * 1000 };
}

/** 웹(브라우저)에서는 Riot 서버가 CORS를 막으므로 직접 만든 프록시를 거친다. 앱(APK)은 필요 없다. */
const PROXY_URL = ((import.meta.env.VITE_PROXY_URL as string | undefined) ?? '').replace(/\/$/, '');

function routed(url: string): string {
  if (!PROXY_URL || Capacitor.isNativePlatform()) return url;
  const host = new URL(url).hostname;
  if (host.endsWith('valorant-api.com')) return url;
  return `${PROXY_URL}/?url=${encodeURIComponent(url)}`;
}

/** label 은 오류가 어느 단계에서 났는지 화면에 보여주기 위한 이름이다. */
async function http<T>(label: string, url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(routed(url), init);
  } catch {
    throw new Error(`${label}: 네트워크에 연결하지 못했어요.`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new AuthExpiredError(
      `${label}: 로그인이 만료됐거나 권한이 없어요 (${res.status}). 다시 로그인해 주세요.`,
    );
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 120);
    } catch {
      /* 무시 */
    }
    throw new Error(`${label} 실패 (${res.status})${detail ? ` ${detail}` : ''}`);
  }
  return (await res.json()) as T;
}

interface RawOffer {
  OfferID: string;
  Cost: Record<string, number>;
}
interface RawStorefront {
  SkinsPanelLayout: {
    SingleItemStoreOffers?: RawOffer[];
    SingleItemOffers?: string[];
    SingleItemOffersRemainingDurationInSeconds?: number;
  };
}
interface RawChroma {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  fullRender: string | null;
  swatch: string | null;
}
interface RawSkin {
  uuid: string;
  displayName: string;
  contentTierUuid: string | null;
  displayIcon: string | null;
  chromas: RawChroma[];
  levels: { uuid: string; displayIcon: string | null }[];
}
interface RawWeapon {
  displayName: string;
  skins: RawSkin[];
}

async function loadStorefront(
  base: string,
  puuid: string,
  headers: Record<string, string>,
): Promise<RawStorefront> {
  let v3Error = '';
  try {
    return await http<RawStorefront>('상점 조회(v3)', `${base}/store/v3/storefront/${puuid}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch (e) {
    if (e instanceof AuthExpiredError) throw e;
    v3Error = e instanceof Error ? e.message : String(e);
  }
  try {
    return await http<RawStorefront>('상점 조회(v2)', `${base}/store/v2/storefront/${puuid}`, {
      headers,
    });
  } catch (e) {
    if (e instanceof AuthExpiredError) throw e;
    throw new Error(`${v3Error} / ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function loadWallet(
  base: string,
  puuid: string,
  headers: Record<string, string>,
): Promise<number | null> {
  try {
    const w = await http<{ Balances: Record<string, number> }>('지갑 조회', `${base}/store/v1/wallet/${puuid}`, {
      headers,
    });
    return w.Balances[VP_CURRENCY_ID] ?? 0;
  } catch {
    return null;
  }
}

const TIERS: SkinTier[] = ['Select', 'Deluxe', 'Premium', 'Exclusive', 'Ultra'];
const toTier = (devName: string | undefined): SkinTier =>
  TIERS.find((t) => t === devName) ?? 'Select';

/** 내 오늘의 상점(스킨 4개)과 보유 VP를 불러온다. */
export async function fetchMyShop(accessToken: string, region: Region): Promise<DailyShop> {
  const bearer = { Authorization: `Bearer ${accessToken}` };

  const [ent, user, ver] = await Promise.all([
    http<{ entitlements_token: string }>('인증 토큰 발급', 'https://entitlements.auth.riotgames.com/api/token/v1', {
      method: 'POST',
      headers: { ...bearer, 'Content-Type': 'application/json' },
      body: '{}',
    }),
    http<{ sub: string }>('내 정보 조회', 'https://auth.riotgames.com/userinfo', { headers: bearer }),
    http<{ data: { riotClientVersion: string } }>('게임 버전 조회', 'https://valorant-api.com/v1/version'),
  ]);

  const headers: Record<string, string> = {
    ...bearer,
    'X-Riot-Entitlements-JWT': ent.entitlements_token,
    'X-Riot-ClientPlatform': CLIENT_PLATFORM,
    'X-Riot-ClientVersion': ver.data.riotClientVersion,
  };
  const base = `https://pd.${region}.a.pvp.net`;

  const [store, vp, weapons, tiers] = await Promise.all([
    loadStorefront(base, user.sub, headers),
    loadWallet(base, user.sub, headers),
    http<{ data: RawWeapon[] }>('스킨 정보 조회', 'https://valorant-api.com/v1/weapons?language=ko-KR'),
    http<{ data: { uuid: string; devName: string }[] }>('티어 정보 조회', 'https://valorant-api.com/v1/contenttiers'),
  ]);

  const layout = store.SkinsPanelLayout;
  const offers: RawOffer[] =
    layout.SingleItemStoreOffers ??
    (layout.SingleItemOffers ?? []).map((id) => ({ OfferID: id, Cost: {} }));

  const tierById = new Map(tiers.data.map((t) => [t.uuid, t.devName]));
  const byLevel = new Map<string, { weapon: string; skin: RawSkin }>();
  for (const w of weapons.data) {
    for (const s of w.skins) {
      for (const l of s.levels) byLevel.set(l.uuid, { weapon: w.displayName, skin: s });
    }
  }

  const skins: ValorantSkin[] = offers.map((offer) => {
    const price = Object.values(offer.Cost)[0] ?? 0;
    const hit = byLevel.get(offer.OfferID);
    if (!hit) {
      return {
        id: offer.OfferID,
        name: '알 수 없는 스킨',
        weapon: '',
        price,
        tier: 'Select',
        imageUrl: '',
        chromas: [],
        levelCount: 1,
      };
    }
    const { skin, weapon } = hit;
    const chromas: SkinChroma[] = skin.chromas
      .map((c) => ({
        id: c.uuid,
        name: c.displayName,
        imageUrl: c.fullRender ?? c.displayIcon ?? '',
        swatchUrl: c.swatch,
      }))
      .filter((c) => c.imageUrl !== '');
    return {
      id: offer.OfferID,
      name: skin.displayName,
      weapon,
      price,
      tier: toTier(skin.contentTierUuid ? tierById.get(skin.contentTierUuid) : undefined),
      imageUrl: skin.displayIcon ?? skin.levels[0]?.displayIcon ?? chromas[0]?.imageUrl ?? '',
      chromas,
      levelCount: skin.levels.length,
    };
  });

  return {
    skins,
    remainingSeconds: layout.SingleItemOffersRemainingDurationInSeconds ?? 0,
    fetchedAt: Date.now(),
    vp,
  };
}

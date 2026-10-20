import { Capacitor } from '@capacitor/core';
import type {
  BundleItem,
  CatalogSkin,
  DailyShop,
  ShopBundle,
  SkinChroma,
  SkinTier,
  ValorantSkin,
  Wallet,
} from '../types/valorant';

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

const VP_ID = '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741';
const RADIANITE_ID = 'e59aa87c-4cbf-517a-5983-6e81511be9b7';
const KINGDOM_ID = '85ca954a-41f2-ce94-9b45-8ca3dd39a00d';
/** 스킨(레벨) 아이템 종류 ID */
const SKIN_LEVEL_TYPE = 'e7c63390-eda7-46e0-bb7a-a6abdacd2433';

const CLIENT_PLATFORM = btoa(
  JSON.stringify({
    platformType: 'PC',
    platformOS: 'Windows',
    platformOSVersion: '10.0.19042.1.256.64bit',
    platformChipset: 'Unknown',
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

type CostMap = Record<string, number>;
const firstValue = (m?: CostMap | null): number | null => {
  if (!m) return null;
  const v = Object.values(m)[0];
  return typeof v === 'number' ? v : null;
};

interface RawBonusOffer {
  Offer: { OfferID: string; Cost: CostMap };
  DiscountPercent?: number;
  DiscountCosts?: CostMap;
}
interface RawBundle {
  DataAssetID: string;
  Items?: {
    Item: { ItemTypeID: string; ItemID: string };
    BasePrice?: number;
    DiscountedPrice?: number;
  }[];
  TotalBaseCost?: CostMap | null;
  TotalDiscountedCost?: CostMap | null;
  TotalDiscountPercent?: number;
  DurationRemainingInSeconds?: number;
}
interface RawStorefront {
  SkinsPanelLayout: {
    SingleItemStoreOffers?: { OfferID: string; Cost: CostMap }[];
    SingleItemOffers?: string[];
    SingleItemOffersRemainingDurationInSeconds?: number;
  };
  FeaturedBundle?: { Bundles?: RawBundle[] };
  BonusStore?: {
    BonusStoreOffers?: RawBonusOffer[];
    BonusStoreRemainingDurationInSeconds?: number;
  };
}
interface RawChroma {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  fullRender: string | null;
  swatch: string | null;
  streamedVideo: string | null;
}
interface RawSkin {
  uuid: string;
  displayName: string;
  contentTierUuid: string | null;
  displayIcon: string | null;
  chromas: RawChroma[];
  levels: { uuid: string; displayIcon: string | null; streamedVideo: string | null }[];
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
): Promise<Wallet> {
  try {
    const w = await http<{ Balances: Record<string, number> }>(
      '지갑 조회',
      `${base}/store/v1/wallet/${puuid}`,
      { headers },
    );
    return {
      vp: w.Balances[VP_ID] ?? 0,
      radianite: w.Balances[RADIANITE_ID] ?? 0,
      kingdom: w.Balances[KINGDOM_ID] ?? 0,
    };
  } catch {
    return { vp: null, radianite: null, kingdom: null };
  }
}

/** 내가 가진 스킨 레벨 ID 목록 */
async function loadOwnedLevels(
  base: string,
  puuid: string,
  headers: Record<string, string>,
): Promise<string[]> {
  try {
    const r = await http<{ Entitlements: { ItemID: string }[] }>(
      '보유 스킨 조회',
      `${base}/store/v1/entitlements/${puuid}/${SKIN_LEVEL_TYPE}`,
      { headers },
    );
    return r.Entitlements.map((e) => e.ItemID);
  } catch {
    return [];
  }
}

const TIERS: SkinTier[] = ['Select', 'Deluxe', 'Premium', 'Exclusive', 'Ultra'];
const toTier = (devName: string | undefined): SkinTier =>
  TIERS.find((t) => t === devName) ?? 'Select';

interface CatalogCtx {
  byLevel: Map<string, { weapon: string; skin: RawSkin }>;
  tierById: Map<string, string>;
  slim: CatalogSkin[];
}

function buildCatalog(weapons: RawWeapon[], tiers: { uuid: string; devName: string }[]): CatalogCtx {
  const tierById = new Map(tiers.map((t) => [t.uuid, t.devName]));
  const byLevel = new Map<string, { weapon: string; skin: RawSkin }>();
  const slim: CatalogSkin[] = [];
  for (const w of weapons) {
    for (const s of w.skins) {
      for (const l of s.levels) byLevel.set(l.uuid, { weapon: w.displayName, skin: s });
      // 티어가 없는 스킨은 기본/랜덤 스킨이라 목록에서 뺀다
      if (!s.contentTierUuid || s.levels.length === 0) continue;
      slim.push({
        id: s.uuid,
        name: s.displayName,
        weapon: w.displayName,
        tier: toTier(tierById.get(s.contentTierUuid)),
        imageUrl: s.displayIcon ?? s.levels[0]?.displayIcon ?? s.chromas[0]?.fullRender ?? '',
        level1: s.levels[0].uuid,
      });
    }
  }
  return { byLevel, tierById, slim };
}

function makeSkin(
  offerId: string,
  price: number,
  cat: CatalogCtx,
  opts?: { idPrefix?: string; originalPrice?: number; discountPercent?: number },
): ValorantSkin {
  const id = `${opts?.idPrefix ?? ''}${offerId}`;
  const extra = { originalPrice: opts?.originalPrice, discountPercent: opts?.discountPercent };
  const hit = cat.byLevel.get(offerId);
  if (!hit) {
    return {
      id,
      skinId: offerId,
      name: '알 수 없는 스킨',
      weapon: '',
      price,
      tier: 'Select',
      imageUrl: '',
      chromas: [],
      levelCount: 1,
      videoUrl: null,
      ...extra,
    };
  }
  const { skin, weapon } = hit;
  const chromas: SkinChroma[] = skin.chromas
    .map((c) => ({
      id: c.uuid,
      name: c.displayName,
      imageUrl: c.fullRender ?? c.displayIcon ?? '',
      swatchUrl: c.swatch,
      videoUrl: c.streamedVideo,
    }))
    .filter((c) => c.imageUrl !== '');
  const videoUrl =
    [...skin.levels].reverse().find((l) => l.streamedVideo)?.streamedVideo ?? null;
  return {
    id,
    skinId: skin.uuid,
    name: skin.displayName,
    weapon,
    price,
    tier: toTier(skin.contentTierUuid ? cat.tierById.get(skin.contentTierUuid) : undefined),
    imageUrl: skin.displayIcon ?? skin.levels[0]?.displayIcon ?? chromas[0]?.imageUrl ?? '',
    chromas,
    levelCount: skin.levels.length,
    videoUrl,
    ...extra,
  };
}

export interface ShopResult {
  shop: DailyShop;
  catalog: CatalogSkin[];
}

/** 내 상점(일반/야시장/세트), 지갑, 보유 스킨을 한 번에 불러온다. */
export async function fetchMyShop(accessToken: string, region: Region): Promise<ShopResult> {
  const bearer = { Authorization: `Bearer ${accessToken}` };

  const [ent, user, ver] = await Promise.all([
    http<{ entitlements_token: string }>('인증 토큰 발급', 'https://entitlements.auth.riotgames.com/api/token/v1', {
      method: 'POST',
      headers: { ...bearer, 'Content-Type': 'application/json' },
      body: '{}',
    }),
    http<{ sub: string; acct?: { game_name?: string; tag_line?: string } }>(
      '내 정보 조회',
      'https://auth.riotgames.com/userinfo',
      { headers: bearer },
    ),
    http<{ data: { riotClientVersion: string } }>('게임 버전 조회', 'https://valorant-api.com/v1/version'),
  ]);

  const headers: Record<string, string> = {
    ...bearer,
    'X-Riot-Entitlements-JWT': ent.entitlements_token,
    'X-Riot-ClientPlatform': CLIENT_PLATFORM,
    'X-Riot-ClientVersion': ver.data.riotClientVersion,
  };
  const base = `https://pd.${region}.a.pvp.net`;

  const [store, wallet, ownedLevels, weapons, tiers] = await Promise.all([
    loadStorefront(base, user.sub, headers),
    loadWallet(base, user.sub, headers),
    loadOwnedLevels(base, user.sub, headers),
    http<{ data: RawWeapon[] }>('스킨 정보 조회', 'https://valorant-api.com/v1/weapons?language=ko-KR'),
    http<{ data: { uuid: string; devName: string }[] }>('티어 정보 조회', 'https://valorant-api.com/v1/contenttiers'),
  ]);

  const cat = buildCatalog(weapons.data, tiers.data);

  // 일반 상점
  const layout = store.SkinsPanelLayout;
  const offers =
    layout.SingleItemStoreOffers ??
    (layout.SingleItemOffers ?? []).map((id) => ({ OfferID: id, Cost: {} as CostMap }));
  const skins = offers.map((o) => makeSkin(o.OfferID, firstValue(o.Cost) ?? 0, cat));

  // 야시장 (열려 있을 때만 존재)
  const night = (store.BonusStore?.BonusStoreOffers ?? []).map((o) => {
    const original = firstValue(o.Offer.Cost) ?? 0;
    const discounted = firstValue(o.DiscountCosts) ?? original;
    return makeSkin(o.Offer.OfferID, discounted, cat, {
      idPrefix: 'nm-',
      originalPrice: original,
      discountPercent: o.DiscountPercent,
    });
  });

  // 판매 중인 세트
  const rawBundles = store.FeaturedBundle?.Bundles ?? [];
  const bundleInfo = new Map<string, { displayName: string; displayIcon: string | null; verticalPromoImage: string | null }>();
  if (rawBundles.length > 0) {
    try {
      const r = await http<{
        data: { uuid: string; displayName: string; displayIcon: string | null; verticalPromoImage: string | null }[];
      }>('세트 정보 조회', 'https://valorant-api.com/v1/bundles?language=ko-KR');
      r.data.forEach((b) => bundleInfo.set(b.uuid, b));
    } catch {
      /* 이름/이미지 없이도 보여준다 */
    }
  }
  const bundles: ShopBundle[] = rawBundles.map((b) => {
    const info = bundleInfo.get(b.DataAssetID);
    const items: BundleItem[] = [];
    let otherCount = 0;
    let baseSum = 0;
    let priceSum = 0;
    for (const it of b.Items ?? []) {
      const price = it.DiscountedPrice ?? it.BasePrice ?? null;
      baseSum += it.BasePrice ?? price ?? 0;
      priceSum += price ?? 0;
      if (it.Item.ItemTypeID === SKIN_LEVEL_TYPE) {
        const hit = cat.byLevel.get(it.Item.ItemID);
        items.push({
          name: hit?.skin.displayName ?? '스킨',
          imageUrl: hit?.skin.displayIcon ?? hit?.skin.levels[0]?.displayIcon ?? '',
          price,
          basePrice: it.BasePrice ?? null,
          skinId: hit?.skin.uuid,
          weapon: hit?.weapon,
          tier: hit
            ? toTier(hit.skin.contentTierUuid ? cat.tierById.get(hit.skin.contentTierUuid) : undefined)
            : undefined,
        });
      } else {
        otherCount += 1;
      }
    }
    return {
      id: b.DataAssetID,
      name: info?.displayName ?? '이름 없는 세트',
      imageUrl: info?.displayIcon ?? info?.verticalPromoImage ?? '',
      items,
      otherCount,
      basePrice: firstValue(b.TotalBaseCost),
      price: firstValue(b.TotalDiscountedCost),
      discountPercent: b.TotalDiscountPercent ?? null,
      remainingSeconds: b.DurationRemainingInSeconds ?? 0,
      itemsBaseTotal: baseSum || null,
      itemsPriceTotal: priceSum || null,
    };
  });

  // 보유 스킨 (기본 스킨 제외)
  const owned = new Set<string>();
  for (const lv of ownedLevels) {
    const hit = cat.byLevel.get(lv);
    if (hit && hit.skin.contentTierUuid) owned.add(hit.skin.uuid);
  }

  const game = user.acct?.game_name;
  const tag = user.acct?.tag_line;

  return {
    shop: {
      skins,
      remainingSeconds: layout.SingleItemOffersRemainingDurationInSeconds ?? 0,
      fetchedAt: Date.now(),
      riotId: game ? `${game}#${tag ?? ''}` : 'Riot 계정',
      wallet,
      night,
      nightRemainingSeconds: store.BonusStore?.BonusStoreRemainingDurationInSeconds ?? 0,
      bundles,
      ownedSkinIds: Array.from(owned),
    },
    catalog: cat.slim,
  };
}

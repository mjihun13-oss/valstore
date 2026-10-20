export type SkinTier = 'Select' | 'Deluxe' | 'Premium' | 'Exclusive' | 'Ultra';

/** none: 효과 없음 / aura: 파동+별빛 / sparks: 불꽃 폭발 / storm: 번개+충격파 */
export type TierEffect = 'none' | 'aura' | 'sparks' | 'storm';

export interface SkinChroma {
  id: string;
  name: string;
  imageUrl: string;
  swatchUrl: string | null;
  videoUrl: string | null;
}

export interface ValorantSkin {
  /** 화면/저장용 고유 키 (일반 상점: OfferID, 야시장: nm-OfferID) */
  id: string;
  /** 스킨 UUID (위시리스트/컬렉션 매칭용) */
  skinId: string;
  name: string;
  /** 총기 종류 (예: Vandal) */
  weapon: string;
  /** 지금 결제해야 하는 VP (야시장은 할인가) */
  price: number;
  tier: SkinTier;
  /** 실제 스킨 이미지 URL */
  imageUrl: string;
  chromas: SkinChroma[];
  levelCount: number;
  /** 미리보기 영상 URL (없으면 null) */
  videoUrl: string | null;
  /** 야시장 정가 / 할인율 */
  originalPrice?: number;
  discountPercent?: number;
}

export interface Wallet {
  vp: number | null;
  radianite: number | null;
  kingdom: number | null;
}

export interface BundleItem {
  name: string;
  imageUrl: string;
  /** 이 구성품을 따로 살 때의 가격 */
  price: number | null;
  basePrice?: number | null;
  /** 미리보기를 열 수 있는 스킨이면 값이 있다 */
  skinId?: string;
  weapon?: string;
  tier?: SkinTier;
}

export interface ShopBundle {
  id: string;
  name: string;
  imageUrl: string;
  items: BundleItem[];
  /** 스킨이 아닌 구성품(스프레이, 총기 장식 등) 개수 */
  otherCount: number;
  basePrice: number | null;
  price: number | null;
  discountPercent: number | null;
  remainingSeconds: number;
  /** 구성품 정가 합계 / 구성품을 따로 샀을 때 가격 합계 */
  itemsBaseTotal?: number | null;
  itemsPriceTotal?: number | null;
}

/** 위시리스트·세트·컬렉션에서 스킨을 눌렀을 때 보여주는 미리보기용 정보 */
export interface PreviewSkin {
  skinId: string;
  name: string;
  weapon: string;
  tier: SkinTier;
  imageUrl: string;
  price?: number | null;
}

/** 위시리스트 검색/컬렉션 표시용으로 기기에 저장하는 가벼운 스킨 목록 */
export interface CatalogSkin {
  id: string;
  name: string;
  weapon: string;
  tier: SkinTier;
  imageUrl: string;
  /** 1레벨 UUID (보유 여부 판별용) */
  level1: string;
}

export interface DailyShop {
  skins: ValorantSkin[];
  remainingSeconds: number;
  /** 불러온 시각 (epoch ms) */
  fetchedAt: number;
  riotId: string;
  wallet: Wallet;
  night: ValorantSkin[];
  nightRemainingSeconds: number;
  bundles: ShopBundle[];
  /** 내가 가진 스킨 UUID 목록 */
  ownedSkinIds: string[];
}

export interface VpPackage {
  id: string;
  vp: number;
  priceKrw: number;
}

export interface PackagePurchase {
  pkg: VpPackage;
  count: number;
}

export type RecommendationKind = 'bestValue' | 'exact' | 'smartPick';

export interface VpRecommendation {
  kind: RecommendationKind;
  label: string;
  description: string;
  purchases: PackagePurchase[];
  packageCount: number;
  totalVp: number;
  totalPriceKrw: number;
  residualVp: number;
  vpPerKrw: number;
}

export interface VpRecommendationSet {
  requiredVp: number;
  ownedVp: number;
  neededVp: number;
  bestValue: VpRecommendation | null;
  exact: VpRecommendation | null;
  smartPick: VpRecommendation | null;
}

export interface TierStyle {
  label: string;
  color: string;
  from: string;
  effect: TierEffect;
}

export const TIER_STYLES: Record<SkinTier, TierStyle> = {
  Select: { label: 'Select', color: '#00C2FF', from: '#0B3A52', effect: 'none' },
  Deluxe: { label: 'Deluxe', color: '#2BFFA0', from: '#0B4A38', effect: 'none' },
  Premium: { label: 'Premium', color: '#FF5CAD', from: '#4A1A55', effect: 'aura' },
  Exclusive: { label: 'Exclusive', color: '#FFC94D', from: '#5A3A0A', effect: 'sparks' },
  Ultra: { label: 'Ultra', color: '#FFD54A', from: '#5E1620', effect: 'storm' },
};

/** 발로란트 UI 특유의 모서리 컷 (버튼/패널용) */
export const NOTCH_CLIP =
  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))';

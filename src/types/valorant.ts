export type SkinTier = 'Select' | 'Deluxe' | 'Premium' | 'Exclusive' | 'Ultra';

/** none: 효과 없음 / aura: 파동+별빛 / sparks: 불꽃 폭발 / storm: 번개+충격파 */
export type TierEffect = 'none' | 'aura' | 'sparks' | 'storm';

export interface SkinChroma {
  id: string;
  name: string;
  imageUrl: string;
  swatchUrl: string | null;
}

export interface ValorantSkin {
  /** 상점 OfferID (= 스킨 레벨 UUID) */
  id: string;
  name: string;
  /** 총기 종류 (예: Vandal) */
  weapon: string;
  /** VP 가격 */
  price: number;
  tier: SkinTier;
  /** 실제 스킨 이미지 URL */
  imageUrl: string;
  chromas: SkinChroma[];
  levelCount: number;
}

export interface DailyShop {
  skins: ValorantSkin[];
  remainingSeconds: number;
  /** 불러온 시각 (epoch ms) */
  fetchedAt: number;
  /** 지갑의 보유 VP (조회 실패 시 null) */
  vp: number | null;
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

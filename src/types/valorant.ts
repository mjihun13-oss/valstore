export type SkinTier = 'Select' | 'Deluxe' | 'Premium' | 'Exclusive' | 'Ultra';

export interface ValorantSkin {
  id: string;
  name: string;
  /** 총기 종류 (예: Vandal, Phantom) */
  weapon: string;
  /** 기본 VP 가격 */
  price: number;
  tier: SkinTier;
  imageUrl: string;
}

export interface DailyShop {
  skins: ValorantSkin[];
  /** 로테이션 종료까지 남은 초 (선택) */
  remainingSeconds?: number;
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
  /** 구매로 얻는 총 VP */
  totalVp: number;
  totalPriceKrw: number;
  /** 스킨 구매 후 남는 VP */
  residualVp: number;
  /** 1원당 VP */
  vpPerKrw: number;
}

export interface VpRecommendationSet {
  requiredVp: number;
  ownedVp: number;
  /** max(0, requiredVp - ownedVp) */
  neededVp: number;
  bestValue: VpRecommendation | null;
  exact: VpRecommendation | null;
  smartPick: VpRecommendation | null;
}

export interface TierStyle {
  label: string;
  color: string;
  /** box-shadow 용 반투명 색 */
  glow: string;
  /** 카드 배경 그라데이션 시작색 */
  from: string;
  particleColors: string[];
  particleCount: number;
  shake: boolean;
}

export const TIER_STYLES: Record<SkinTier, TierStyle> = {
  Select: {
    label: 'Select',
    color: '#00C2FF',
    glow: 'rgba(0, 194, 255, 0.55)',
    from: '#0B3A52',
    particleColors: [],
    particleCount: 0,
    shake: false,
  },
  Deluxe: {
    label: 'Deluxe',
    color: '#2BFFA0',
    glow: 'rgba(43, 255, 160, 0.5)',
    from: '#0B4A38',
    particleColors: [],
    particleCount: 0,
    shake: false,
  },
  Premium: {
    label: 'Premium',
    color: '#FF5CAD',
    glow: 'rgba(182, 107, 255, 0.6)',
    from: '#4A1A55',
    particleColors: ['#FF5CAD', '#B66BFF', '#FFFFFF'],
    particleCount: 14,
    shake: false,
  },
  Exclusive: {
    label: 'Exclusive',
    color: '#FFC94D',
    glow: 'rgba(255, 201, 77, 0.65)',
    from: '#5A3A0A',
    particleColors: ['#FFC94D', '#FF4655', '#FFE8A3'],
    particleCount: 30,
    shake: true,
  },
  Ultra: {
    label: 'Ultra',
    color: '#FFD54A',
    glow: 'rgba(255, 70, 85, 0.7)',
    from: '#5E1620',
    particleColors: ['#FFD54A', '#FF4655', '#FFFFFF'],
    particleCount: 36,
    shake: true,
  },
};

/** 발로란트 UI 특유의 모서리 컷 (버튼/패널용) */
export const NOTCH_CLIP =
  'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))';

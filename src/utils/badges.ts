import type { SkinTier } from '../types/valorant';
import type { UserStats } from './storage';

export type BadgeIcon =
  | 'hand'
  | 'sparkles'
  | 'flame'
  | 'crown'
  | 'heart'
  | 'gem'
  | 'moon'
  | 'share'
  | 'trophy';

export interface BadgeContext {
  stats: UserStats;
  ownedCount: number;
  ownedByTier: Record<SkinTier, number>;
  wishCount: number;
}

interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  icon: BadgeIcon;
  color: string;
  target: number;
  metric: (c: BadgeContext) => number;
}

export interface BadgeStatus {
  id: string;
  name: string;
  desc: string;
  icon: BadgeIcon;
  color: string;
  current: number;
  target: number;
  earned: boolean;
}

const DEFS: BadgeDef[] = [
  { id: 'first', name: '첫 스크래치', desc: '카드를 처음 긁어 열기', icon: 'hand', color: '#ECE8E1', target: 1, metric: (c) => c.stats.reveals },
  { id: 'scratch30', name: '스크래치 장인', desc: '카드 30장 열기', icon: 'hand', color: '#00C2FF', target: 30, metric: (c) => c.stats.reveals },
  { id: 'scratch100', name: '전설의 손끝', desc: '카드 100장 열기', icon: 'hand', color: '#FFD54A', target: 100, metric: (c) => c.stats.reveals },
  { id: 'premium', name: '핑크빛 설렘', desc: 'Premium 스킨 3번 만나기', icon: 'sparkles', color: '#FF5CAD', target: 3, metric: (c) => c.stats.premiumSeen },
  { id: 'exclusive', name: '황금빛 순간', desc: 'Exclusive 스킨 3번 만나기', icon: 'flame', color: '#FFC94D', target: 3, metric: (c) => c.stats.exclusiveSeen },
  { id: 'ultra', name: '울트라 목격자', desc: 'Ultra 스킨 만나기', icon: 'crown', color: '#FF4655', target: 1, metric: (c) => c.stats.ultraSeen },
  { id: 'wish1', name: '소원 성취', desc: '위시리스트 스킨 만나기', icon: 'heart', color: '#FF5CAD', target: 1, metric: (c) => c.stats.wishHits },
  { id: 'wish5', name: '운명의 상점', desc: '위시리스트 스킨 5번 만나기', icon: 'heart', color: '#FF4655', target: 5, metric: (c) => c.stats.wishHits },
  { id: 'own25', name: '스킨 수집가', desc: '스킨 25개 보유', icon: 'gem', color: '#2BFFA0', target: 25, metric: (c) => c.ownedCount },
  { id: 'own100', name: '스킨 부자', desc: '스킨 100개 보유', icon: 'gem', color: '#FFD54A', target: 100, metric: (c) => c.ownedCount },
  { id: 'ultraOwn', name: '울트라 오너', desc: 'Ultra 스킨 보유', icon: 'crown', color: '#FFD54A', target: 1, metric: (c) => c.ownedByTier.Ultra },
  { id: 'exclusiveOwn', name: '익스클루시브 컬렉터', desc: 'Exclusive 스킨 5개 보유', icon: 'trophy', color: '#FFC94D', target: 5, metric: (c) => c.ownedByTier.Exclusive },
  { id: 'night', name: '야시장 사냥꾼', desc: '야시장 3번 방문', icon: 'moon', color: '#B66BFF', target: 3, metric: (c) => c.stats.nightVisits },
  { id: 'share', name: '자랑왕', desc: '자랑하기 5번', icon: 'share', color: '#00C2FF', target: 5, metric: (c) => c.stats.shares },
];

export function evaluateBadges(ctx: BadgeContext): BadgeStatus[] {
  return DEFS.map((d) => {
    const current = d.metric(ctx);
    return {
      id: d.id,
      name: d.name,
      desc: d.desc,
      icon: d.icon,
      color: d.color,
      current: Math.min(current, d.target),
      target: d.target,
      earned: current >= d.target,
    };
  });
}

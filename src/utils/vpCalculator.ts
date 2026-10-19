import type {
  RecommendationKind,
  VpPackage,
  VpRecommendation,
  VpRecommendationSet,
} from '../types/valorant';

/** 한국(KRW) 기준 VP 충전 패키지 */
export const VP_PACKAGES: readonly VpPackage[] = [
  { id: 'vp-500', vp: 500, priceKrw: 5900 },
  { id: 'vp-1150', vp: 1150, priceKrw: 13000 },
  { id: 'vp-2400', vp: 2400, priceKrw: 26000 },
  { id: 'vp-5350', vp: 5350, priceKrw: 55000 },
  { id: 'vp-11000', vp: 11000, priceKrw: 109000 },
];

/** 모든 패키지 VP의 최대공약수 → DP 상태를 50VP 단위로 압축 */
const UNIT_VP = 50;
const MAX_NEEDED_VP = 200_000;
const PKG_UNITS = VP_PACKAGES.map((p) => p.vp / UNIT_VP);
const MAX_PKG_UNITS = Math.max(...PKG_UNITS);

interface DpTable {
  /** cost[u] = 정확히 u 단위(×50VP)를 만드는 최소 결제 금액 */
  cost: number[];
  /** choice[u] = 그 최소 금액에 마지막으로 쓰인 패키지 인덱스 */
  choice: number[];
}

interface Candidate {
  units: number;
  priceKrw: number;
}

/** 무제한 배낭(unbounded knapsack) 방식의 정확 합 최소비용 DP */
function buildTable(limitUnits: number): DpTable {
  const cost: number[] = new Array<number>(limitUnits + 1).fill(Infinity);
  const choice: number[] = new Array<number>(limitUnits + 1).fill(-1);
  cost[0] = 0;

  for (let u = 1; u <= limitUnits; u += 1) {
    for (let i = 0; i < VP_PACKAGES.length; i += 1) {
      const pu = PKG_UNITS[i];
      if (u < pu) continue;
      const prev = cost[u - pu];
      if (prev === Infinity) continue;
      const next = prev + VP_PACKAGES[i].priceKrw;
      if (next < cost[u]) {
        cost[u] = next;
        choice[u] = i;
      }
    }
  }
  return { cost, choice };
}

function reconstructCounts(units: number, table: DpTable): number[] {
  const counts = new Array<number>(VP_PACKAGES.length).fill(0);
  let u = units;
  while (u > 0) {
    const i = table.choice[u];
    if (i < 0) break;
    counts[i] += 1;
    u -= PKG_UNITS[i];
  }
  return counts;
}

function pickBest(
  candidates: Candidate[],
  isBetter: (a: Candidate, b: Candidate) => boolean,
): Candidate | null {
  let best: Candidate | null = null;
  for (const c of candidates) {
    if (best === null || isBetter(c, best)) best = c;
  }
  return best;
}

function toRecommendation(
  kind: RecommendationKind,
  label: string,
  description: string,
  candidate: Candidate,
  table: DpTable,
  neededVp: number,
): VpRecommendation {
  const counts = reconstructCounts(candidate.units, table);
  const purchases = VP_PACKAGES.map((pkg, i) => ({ pkg, count: counts[i] }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.pkg.vp - a.pkg.vp);
  const totalVp = candidate.units * UNIT_VP;

  return {
    kind,
    label,
    description,
    purchases,
    packageCount: purchases.reduce((sum, p) => sum + p.count, 0),
    totalVp,
    totalPriceKrw: candidate.priceKrw,
    residualVp: totalVp - neededVp,
    vpPerKrw: totalVp / candidate.priceKrw,
  };
}

/**
 * 필요 VP / 보유 VP로 3가지 충전 조합을 계산한다.
 *
 * - bestValue : 1원당 VP(= 보너스 비율)가 가장 높은 조합 (부족분 이상)
 * - exact     : 구매 후 잔여 VP가 가장 적은 조합
 * - smartPick : 부족분만 넘기는 최소 현금 지출 조합 (동률이면 잔여 VP 최소)
 */
export function calculateVpRecommendations(
  requiredVp: number,
  ownedVp = 0,
): VpRecommendationSet {
  const required = Math.max(0, Math.floor(requiredVp));
  const owned = Math.max(0, Math.floor(ownedVp));
  const neededVp = Math.max(0, required - owned);

  const empty: VpRecommendationSet = {
    requiredVp: required,
    ownedVp: owned,
    neededVp,
    bestValue: null,
    exact: null,
    smartPick: null,
  };
  if (neededVp === 0 || neededVp > MAX_NEEDED_VP) return empty;

  const minUnits = Math.ceil(neededVp / UNIT_VP);
  // 부족분을 넘긴 뒤 가장 큰 패키지 하나 이상을 더 사는 조합은 항상 비효율적이므로 범위를 제한한다.
  const limit = minUnits + MAX_PKG_UNITS;
  const table = buildTable(limit);

  const candidates: Candidate[] = [];
  for (let u = minUnits; u <= limit; u += 1) {
    if (table.cost[u] !== Infinity) {
      candidates.push({ units: u, priceKrw: table.cost[u] });
    }
  }
  if (candidates.length === 0) return empty;

  const best = pickBest(candidates, (a, b) => {
    // a.units / a.price > b.units / b.price (정수 교차곱으로 비교)
    const lhs = a.units * b.priceKrw;
    const rhs = b.units * a.priceKrw;
    return lhs > rhs || (lhs === rhs && a.priceKrw < b.priceKrw);
  });
  const exact = pickBest(
    candidates,
    (a, b) => a.units < b.units || (a.units === b.units && a.priceKrw < b.priceKrw),
  );
  const smart = pickBest(
    candidates,
    (a, b) => a.priceKrw < b.priceKrw || (a.priceKrw === b.priceKrw && a.units < b.units),
  );

  return {
    ...empty,
    bestValue: best
      ? toRecommendation(
          'bestValue',
          '최대 효율',
          '1원당 받는 VP가 가장 많은 조합이에요. 보너스 VP 비율이 가장 높지만 남는 VP가 클 수 있어요.',
          best,
          table,
          neededVp,
        )
      : null,
    exact: exact
      ? toRecommendation(
          'exact',
          '딱 맞춤',
          '구매 후 남는 VP를 가장 적게 만드는 조합이에요. 다음 스킨까지 VP가 묶이지 않아요.',
          exact,
          table,
          neededVp,
        )
      : null,
    smartPick: smart
      ? toRecommendation(
          'smartPick',
          '가장 추천',
          '부족한 VP만 채우면서 지출을 가장 적게 쓰는 균형 잡힌 조합이에요.',
          smart,
          table,
          neededVp,
        )
      : null,
  };
}

export const formatKrw = (n: number): string => `${Math.round(n).toLocaleString('ko-KR')}원`;
export const formatVp = (n: number): string => `${Math.round(n).toLocaleString('ko-KR')} VP`;

import { useMemo, useState } from 'react';
import { Coins } from 'lucide-react';
import VpGuideModal from './VpGuideModal';
import { calculateVpRecommendations, formatKrw, formatVp } from '../utils/vpCalculator';

interface VpAdviceProps {
  title: string;
  price: number;
  ownedVp: number;
}

/** 가격과 보유 VP로 "얼마를 충전하면 되는지" 한눈에 보여주는 상자 */
export default function VpAdvice({ title, price, ownedVp }: VpAdviceProps) {
  const [open, setOpen] = useState(false);
  const recs = useMemo(() => calculateVpRecommendations(price, ownedVp), [price, ownedVp]);
  const smart = recs.smartPick;

  return (
    <section className="bg-[#1B2733] p-4" aria-label="VP 구매 추천">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Coins size={16} color="#FF4655" />
        {title}
      </h3>
      <p className="mt-2 flex items-baseline justify-between">
        <span className="text-sm text-[#ECE8E1]/70">가격</span>
        <b className="text-lg text-[#FFC94D]">{formatVp(price)}</b>
      </p>

      {recs.neededVp === 0 ? (
        <p className="mt-2 text-sm">보유 VP({formatVp(ownedVp)})로 바로 살 수 있어요.</p>
      ) : (
        smart && (
          <>
            <p className="mt-2 text-sm text-[#ECE8E1]/80">
              {formatVp(recs.neededVp)}가 부족해요. 가장 적게 쓰는 조합은
            </p>
            <ul className="mt-1 text-sm font-bold">
              {smart.purchases.map((p) => (
                <li key={p.pkg.id}>
                  {formatVp(p.pkg.vp)} × {p.count}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm text-[#ECE8E1]/80">
              {formatKrw(smart.totalPriceKrw)} 결제, 구매 후 {formatVp(smart.residualVp)} 남아요.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 h-10 w-full bg-[#0F1923] text-sm font-bold hover:bg-black"
            >
              조합 3가지 비교하기
            </button>
          </>
        )
      )}

      <VpGuideModal open={open} onClose={() => setOpen(false)} recommendations={recs} />
    </section>
  );
}

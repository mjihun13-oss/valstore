import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingDown, X } from 'lucide-react';
import VpGuideModal from './VpGuideModal';
import { TIER_STYLES } from '../types/valorant';
import type { BundleItem, ShopBundle } from '../types/valorant';
import { formatCountdown, secondsLeft } from '../utils/time';
import { calculateVpRecommendations, formatKrw, formatVp } from '../utils/vpCalculator';

interface BundleDetailProps {
  bundle: ShopBundle;
  fetchedAt: number;
  now: number;
  ownedVp: number;
  onClose: () => void;
  onOpenItem: (item: BundleItem) => void;
}

const pct = (save: number, total: number): number => (total > 0 ? Math.round((save / total) * 100) : 0);

function Line({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-[#ECE8E1]/70">{label}</span>
      <span className={strong ? 'text-lg font-black' : 'text-sm font-bold'} style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export default function BundleDetail({ bundle, fetchedAt, now, ownedVp, onClose, onOpenItem }: BundleDetailProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guideOpen) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, guideOpen]);

  const price = bundle.price;
  const listTotal = bundle.basePrice ?? bundle.itemsBaseTotal ?? null;
  const separateTotal = bundle.itemsPriceTotal ?? null;
  const left = secondsLeft(fetchedAt, bundle.remainingSeconds, now);

  const saveVsList = listTotal !== null && price !== null ? listTotal - price : null;
  const saveVsSeparate = separateTotal !== null && price !== null ? separateTotal - price : null;

  const recs = useMemo(() => calculateVpRecommendations(price ?? 0, ownedVp), [price, ownedVp]);
  const smart = recs.smartPick;

  const pickedTotal = picked.reduce((sum, i) => sum + (bundle.items[i]?.price ?? 0), 0);
  const togglePick = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto bg-[#0F1923]"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#ECE8E1]/70">세트 상세</span>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-2 text-[#ECE8E1]/80 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {bundle.imageUrl && (
          <img src={bundle.imageUrl} alt="" draggable={false} className="max-h-56 w-full bg-black/30 object-contain" />
        )}

        <div>
          <h2 className="text-xl font-black leading-tight">{bundle.name}</h2>
          <p className="mt-1 text-xs text-[#ECE8E1]/60">판매 종료까지 {formatCountdown(left)}</p>
        </div>

        <section className="space-y-2 bg-[#1B2733] p-4" aria-label="가격 비교">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <TrendingDown size={16} color="#2BFFA0" />
            세트로 사면 얼마나 싼가요?
          </h3>
          {listTotal !== null && <Line label="구성품 정가 합계" value={formatVp(listTotal)} />}
          {separateTotal !== null && <Line label="구성품을 따로 살 때" value={formatVp(separateTotal)} />}
          <Line label="세트 가격" value={price !== null ? formatVp(price) : '-'} strong color="#FFC94D" />
          {saveVsList !== null && saveVsList > 0 && listTotal !== null && (
            <p className="pt-1 text-sm font-bold text-[#2BFFA0]">
              정가보다 {formatVp(saveVsList)}({pct(saveVsList, listTotal)}%) 저렴해요
            </p>
          )}
          {saveVsSeparate !== null && separateTotal !== null && (
            <p className="text-sm text-[#2BFFA0]">
              {saveVsSeparate > 0
                ? `따로 사는 것보다 ${formatVp(saveVsSeparate)}(${pct(saveVsSeparate, separateTotal)}%) 저렴해요`
                : '따로 사는 것과 가격이 같아요'}
            </p>
          )}
          {bundle.otherCount > 0 && (
            <p className="text-xs text-[#ECE8E1]/60">스프레이·장식 등 {bundle.otherCount}개도 함께 들어 있어요.</p>
          )}
        </section>

        <section aria-label="구성 스킨">
          <h3 className="mb-1 text-sm font-bold">구성 스킨 {bundle.items.length}개</h3>
          <p className="mb-2 text-xs text-[#ECE8E1]/60">
            이미지를 누르면 미리보기, 오른쪽 칸을 누르면 일부만 살 때 가격을 비교해요.
          </p>
          <ul className="space-y-2">
            {bundle.items.map((it, i) => {
              const tierStyle = it.tier ? TIER_STYLES[it.tier] : null;
              const on = picked.includes(i);
              return (
                <li key={`${it.name}-${i}`} className="flex items-center gap-2 bg-[#1B2733] p-2">
                  <button
                    type="button"
                    disabled={!it.skinId}
                    onClick={() => onOpenItem(it)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                    aria-label={`${it.name} 미리보기`}
                  >
                    <div className="h-14 w-20 shrink-0 bg-[#0F1923] p-1">
                      {it.imageUrl && (
                        <img src={it.imageUrl} alt="" draggable={false} loading="lazy" className="h-full w-full object-contain" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{it.name}</p>
                      <p className="mt-0.5 text-xs text-[#ECE8E1]/60">
                        {tierStyle && <span style={{ color: tierStyle.color }}>{tierStyle.label} · </span>}
                        {it.price !== null ? formatVp(it.price) : '-'}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePick(i)}
                    aria-pressed={on}
                    aria-label={`${it.name} 따로 사기 비교`}
                    className={`h-10 w-14 shrink-0 text-xs font-bold ${
                      on ? 'bg-[#FF4655] text-white' : 'bg-[#0F1923] text-[#ECE8E1]/70'
                    }`}
                  >
                    {on ? '선택됨' : '따로'}
                  </button>
                </li>
              );
            })}
          </ul>

          {picked.length > 0 && price !== null && (
            <div className="mt-3 bg-[#1B2733] p-3 text-sm">
              <p>
                고른 {picked.length}개만 따로 사면 <b>{formatVp(pickedTotal)}</b>
              </p>
              <p className="mt-1 font-bold text-[#FFC94D]">
                {pickedTotal >= price
                  ? `세트(${formatVp(price)})가 ${formatVp(pickedTotal - price)} 더 싸고 구성품도 더 많이 받아요.`
                  : `세트보다 ${formatVp(price - pickedTotal)} 아낄 수 있지만 나머지 구성품은 받지 못해요.`}
              </p>
            </div>
          )}
        </section>

        {price !== null && (
          <section className="bg-[#1B2733] p-4" aria-label="VP 구매 추천">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Coins size={16} color="#FF4655" />이 세트를 사려면
            </h3>
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
                    onClick={() => setGuideOpen(true)}
                    className="mt-3 h-10 w-full bg-[#0F1923] text-sm font-bold hover:bg-black"
                  >
                    조합 3가지 비교하기
                  </button>
                </>
              )
            )}
          </section>
        )}
      </div>

      <VpGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} recommendations={recs} />
    </motion.div>
  );
}

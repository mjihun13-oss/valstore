import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Sparkles, Target, TrendingUp, X } from 'lucide-react';
import { NOTCH_CLIP } from '../types/valorant';
import type { VpRecommendation, VpRecommendationSet } from '../types/valorant';
import { formatKrw, formatVp } from '../utils/vpCalculator';

interface VpGuideModalProps {
  open: boolean;
  onClose: () => void;
  recommendations: VpRecommendationSet | null;
}

type PickKey = 'smartPick' | 'bestValue' | 'exact';

const ORDER: { key: PickKey; icon: typeof Sparkles; accent: string }[] = [
  { key: 'smartPick', icon: Sparkles, accent: '#FF4655' },
  { key: 'bestValue', icon: TrendingUp, accent: '#FFC94D' },
  { key: 'exact', icon: Target, accent: '#00C2FF' },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-[#ECE8E1]/60">{label}</span>
      <span className="text-sm font-bold text-[#ECE8E1]">{value}</span>
    </div>
  );
}

function RecommendationCard({
  rec,
  accent,
  icon: Icon,
  active,
  onSelect,
}: {
  rec: VpRecommendation;
  accent: string;
  icon: typeof Sparkles;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className="w-full bg-[#1B2733] p-4 text-left transition-colors hover:bg-[#223244]"
      style={{
        clipPath: NOTCH_CLIP,
        boxShadow: active ? `inset 0 0 0 2px ${accent}` : 'inset 0 0 0 1px rgba(236,232,225,0.12)',
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={18} color={accent} />
        <span className="font-black text-[#ECE8E1]">{rec.label}</span>
        {rec.kind === 'smartPick' && (
          <span className="bg-[#FF4655] px-1.5 py-0.5 text-[10px] font-bold text-white">추천</span>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#ECE8E1]/70">{rec.description}</p>

      <ul className="mt-3 space-y-1 text-sm text-[#ECE8E1]">
        {rec.purchases.map((p) => (
          <li key={p.pkg.id} className="flex justify-between">
            <span>
              {formatVp(p.pkg.vp)} × {p.count}
            </span>
            <span className="text-[#ECE8E1]/70">{formatKrw(p.pkg.priceKrw * p.count)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-3">
        <Stat label="총 결제 금액" value={formatKrw(rec.totalPriceKrw)} />
        <Stat label="충전되는 VP" value={formatVp(rec.totalVp)} />
        <Stat label="구매 후 남는 VP" value={formatVp(rec.residualVp)} />
        <Stat label="1,000원당 VP" value={`${(rec.vpPerKrw * 1000).toFixed(1)} VP`} />
      </div>
    </button>
  );
}

export default function VpGuideModal({ open, onClose, recommendations }: VpGuideModalProps) {
  const [selected, setSelected] = useState<PickKey>('smartPick');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const current = recommendations ? recommendations[selected] : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="VP 구매 가이드"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto bg-[#0F1923] p-5 text-[#ECE8E1] sm:max-w-xl"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <Coins size={20} color="#FF4655" />
                VP 구매 가이드
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="p-1 text-[#ECE8E1]/70 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {!recommendations || recommendations.requiredVp === 0 ? (
              <p className="mt-6 text-sm text-[#ECE8E1]/70">
                구매 목록에 스킨을 담으면 필요한 VP와 충전 조합을 계산해 드려요.
              </p>
            ) : recommendations.neededVp === 0 ? (
              <p className="mt-6 text-sm">
                보유 VP로 모두 구매할 수 있어요. 따로 충전하지 않아도 돼요.
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2 bg-[#1B2733] p-3">
                  <Stat label="필요한 VP" value={formatVp(recommendations.requiredVp)} />
                  <Stat label="보유 VP" value={formatVp(recommendations.ownedVp)} />
                  <Stat label="부족한 VP" value={formatVp(recommendations.neededVp)} />
                </div>

                <div className="mt-4 space-y-3">
                  {ORDER.map(({ key, icon, accent }) => {
                    const rec = recommendations[key];
                    return rec ? (
                      <RecommendationCard
                        key={key}
                        rec={rec}
                        accent={accent}
                        icon={icon}
                        active={selected === key}
                        onSelect={() => setSelected(key)}
                      />
                    ) : null;
                  })}
                </div>

                {current && (
                  <div className="mt-5">
                    <h3 className="text-sm font-bold">{current.label} 구매 순서</h3>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[#ECE8E1]/85">
                      <li>발로란트 상점에서 VP 충전을 선택해요.</li>
                      {current.purchases.map((p) => (
                        <li key={p.pkg.id}>
                          {formatVp(p.pkg.vp)} 패키지를 {p.count}번 결제해요 ({formatKrw(p.pkg.priceKrw * p.count)}).
                        </li>
                      ))}
                      <li>
                        충전 후 스킨을 구매하면 {formatVp(current.residualVp)}가 남아요.
                      </li>
                    </ol>
                  </div>
                )}

                <p className="mt-5 text-[11px] leading-relaxed text-[#ECE8E1]/50">
                  패키지 가격은 앱에 입력된 한국 기준 데이터예요. 결제 전에 게임 내 상점의 실제 가격을 확인하세요.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

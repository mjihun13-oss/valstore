import type { BundleItem, ShopBundle } from '../types/valorant';
import { formatCountdown, secondsLeft } from '../utils/time';

interface BundlesViewProps {
  bundles: ShopBundle[];
  fetchedAt: number;
  now: number;
  onOpenBundle: (id: string) => void;
  onOpenItem: (item: BundleItem) => void;
}

const vp = (n: number | null): string => (n === null ? '-' : `${n.toLocaleString('ko-KR')} VP`);

export default function BundlesView({ bundles, fetchedAt, now, onOpenBundle, onOpenItem }: BundlesViewProps) {
  if (bundles.length === 0) {
    return <p className="py-16 text-center text-sm text-[#ECE8E1]/60">지금 판매 중인 세트가 없어요.</p>;
  }

  return (
    <div className="space-y-5">
      {bundles.map((b) => {
        const left = secondsLeft(fetchedAt, b.remainingSeconds, now);
        return (
          <article key={b.id} className="overflow-hidden bg-[#1B2733]">
            {b.imageUrl && (
              <img src={b.imageUrl} alt="" draggable={false} className="max-h-56 w-full bg-black/30 object-contain" />
            )}
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-black leading-tight">{b.name}</h3>
                {b.discountPercent !== null && b.discountPercent > 0 && (
                  <span className="shrink-0 bg-[#FF4655] px-2 py-0.5 text-xs font-bold text-white">
                    -{b.discountPercent}%
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-[#FFC94D]">{vp(b.price)}</span>
                {b.basePrice !== null && b.basePrice !== b.price && (
                  <s className="text-sm text-[#ECE8E1]/50">{vp(b.basePrice)}</s>
                )}
              </div>
              <p className="text-xs text-[#ECE8E1]/60">판매 종료까지 {formatCountdown(left)}</p>

              {b.items.length > 0 && (
                <ul className="grid grid-cols-2 gap-2">
                  {b.items.map((it, i) => (
                    <li key={`${it.name}-${i}`}>
                      <button
                        type="button"
                        disabled={!it.skinId}
                        onClick={() => onOpenItem(it)}
                        aria-label={`${it.name} 미리보기`}
                        className="block w-full bg-[#0F1923] p-2 text-left disabled:cursor-default"
                      >
                        {it.imageUrl && (
                          <img src={it.imageUrl} alt="" draggable={false} className="h-16 w-full object-contain" />
                        )}
                        <p className="mt-1 line-clamp-2 text-xs font-bold leading-tight">{it.name}</p>
                        <p className="mt-0.5 text-[11px] text-[#ECE8E1]/60">{vp(it.price)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {b.otherCount > 0 && (
                <p className="text-xs text-[#ECE8E1]/60">그 외 스프레이·장식 등 {b.otherCount}개 포함</p>
              )}

              <button
                type="button"
                onClick={() => onOpenBundle(b.id)}
                className="h-11 w-full bg-[#FF4655] text-sm font-bold text-white hover:bg-[#ff5f6c]"
              >
                가격 비교 · VP 구매 추천 보기
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

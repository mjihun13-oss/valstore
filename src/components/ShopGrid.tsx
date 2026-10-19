import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { TIER_STYLES } from '../types/valorant';
import type { ValorantSkin } from '../types/valorant';

interface ShopGridProps {
  skins: ValorantSkin[];
  revealedIds: Set<string>;
  selectedIds: string[];
  onOpen: (id: string) => void;
}

function HiddenTile() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3"
      style={{
        background:
          'repeating-linear-gradient(135deg, #1B2733 0 14px, #17222D 14px 28px)',
      }}
    >
      <svg viewBox="0 0 100 100" className="h-16 w-16" aria-hidden>
        <polygon points="28,30 40,30 50,46 60,30 72,30 50,64" fill="#FF4655" />
      </svg>
      <span className="text-sm font-bold text-[#ECE8E1]">탭해서 열기</span>
    </div>
  );
}

export default function ShopGrid({ skins, revealedIds, selectedIds, onOpen }: ShopGridProps) {
  return (
    <section aria-label="오늘의 상점" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {skins.map((skin) => {
        const revealed = revealedIds.has(skin.id);
        const selected = selectedIds.includes(skin.id);
        const style = TIER_STYLES[skin.tier];
        return (
          <motion.button
            key={skin.id}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onOpen(skin.id)}
            aria-label={revealed ? `${skin.name} 자세히 보기` : '카드 열기'}
            className="relative aspect-[3/4] w-full overflow-hidden text-left"
            style={{
              boxShadow: revealed
                ? `inset 0 0 0 2px ${style.color}`
                : 'inset 0 0 0 1px rgba(236,232,225,0.16)',
            }}
          >
            {revealed ? (
              <div
                className="flex h-full flex-col justify-between p-3"
                style={{ background: `linear-gradient(165deg, ${style.from} 0%, #0F1923 75%)` }}
              >
                <span
                  className="self-start px-1.5 py-0.5 text-[11px] font-bold text-[#0F1923]"
                  style={{ backgroundColor: style.color }}
                >
                  {style.label}
                </span>
                <div className="flex flex-1 items-center justify-center">
                  {skin.imageUrl ? (
                    <img
                      src={skin.imageUrl}
                      alt=""
                      draggable={false}
                      className="max-h-full w-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)]"
                    />
                  ) : (
                    <span className="font-black text-white/70">{skin.weapon}</span>
                  )}
                </div>
                <div>
                  <p className="line-clamp-2 text-sm font-bold leading-tight text-[#ECE8E1]">{skin.name}</p>
                  <p className="mt-0.5 text-xs font-bold" style={{ color: style.color }}>
                    {skin.price.toLocaleString('ko-KR')} VP
                  </p>
                </div>
              </div>
            ) : (
              <HiddenTile />
            )}

            {selected && (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-[#FF4655] text-white">
                <Check size={14} />
              </span>
            )}
          </motion.button>
        );
      })}
    </section>
  );
}

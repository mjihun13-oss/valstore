import { useEffect, useMemo, useState } from 'react';
import { useScrollLock } from '../utils/scrollLock';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Coins, Heart, Play, Plus, Share2, X } from 'lucide-react';
import ScratchCard from './ScratchCard';
import TierEffects from './TierEffects';
import VpGuideModal from './VpGuideModal';
import WishCelebration from './WishCelebration';
import { NOTCH_CLIP, TIER_STYLES } from '../types/valorant';
import type { ValorantSkin } from '../types/valorant';
import { shareSkin } from '../utils/shareCard';
import { calculateVpRecommendations, formatKrw, formatVp } from '../utils/vpCalculator';

interface SkinDetailProps {
  skin: ValorantSkin;
  revealed: boolean;
  onReveal: () => void;
  onClose: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  ownedVp: number;
  wished: boolean;
  onToggleWish: () => void;
  onShared: () => void;
}

export default function SkinDetail({
  skin,
  revealed,
  onReveal,
  onClose,
  selected,
  onToggleSelect,
  ownedVp,
  wished,
  onToggleWish,
  onShared,
}: SkinDetailProps) {
  const style = TIER_STYLES[skin.tier];
  const reduce = useReducedMotion();

  const [effectKey, setEffectKey] = useState(0);
  const [wishKey, setWishKey] = useState(0);
  const [chromaIdx, setChromaIdx] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const recs = useMemo(() => calculateVpRecommendations(skin.price, ownedVp), [skin.price, ownedVp]);
  const chroma = skin.chromas[chromaIdx];
  const imageUrl = chroma?.imageUrl || skin.imageUrl;
  const videoUrl = chroma?.videoUrl ?? skin.videoUrl;

  useScrollLock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guideOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, guideOpen]);

  const handleReveal = () => {
    setEffectKey((k) => k + 1);
    if (wished) setWishKey((k) => k + 1);
    onReveal();
  };

  const handleShare = async () => {
    setSharing(true);
    setShareMsg(null);
    const result = await shareSkin(skin, imageUrl);
    setSharing(false);
    if (result === 'shared' || result === 'downloaded') onShared();
    if (result === 'downloaded') setShareMsg('이미지를 저장했어요.');
    else if (result === 'failed') setShareMsg('공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  };

  // 티어별 카드 반응: Ultra는 강한 화면 흔들림, Exclusive는 한 번 부풀어 오름
  const reaction =
    effectKey > 0 && !reduce
      ? skin.tier === 'Ultra'
        ? { x: [0, -16, 16, -12, 12, -8, 8, -3, 3, 0], y: [0, 6, -6, 4, -4, 0] }
        : skin.tier === 'Exclusive'
          ? { scale: [1, 1.05, 1] }
          : {}
      : {};

  const smart = recs.smartPick;

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto bg-[#0F1923]"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#ECE8E1]/70">
            {revealed ? `${style.label} 스킨` : '카드를 문질러 보세요'}
          </span>
          <div className="flex items-center">
            {revealed && (
              <button
                type="button"
                onClick={onToggleWish}
                aria-pressed={wished}
                aria-label={wished ? '위시리스트에서 빼기' : '위시리스트에 담기'}
                className="p-2"
              >
                <Heart size={22} color={wished ? '#FF4655' : '#ECE8E1'} fill={wished ? '#FF4655' : 'none'} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="p-2 text-[#ECE8E1]/80 hover:text-white"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <motion.div animate={reaction} transition={{ duration: 0.7 }}>
          <div
            className="transition-shadow duration-700"
            style={{
              boxShadow: revealed ? `0 0 0 2px ${style.color}` : '0 0 0 1px rgba(236,232,225,0.16)',
            }}
          >
            <ScratchCard skin={skin} revealed={revealed} onReveal={handleReveal} imageUrl={imageUrl} />
          </div>
        </motion.div>

        {!revealed && (
          <p className="text-center text-xs text-[#ECE8E1]/60">
            한 번 열면 다시 긁을 수 없어요. 크게 문질러 보세요.
          </p>
        )}

        <AnimatePresence>
          {revealed && (
            <motion.div
              className="flex flex-col gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.5, duration: 0.4 }}
            >
              {skin.discountPercent !== undefined && skin.discountPercent > 0 && (
                <p className="bg-[#B66BFF]/20 px-3 py-2 text-sm font-bold text-[#E2C8FF]">
                  야시장 {skin.discountPercent}% 할인 · {formatVp(skin.originalPrice ?? skin.price)} →{' '}
                  {formatVp(skin.price)}
                </p>
              )}

              <p className="flex items-baseline justify-between bg-[#1B2733] px-3 py-2">
                <span className="text-sm text-[#ECE8E1]/70">스킨 가격</span>
                <b className="text-lg" style={{ color: style.color }}>
                  {formatVp(skin.price)}
                </b>
              </p>

              {videoUrl && (
                <section aria-label="영상 미리보기">
                  <button
                    type="button"
                    onClick={() => setVideoOpen((o) => !o)}
                    className="flex h-11 w-full items-center justify-center gap-2 bg-[#1B2733] text-sm font-bold hover:bg-[#223244]"
                  >
                    <Play size={16} />
                    {videoOpen ? '영상 닫기' : '스킨 영상 미리보기'}
                  </button>
                  {videoOpen && (
                    <video
                      key={videoUrl}
                      src={videoUrl}
                      controls
                      autoPlay
                      playsInline
                      className="mt-2 w-full bg-black"
                    />
                  )}
                  <p className="mt-1 text-[11px] text-[#ECE8E1]/50">영상은 재생할 때만 데이터를 써요.</p>
                </section>
              )}

              {skin.chromas.length > 1 && (
                <section aria-label="크로마">
                  <h3 className="mb-2 text-sm font-bold">크로마 {skin.chromas.length}종</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {skin.chromas.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setChromaIdx(i)}
                        aria-pressed={i === chromaIdx}
                        aria-label={c.name}
                        className="h-14 w-20 shrink-0 bg-[#1B2733] p-1"
                        style={{
                          boxShadow:
                            i === chromaIdx ? `inset 0 0 0 2px ${style.color}` : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                        }}
                      >
                        <img
                          src={c.swatchUrl ?? c.imageUrl}
                          alt=""
                          draggable={false}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                  {chroma && <p className="mt-1 text-xs text-[#ECE8E1]/70">{chroma.name}</p>}
                </section>
              )}

              <section className="bg-[#1B2733] p-4" aria-label="VP 구매 추천">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <Coins size={16} color="#FF4655" />이 스킨 사려면
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

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onToggleSelect}
                  aria-pressed={selected}
                  className={`flex h-12 items-center justify-center gap-2 text-sm font-bold transition-colors ${
                    selected ? 'bg-[#FF4655] text-white' : 'bg-[#ECE8E1] text-[#0F1923]'
                  }`}
                  style={{ clipPath: NOTCH_CLIP }}
                >
                  {selected ? <Check size={16} /> : <Plus size={16} />}
                  {selected ? '구매 목록에 담김' : '구매 목록에 담기'}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={sharing}
                  className="flex h-12 items-center justify-center gap-2 bg-[#1B2733] text-sm font-bold hover:bg-[#223244] disabled:opacity-60"
                  style={{ clipPath: NOTCH_CLIP }}
                >
                  <Share2 size={16} />
                  {sharing ? '준비 중…' : '자랑하기'}
                </button>
              </div>
              {shareMsg && <p className="text-center text-xs text-[#ECE8E1]/70">{shareMsg}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TierEffects tier={skin.tier} playKey={effectKey} />
      <WishCelebration playKey={wishKey} name={skin.name} />
      <VpGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} recommendations={recs} />
    </motion.div>
  );
}

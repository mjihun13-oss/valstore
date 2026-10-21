import { useEffect, useState } from 'react';
import { useScrollLock } from '../utils/scrollLock';
import { motion } from 'framer-motion';
import { Heart, Loader2, Play, X } from 'lucide-react';
import VpAdvice from './VpAdvice';
import { fetchSkinDetail } from '../services/skinDetail';
import type { SkinDetailData } from '../services/skinDetail';
import { TIER_STYLES } from '../types/valorant';
import type { PreviewSkin } from '../types/valorant';

interface SkinPreviewProps {
  skin: PreviewSkin;
  onClose: () => void;
  wished: boolean;
  onToggleWish: () => void;
  owned: boolean;
  ownedVp: number;
}

/** 긁기 없이 스킨 이미지, 크로마, 영상을 바로 보는 미리보기 화면 */
export default function SkinPreview({ skin, onClose, wished, onToggleWish, owned, ownedVp }: SkinPreviewProps) {
  const style = TIER_STYLES[skin.tier];
  const [detail, setDetail] = useState<SkinDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chromaIdx, setChromaIdx] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSkinDetail(skin.skinId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '정보를 불러오지 못했어요.');
      });
    return () => {
      cancelled = true;
    };
  }, [skin.skinId]);

  useScrollLock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const chromas = detail?.chromas ?? [];
  const chroma = chromas[chromaIdx];
  const imageUrl = chroma?.imageUrl || detail?.imageUrl || skin.imageUrl;
  const videoUrl = chroma?.videoUrl ?? detail?.videoUrl ?? null;

  return (
    <motion.div
      className="fixed inset-0 z-[45] overflow-y-auto bg-[#0F1923]"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#ECE8E1]/70">미리보기</span>
          <div className="flex items-center">
            <button
              type="button"
              onClick={onToggleWish}
              aria-pressed={wished}
              aria-label={wished ? '위시리스트에서 빼기' : '위시리스트에 담기'}
              className="p-2"
            >
              <Heart size={22} color={wished ? '#FF4655' : '#ECE8E1'} fill={wished ? '#FF4655' : 'none'} />
            </button>
            <button type="button" onClick={onClose} aria-label="닫기" className="p-2 text-[#ECE8E1]/80 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        <div
          className="flex aspect-[4/3] items-center justify-center p-4"
          style={{
            background: `linear-gradient(165deg, ${style.from} 0%, #0F1923 80%)`,
            boxShadow: `0 0 0 2px ${style.color}`,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${skin.name} ${skin.weapon}`}
              draggable={false}
              className="max-h-full w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
            />
          ) : (
            <span className="text-2xl font-black text-white/70">{skin.weapon}</span>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold text-[#0F1923]" style={{ backgroundColor: style.color }}>
              {style.label}
            </span>
            {owned && <span className="bg-[#2BFFA0] px-2 py-0.5 text-xs font-bold text-[#0F1923]">보유 중</span>}
          </div>
          <h2 className="mt-2 text-xl font-black leading-tight">{skin.name}</h2>
          <p className="mt-1 text-sm text-[#ECE8E1]/70">
            {skin.weapon}
            {skin.price ? ` · ${skin.price.toLocaleString('ko-KR')} VP` : ''}
            {detail ? ` · ${detail.levelCount}레벨` : ''}
          </p>
        </div>

        {!owned && skin.price ? (
          <VpAdvice title="이 스킨 사려면" price={skin.price} ownedVp={ownedVp} />
        ) : (
          <p className="bg-[#1B2733] px-3 py-2 text-sm text-[#ECE8E1]/70">
            {owned
              ? skin.price
                ? `이미 가진 스킨이에요 · 정가 ${skin.price.toLocaleString('ko-KR')} VP`
                : '이미 가진 스킨이에요.'
              : '지금은 가격 정보가 없어요. 판매하지 않는 스킨일 수 있어요.'}
          </p>
        )}

        {!detail && !error && (
          <p className="flex items-center gap-2 text-sm text-[#ECE8E1]/60">
            <Loader2 size={16} className="animate-spin" />
            크로마와 영상을 불러오는 중…
          </p>
        )}
        {error && <p className="text-sm text-[#FF4655]">{error}</p>}

        {videoUrl && (
          <section aria-label="영상 미리보기">
            <button
              type="button"
              onClick={() => setVideoOpen((o) => !o)}
              className="flex h-11 w-full items-center justify-center gap-2 bg-[#1B2733] text-sm font-bold hover:bg-[#223244]"
            >
              <Play size={16} />
              {videoOpen ? '영상 닫기' : '스킨 영상 보기'}
            </button>
            {videoOpen && (
              <video key={videoUrl} src={videoUrl} controls autoPlay playsInline className="mt-2 w-full bg-black" />
            )}
            <p className="mt-1 text-[11px] text-[#ECE8E1]/50">영상은 재생할 때만 데이터를 써요.</p>
          </section>
        )}

        {chromas.length > 1 && (
          <section aria-label="크로마">
            <h3 className="mb-2 text-sm font-bold">크로마 {chromas.length}종</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {chromas.map((c, i) => (
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
                  <img src={c.swatchUrl ?? c.imageUrl} alt="" draggable={false} className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
            {chroma && <p className="mt-1 text-xs text-[#ECE8E1]/70">{chroma.name}</p>}
          </section>
        )}
      </div>
    </motion.div>
  );
}

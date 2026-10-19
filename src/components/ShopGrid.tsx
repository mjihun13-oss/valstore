import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import ScratchCard from './ScratchCard';
import { NOTCH_CLIP } from '../types/valorant';
import type { ValorantSkin } from '../types/valorant';

interface ShopGridProps {
  skins: ValorantSkin[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

const REVEAL_STAGGER_MS = 180;

/** 상점이 새로 로드되면 부모에서 key를 바꿔 이 컴포넌트를 다시 마운트한다. */
export default function ShopGrid({ skins, selectedIds, onToggleSelect }: ShopGridProps) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const reveal = useCallback((id: string) => {
    setRevealedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const revealAll = () => {
    skins
      .filter((s) => !revealedIds.has(s.id))
      .forEach((s, i) => {
        const t = window.setTimeout(() => reveal(s.id), i * REVEAL_STAGGER_MS);
        timers.current.push(t);
      });
  };

  const allRevealed = skins.length > 0 && skins.every((s) => revealedIds.has(s.id));

  return (
    <section aria-label="오늘의 상점">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[#ECE8E1]/70">
          {revealedIds.size} / {skins.length}개 확인
        </p>
        <button
          type="button"
          onClick={revealAll}
          disabled={allRevealed}
          className="flex h-10 items-center gap-2 bg-[#FF4655] px-4 text-sm font-bold text-white transition-colors hover:bg-[#ff5f6c] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ clipPath: NOTCH_CLIP }}
        >
          <Eye size={16} />
          전체 한 번에 긁기
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {skins.map((skin) => (
          <ScratchCard
            key={skin.id}
            skin={skin}
            revealed={revealedIds.has(skin.id)}
            onReveal={() => reveal(skin.id)}
            selected={selectedIds.includes(skin.id)}
            onToggleSelect={() => onToggleSelect(skin.id)}
          />
        ))}
      </div>
    </section>
  );
}

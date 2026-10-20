import { useMemo, useState } from 'react';
import {
  Crown,
  Flame,
  Gem,
  Hand,
  Heart,
  Moon,
  Share2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NOTCH_CLIP, TIER_STYLES } from '../types/valorant';
import type { CatalogSkin, SkinTier } from '../types/valorant';
import { evaluateBadges } from '../utils/badges';
import type { BadgeIcon } from '../utils/badges';
import type { BadgeShareItem, ShareResult } from '../utils/shareCard';
import type { UserStats } from '../utils/storage';

const ICONS: Record<BadgeIcon, LucideIcon> = {
  hand: Hand,
  sparkles: Sparkles,
  flame: Flame,
  crown: Crown,
  heart: Heart,
  gem: Gem,
  moon: Moon,
  share: Share2,
  trophy: Trophy,
};

const TIER_ORDER: SkinTier[] = ['Ultra', 'Exclusive', 'Premium', 'Deluxe', 'Select'];
const PAGE = 60;

interface CollectionViewProps {
  catalog: CatalogSkin[];
  ownedSkinIds: string[];
  stats: UserStats;
  wishCount: number;
  onShareBadges: (ownedCount: number, badges: BadgeShareItem[]) => Promise<ShareResult>;
}

export default function CollectionView({
  catalog,
  ownedSkinIds,
  stats,
  wishCount,
  onShareBadges,
}: CollectionViewProps) {
  const [filter, setFilter] = useState<SkinTier | 'all'>('all');
  const [visible, setVisible] = useState(PAGE);
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const owned = useMemo(() => {
    const set = new Set(ownedSkinIds);
    return catalog.filter((c) => set.has(c.id));
  }, [catalog, ownedSkinIds]);

  const byTier = useMemo(() => {
    const r: Record<SkinTier, number> = { Select: 0, Deluxe: 0, Premium: 0, Exclusive: 0, Ultra: 0 };
    owned.forEach((s) => {
      r[s.tier] += 1;
    });
    return r;
  }, [owned]);

  const badges = useMemo(
    () => evaluateBadges({ stats, ownedCount: owned.length, ownedByTier: byTier, wishCount }),
    [stats, owned.length, byTier, wishCount],
  );
  const earned = badges.filter((b) => b.earned);

  const shown = useMemo(() => {
    const list = filter === 'all' ? owned : owned.filter((s) => s.tier === filter);
    return [...list].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
  }, [owned, filter]);

  const share = async () => {
    setSharing(true);
    setMsg(null);
    const r = await onShareBadges(
      owned.length,
      earned.map((b) => ({ name: b.name, desc: b.desc, color: b.color })),
    );
    setSharing(false);
    if (r === 'downloaded') setMsg('이미지를 저장했어요.');
    else if (r === 'failed') setMsg('공유하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  };

  return (
    <div className="space-y-6">
      <section aria-label="뱃지">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">
            뱃지 {earned.length} / {badges.length}
          </h2>
          <button
            type="button"
            onClick={share}
            disabled={sharing}
            className="flex h-9 items-center gap-1.5 bg-[#FF4655] px-3 text-xs font-bold text-white hover:bg-[#ff5f6c] disabled:opacity-60"
            style={{ clipPath: NOTCH_CLIP }}
          >
            <Share2 size={14} />
            {sharing ? '준비 중…' : '뱃지 자랑하기'}
          </button>
        </div>
        {msg && <p className="mb-2 text-xs text-[#ECE8E1]/70">{msg}</p>}

        <ul className="grid grid-cols-2 gap-2">
          {badges.map((b) => {
            const Icon = ICONS[b.icon];
            return (
              <li
                key={b.id}
                className="bg-[#1B2733] p-3"
                style={{
                  boxShadow: b.earned ? `inset 0 0 0 2px ${b.color}` : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                  opacity: b.earned ? 1 : 0.55,
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon size={20} color={b.earned ? b.color : '#ECE8E1'} />
                  <p className="text-sm font-bold leading-tight">{b.name}</p>
                </div>
                <p className="mt-1 text-[11px] text-[#ECE8E1]/60">{b.desc}</p>
                {!b.earned && (
                  <div className="mt-2 h-1 bg-black/40">
                    <div className="h-full bg-[#ECE8E1]/60" style={{ width: `${(b.current / b.target) * 100}%` }} />
                  </div>
                )}
                {!b.earned && (
                  <p className="mt-1 text-[10px] text-[#ECE8E1]/50">
                    {b.current} / {b.target}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="보유 스킨">
        <h2 className="mb-1 text-sm font-bold">보유 스킨 {owned.length}개</h2>
        {catalog.length === 0 || owned.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#ECE8E1]/60">
            보유 스킨 정보를 아직 불러오지 못했어요. 상점을 새로고침해 보세요.
          </p>
        ) : (
          <>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {(['all', ...TIER_ORDER] as const).map((t) => {
                const active = filter === t;
                const label = t === 'all' ? `전체 ${owned.length}` : `${TIER_STYLES[t].label} ${byTier[t]}`;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFilter(t);
                      setVisible(PAGE);
                    }}
                    className={`h-8 shrink-0 px-3 text-xs font-bold ${
                      active ? 'bg-[#ECE8E1] text-[#0F1923]' : 'bg-[#1B2733] text-[#ECE8E1]/80'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <ul className="grid grid-cols-3 gap-2">
              {shown.slice(0, visible).map((s) => {
                const st = TIER_STYLES[s.tier];
                return (
                  <li
                    key={s.id}
                    className="bg-[#1B2733] p-2"
                    style={{ boxShadow: `inset 0 -3px 0 ${st.color}` }}
                  >
                    <div className="h-14">
                      {s.imageUrl && (
                        <img
                          src={s.imageUrl}
                          alt=""
                          draggable={false}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-tight">{s.name}</p>
                  </li>
                );
              })}
            </ul>
            {visible < shown.length && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE)}
                className="mt-3 h-10 w-full bg-[#1B2733] text-sm font-bold hover:bg-[#223244]"
              >
                더 보기
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

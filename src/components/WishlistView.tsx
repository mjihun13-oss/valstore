import { useMemo, useState } from 'react';
import { Heart, Search } from 'lucide-react';
import { TIER_STYLES } from '../types/valorant';
import type { CatalogSkin } from '../types/valorant';

interface WishlistViewProps {
  catalog: CatalogSkin[];
  wishIds: string[];
  /** 지금 상점(일반+야시장)에 나와 있는 스킨 UUID */
  inShopIds: Set<string>;
  onToggle: (skinId: string) => void;
  onOpen: (skin: CatalogSkin) => void;
}

function Row({
  skin,
  wished,
  inShop,
  onToggle,
  onOpen,
}: {
  skin: CatalogSkin;
  wished: boolean;
  inShop: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const style = TIER_STYLES[skin.tier];
  return (
    <li className="flex items-center gap-3 bg-[#1B2733] p-2">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${skin.name} 미리보기`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="h-14 w-20 shrink-0 bg-[#0F1923] p-1">
          {skin.imageUrl && (
            <img src={skin.imageUrl} alt="" draggable={false} loading="lazy" className="h-full w-full object-contain" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{skin.name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-[#ECE8E1]/60">
            <span style={{ color: style.color }}>{style.label}</span>
            <span>{skin.weapon}</span>
            {inShop && <span className="bg-[#FF4655] px-1 font-bold text-white">지금 상점에 있음</span>}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={wished}
        aria-label={wished ? '위시리스트에서 빼기' : '위시리스트에 담기'}
        className="p-2"
      >
        <Heart size={22} color={wished ? '#FF4655' : '#ECE8E1'} fill={wished ? '#FF4655' : 'none'} />
      </button>
    </li>
  );
}

export default function WishlistView({ catalog, wishIds, inShopIds, onToggle, onOpen }: WishlistViewProps) {
  const [query, setQuery] = useState('');

  const wished = useMemo(
    () => wishIds.map((id) => catalog.find((c) => c.id === id)).filter((c): c is CatalogSkin => Boolean(c)),
    [catalog, wishIds],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return [];
    return catalog
      .filter((c) => c.name.toLowerCase().includes(q) || c.weapon.toLowerCase().includes(q))
      .slice(0, 40);
  }, [catalog, query]);

  if (catalog.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[#ECE8E1]/60">
        상점을 한 번 불러오면 스킨 목록이 만들어져요. 새로고침을 눌러 주세요.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-[#ECE8E1]/60">
        담아 둔 스킨이 상점이나 야시장에 뜨면 앱에서 알려드리고, 카드를 긁을 때 축하 연출이 나와요.
      </p>

      <label className="flex h-11 items-center gap-2 bg-[#1B2733] px-3 ring-1 ring-white/10 focus-within:ring-[#FF4655]">
        <Search size={16} className="text-[#ECE8E1]/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="스킨 이름이나 총기로 검색"
          className="h-full flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      {query.trim() !== '' && (
        <section aria-label="검색 결과">
          {results.length === 0 ? (
            <p className="text-sm text-[#ECE8E1]/60">검색 결과가 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((s) => (
                <Row
                  key={s.id}
                  skin={s}
                  wished={wishIds.includes(s.id)}
                  inShop={inShopIds.has(s.id)}
                  onToggle={() => onToggle(s.id)}
                  onOpen={() => onOpen(s)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-label="내 위시리스트">
        <h2 className="mb-2 text-sm font-bold">내 위시리스트 {wished.length}개</h2>
        {wished.length === 0 ? (
          <p className="text-sm text-[#ECE8E1]/60">위에서 스킨을 검색해서 하트를 눌러 보세요.</p>
        ) : (
          <ul className="space-y-2">
            {wished.map((s) => (
              <Row
                key={s.id}
                skin={s}
                wished
                inShop={inShopIds.has(s.id)}
                onToggle={() => onToggle(s.id)}
                onOpen={() => onOpen(s)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

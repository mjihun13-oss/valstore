import { Heart, Moon, Package, ShoppingBag, Trophy } from 'lucide-react';

export type Tab = 'shop' | 'night' | 'bundles' | 'wish' | 'collection';

const TABS: { id: Tab; label: string; icon: typeof Heart }[] = [
  { id: 'shop', label: '상점', icon: ShoppingBag },
  { id: 'night', label: '야시장', icon: Moon },
  { id: 'bundles', label: '세트', icon: Package },
  { id: 'wish', label: '위시', icon: Heart },
  { id: 'collection', label: '컬렉션', icon: Trophy },
];

interface TabBarProps {
  tab: Tab;
  onTab: (t: Tab) => void;
  /** 위시리스트 스킨이 지금 상점에 있으면 표시 */
  wishDot: boolean;
}

export default function TabBar({ tab, onTab, wishDot }: TabBarProps) {
  return (
    <nav
      aria-label="메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0F1923]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
                active ? 'text-[#FF4655]' : 'text-[#ECE8E1]/60'
              }`}
            >
              <Icon size={20} />
              {label}
              {id === 'wish' && wishDot && (
                <span className="absolute right-[28%] top-2 h-2 w-2 rounded-full bg-[#FF4655]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

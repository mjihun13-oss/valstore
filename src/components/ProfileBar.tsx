import { Coins, Crown, Gem } from 'lucide-react';
import type { Wallet } from '../types/valorant';

interface ProfileBarProps {
  riotId: string;
  wallet: Wallet;
}

const fmt = (n: number | null): string => (n === null ? '-' : n.toLocaleString('ko-KR'));

function Chip({ icon, label, value, color }: { icon: JSX.Element; label: string; value: string; color: string }) {
  return (
    <div className="flex flex-1 items-center gap-2 bg-[#1B2733] px-3 py-2" title={label}>
      <span style={{ color }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] leading-none text-[#ECE8E1]/60">{label}</p>
        <p className="mt-1 truncate text-sm font-bold leading-none text-[#ECE8E1]">{value}</p>
      </div>
    </div>
  );
}

export default function ProfileBar({ riotId, wallet }: ProfileBarProps) {
  return (
    <div className="space-y-2">
      <p className="truncate text-sm font-bold text-[#ECE8E1]">{riotId}</p>
      <div className="flex gap-2">
        <Chip icon={<Coins size={16} />} label="VP" value={fmt(wallet.vp)} color="#FF4655" />
        <Chip icon={<Gem size={16} />} label="레디어나이트" value={fmt(wallet.radianite)} color="#FFC94D" />
        <Chip icon={<Crown size={16} />} label="킹덤 크레딧" value={fmt(wallet.kingdom)} color="#00C2FF" />
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, KeyRound, Loader2, LogIn, X } from 'lucide-react';
import ShopGrid from './components/ShopGrid';
import VpGuideModal from './components/VpGuideModal';
import { NOTCH_CLIP } from './types/valorant';
import type { ValorantSkin } from './types/valorant';
import { calculateVpRecommendations, formatVp } from './utils/vpCalculator';

/* ---------- Mock 데이터 ---------- */

const makeArt = (c1: string, c2: string): string => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
    `<polygon points='20,110 90,85 210,85 235,70 280,70 280,95 240,100 225,125 150,125 135,170 100,170 105,125 20,130' ` +
    `fill='url(#g)' stroke='white' stroke-opacity='.6' stroke-width='3'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** 테스트용 데이터 (가격/티어는 예시) */
const MOCK_SKINS: ValorantSkin[] = [
  { id: 'mock-ion-sheriff', name: 'Ion Sheriff', weapon: 'Sheriff', price: 875, tier: 'Select', imageUrl: makeArt('#00C2FF', '#0B3A52') },
  { id: 'mock-neon-marshal', name: 'Neon Marshal', weapon: 'Marshal', price: 1275, tier: 'Deluxe', imageUrl: makeArt('#2BFFA0', '#0B4A38') },
  { id: 'mock-reaver-vandal', name: 'Reaver Vandal', weapon: 'Vandal', price: 1775, tier: 'Premium', imageUrl: makeArt('#FF5CAD', '#4A1A55') },
  { id: 'mock-oni-phantom', name: 'Oni Phantom', weapon: 'Phantom', price: 2175, tier: 'Exclusive', imageUrl: makeArt('#FFC94D', '#8A1F2B') },
];

/* ---------- 상점 불러오기 ---------- */

/** 앱(APK)에는 서버가 없으므로 상점 프록시의 절대 주소를 .env 의 VITE_API_BASE 로 지정한다. */
const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

interface LoginPayload {
  mode: 'password' | 'token';
  username?: string;
  password?: string;
  token?: string;
}

/**
 * 브라우저에서 Riot 인증 API를 직접 호출할 수 없으므로(CORS, 약관),
 * 사용자가 직접 운영하는 백엔드 프록시를 호출하는 구조입니다.
 * 응답 형식: { skins: ValorantSkin[4] }
 */
async function fetchStorefront(payload: LoginPayload): Promise<ValorantSkin[]> {
  if (!API_BASE) {
    throw new Error('서버 주소(VITE_API_BASE)가 설정되지 않았어요. Mock 데이터를 사용해 주세요.');
  }
  const res = await fetch(`${API_BASE}/api/valorant/storefront`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`상점 서버 응답 오류 (${res.status})`);
  const data = (await res.json()) as { skins?: ValorantSkin[] };
  if (!Array.isArray(data.skins) || data.skins.length !== 4) {
    throw new Error('상점 데이터 형식이 올바르지 않아요. 스킨 4개가 필요해요.');
  }
  return data.skins;
}

/* ---------- 로그인 모달 ---------- */

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLoaded: (skins: ValorantSkin[]) => void;
}

function LoginModal({ open, onClose, onLoaded }: LoginModalProps) {
  const [useMock, setUseMock] = useState(true);
  const [mode, setMode] = useState<'password' | 'token'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (useMock) {
      onLoaded(MOCK_SKINS);
      onClose();
      return;
    }
    setLoading(true);
    try {
      const skins = await fetchStorefront(
        mode === 'password' ? { mode, username, password } : { mode, token },
      );
      setPassword('');
      setToken('');
      onLoaded(skins);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '상점을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'h-11 w-full bg-[#1B2733] px-3 text-sm text-[#ECE8E1] outline-none ring-1 ring-white/10 focus:ring-[#FF4655] disabled:opacity-40';

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
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label="계정 연결"
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 bg-[#0F1923] p-5 text-[#ECE8E1]"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <KeyRound size={20} color="#FF4655" />
                계정 연결
              </h2>
              <button type="button" onClick={onClose} aria-label="닫기" className="p-1 text-[#ECE8E1]/70 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
                className="h-4 w-4 accent-[#FF4655]"
              />
              테스트용 Mock 데이터 사용
            </label>

            <div className="grid grid-cols-2 gap-2">
              {(['password', 'token'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={useMock}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`h-10 text-sm font-bold disabled:opacity-40 ${
                    mode === m ? 'bg-[#ECE8E1] text-[#0F1923]' : 'bg-[#1B2733] text-[#ECE8E1]/80'
                  }`}
                >
                  {m === 'password' ? 'ID / 비밀번호' : 'Riot Token'}
                </button>
              ))}
            </div>

            {mode === 'password' ? (
              <div className="space-y-2">
                <input
                  className={inputClass}
                  placeholder="Riot ID"
                  autoComplete="username"
                  value={username}
                  disabled={useMock}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input
                  className={inputClass}
                  type="password"
                  placeholder="비밀번호"
                  autoComplete="current-password"
                  value={password}
                  disabled={useMock}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : (
              <input
                className={inputClass}
                placeholder="Access Token"
                autoComplete="off"
                value={token}
                disabled={useMock}
                onChange={(e) => setToken(e.target.value)}
              />
            )}

            {error && <p className="text-sm text-[#FF4655]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 bg-[#FF4655] font-bold text-white hover:bg-[#ff5f6c] disabled:opacity-60"
              style={{ clipPath: NOTCH_CLIP }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {useMock ? '테스트 상점 불러오기' : '상점 불러오기'}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- 메인 ---------- */

export default function App() {
  const [skins, setSkins] = useState<ValorantSkin[]>(MOCK_SKINS);
  const [shopKey, setShopKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ownedInput, setOwnedInput] = useState('0');
  const [guideOpen, setGuideOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const ownedVp = Number(ownedInput) || 0;

  const totalVp = useMemo(
    () => skins.filter((s) => selectedIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0),
    [skins, selectedIds],
  );

  const recommendations = useMemo(
    () => calculateVpRecommendations(totalVp, ownedVp),
    [totalVp, ownedVp],
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleLoaded = (next: ValorantSkin[]) => {
    setSkins(next);
    setSelectedIds([]);
    setShopKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-[#0F1923] text-[#ECE8E1]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h1 className="text-lg font-black tracking-tight">
          <span className="text-[#FF4655]">VALORANT</span> 오늘의 상점
        </h1>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="flex h-9 items-center gap-1.5 bg-[#1B2733] px-3 text-sm font-bold hover:bg-[#223244]"
        >
          <KeyRound size={15} />
          계정 연결
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <ShopGrid
          key={shopKey}
          skins={skins}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />

        <section
          aria-label="VP 계산"
          className="grid gap-4 bg-[#1B2733] p-4 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="owned-vp" className="text-[11px] text-[#ECE8E1]/60">
                보유 VP
              </label>
              <input
                id="owned-vp"
                inputMode="numeric"
                value={ownedInput}
                onChange={(e) => setOwnedInput(e.target.value.replace(/\D/g, '').slice(0, 7))}
                onFocus={(e) => e.currentTarget.select()}
                className="mt-1 h-11 w-full bg-[#0F1923] px-3 text-sm font-bold outline-none ring-1 ring-white/10 focus:ring-[#FF4655]"
              />
            </div>
            <div>
              <p className="text-[11px] text-[#ECE8E1]/60">선택한 스킨 {selectedIds.length}개</p>
              <p className="mt-1 flex h-11 items-center text-sm font-bold">{formatVp(totalVp)}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#ECE8E1]/60">부족한 VP</p>
              <p className="mt-1 flex h-11 items-center text-sm font-bold text-[#FF4655]">
                {formatVp(recommendations.neededVp)}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => setGuideOpen(true)}
            className="flex h-12 items-center justify-center gap-2 bg-[#FF4655] px-5 font-bold text-white transition-colors hover:bg-[#ff5f6c] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ clipPath: NOTCH_CLIP }}
          >
            <Coins size={18} />
            VP 구매 가이드
          </button>
        </section>
      </main>

      <VpGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        recommendations={recommendations}
      />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLoaded={handleLoaded} />
    </div>
  );
}

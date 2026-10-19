import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Browser } from '@capacitor/browser';
import { ClipboardPaste, Coins, ExternalLink, Loader2, LogOut, RefreshCw } from 'lucide-react';
import ShopGrid from './components/ShopGrid';
import SkinDetail from './components/SkinDetail';
import VpGuideModal from './components/VpGuideModal';
import {
  AuthExpiredError,
  REGIONS,
  RIOT_LOGIN_URL,
  fetchMyShop,
  parseAccessToken,
} from './services/riotStore';
import type { Region } from './services/riotStore';
import { NOTCH_CLIP } from './types/valorant';
import type { DailyShop } from './types/valorant';
import {
  clearSession,
  clearToken,
  loadRegion,
  loadRevealed,
  loadSnapshot,
  loadToken,
  saveRegion,
  saveRevealed,
  saveSnapshot,
  saveToken,
} from './utils/storage';
import { calculateVpRecommendations, formatVp } from './utils/vpCalculator';

type Phase = 'boot' | 'login' | 'shop';

const pad = (n: number): string => String(n).padStart(2, '0');
const formatCountdown = (s: number): string =>
  `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

function useCountdown(shop: DailyShop | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!shop) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [shop]);
  if (!shop) return 0;
  return Math.max(0, Math.floor((shop.fetchedAt + shop.remainingSeconds * 1000 - now) / 1000));
}

/* ---------- 로그인 화면 ---------- */

interface LoginScreenProps {
  region: Region;
  onRegion: (r: Region) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (pasted: string) => void;
}

function LoginScreen({ region, onRegion, busy, error, onSubmit }: LoginScreenProps) {
  const [pasted, setPasted] = useState('');

  const openLogin = () => {
    Browser.open({ url: RIOT_LOGIN_URL }).catch(() => {
      window.open(RIOT_LOGIN_URL, '_blank');
    });
  };
  const paste = () => {
    navigator.clipboard
      .readText()
      .then(setPasted)
      .catch(() => undefined);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-5 py-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          <span className="text-[#FF4655]">VALORANT</span> 오늘의 상점
        </h1>
        <p className="mt-2 text-sm text-[#ECE8E1]/70">
          Riot 공식 로그인 페이지에서 로그인하면 내 상점을 볼 수 있어요. 비밀번호는 이 앱에 입력하지 않아요.
        </p>
      </div>

      <ol className="space-y-5">
        <li>
          <p className="mb-2 text-sm font-bold">1. 지역 선택</p>
          <div className="grid grid-cols-4 gap-2">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={region === r.id}
                onClick={() => onRegion(r.id)}
                className={`h-10 text-sm font-bold ${
                  region === r.id ? 'bg-[#ECE8E1] text-[#0F1923]' : 'bg-[#1B2733] text-[#ECE8E1]/80'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </li>

        <li>
          <p className="mb-2 text-sm font-bold">2. Riot 로그인 열기</p>
          <button
            type="button"
            onClick={openLogin}
            className="flex h-12 w-full items-center justify-center gap-2 bg-[#FF4655] font-bold text-white hover:bg-[#ff5f6c]"
            style={{ clipPath: NOTCH_CLIP }}
          >
            <ExternalLink size={18} />
            Riot 로그인 페이지 열기
          </button>
        </li>

        <li>
          <p className="mb-1 text-sm font-bold">3. 로그인 후 주소 붙여넣기</p>
          <p className="mb-2 text-xs leading-relaxed text-[#ECE8E1]/60">
            로그인이 끝나면 playvalorant.com 페이지가 열려요. 그 페이지의 주소(링크) 전체를 복사해서 아래에 붙여넣으세요.
          </p>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={3}
            placeholder="https://playvalorant.com/opt_in#access_token=…"
            className="w-full resize-none bg-[#1B2733] p-3 text-xs text-[#ECE8E1] outline-none ring-1 ring-white/10 focus:ring-[#FF4655]"
          />
          <button
            type="button"
            onClick={paste}
            className="mt-2 flex h-9 items-center gap-1.5 bg-[#1B2733] px-3 text-xs font-bold hover:bg-[#223244]"
          >
            <ClipboardPaste size={14} />
            클립보드에서 붙여넣기
          </button>
        </li>
      </ol>

      {error && <p className="text-sm text-[#FF4655]">{error}</p>}

      <button
        type="button"
        disabled={busy || pasted.trim() === ''}
        onClick={() => onSubmit(pasted)}
        className="flex h-12 w-full items-center justify-center gap-2 bg-[#ECE8E1] font-bold text-[#0F1923] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ clipPath: NOTCH_CLIP }}
      >
        {busy && <Loader2 size={18} className="animate-spin" />}
        내 상점 불러오기
      </button>
    </div>
  );
}

/* ---------- 메인 ---------- */

export default function App() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [shop, setShop] = useState<DailyShop | null>(null);
  const [region, setRegion] = useState<Region>(() => loadRegion());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(() => loadRevealed());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ownedInput, setOwnedInput] = useState('0');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const remaining = useCountdown(shop);

  const applyShop = useCallback((next: DailyShop) => {
    setShop(next);
    setOwnedInput(String(next.vp ?? 0));
    setSelectedIds([]);
    setPhase('shop');
  }, []);

  const loadWith = useCallback(
    async (token: string, reg: Region, expiresAt: number): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const next = await fetchMyShop(token, reg);
        saveToken({ token, expiresAt, region: reg });
        saveSnapshot(next);
        applyShop(next);
        return true;
      } catch (e) {
        if (e instanceof AuthExpiredError) clearToken();
        setError(e instanceof Error ? e.message : '상점을 불러오지 못했어요.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [applyShop],
  );

  // 앱을 켜면: 로그인이 살아 있으면 새로 불러오고, 아니면 마지막 상점을 보여준다.
  useEffect(() => {
    const saved = loadToken();
    const snap = loadSnapshot();
    if (saved && saved.expiresAt > Date.now()) {
      void loadWith(saved.token, saved.region, saved.expiresAt).then((ok) => {
        if (ok) return;
        if (snap) applyShop(snap);
        else setPhase('login');
      });
      return;
    }
    if (snap) applyShop(snap);
    else setPhase('login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (pasted: string) => {
    const parsed = parseAccessToken(pasted);
    if (!parsed) {
      setError('붙여넣은 내용에서 로그인 정보를 찾지 못했어요. 주소 전체를 복사했는지 확인해 주세요.');
      return;
    }
    saveRegion(region);
    void loadWith(parsed.token, region, parsed.expiresAt);
  };

  const handleRefresh = () => {
    const saved = loadToken();
    if (saved && saved.expiresAt > Date.now()) {
      void loadWith(saved.token, saved.region, saved.expiresAt);
    } else {
      setShop(null);
      setError('로그인이 만료됐어요. 다시 로그인해 주세요.');
      setPhase('login');
    }
  };

  const handleLogout = () => {
    clearSession();
    setShop(null);
    setError(null);
    setPhase('login');
  };

  const markRevealed = (id: string) => {
    setRevealed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveRevealed(next);
      return next;
    });
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const ownedVp = Number(ownedInput) || 0;
  const skins = shop?.skins ?? [];
  const totalVp = useMemo(
    () => skins.filter((s) => selectedIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0),
    [skins, selectedIds],
  );
  const recommendations = useMemo(
    () => calculateVpRecommendations(totalVp, ownedVp),
    [totalVp, ownedVp],
  );
  const detailSkin = skins.find((s) => s.id === detailId) ?? null;

  if (phase === 'boot') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1923] text-[#ECE8E1]">
        <Loader2 className="animate-spin" color="#FF4655" />
      </div>
    );
  }

  if (phase === 'login' || !shop) {
    return (
      <div className="min-h-screen bg-[#0F1923] text-[#ECE8E1]">
        <LoginScreen
          region={region}
          onRegion={setRegion}
          busy={busy}
          error={error}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1923] text-[#ECE8E1]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="text-lg font-black tracking-tight">내 오늘의 상점</h1>
          <p className="text-xs text-[#ECE8E1]/60">
            {remaining > 0 ? `갱신까지 ${formatCountdown(remaining)}` : '상점이 갱신됐어요'}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy}
            aria-label="상점 새로 불러오기"
            className="p-2 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={20} className={busy ? 'animate-spin' : ''} />
          </button>
          <button type="button" onClick={handleLogout} aria-label="로그아웃" className="p-2 hover:text-white">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {remaining === 0 && (
          <div className="flex items-center justify-between bg-[#1B2733] p-3 text-sm">
            <span>새 상점이 열렸어요.</span>
            <button type="button" onClick={handleRefresh} className="font-bold text-[#FF4655]">
              다시 불러오기
            </button>
          </div>
        )}
        {error && <p className="text-sm text-[#FF4655]">{error}</p>}

        <ShopGrid
          skins={skins}
          revealedIds={revealed}
          selectedIds={selectedIds}
          onOpen={setDetailId}
        />

        <section
          aria-label="VP 계산"
          className="grid gap-4 bg-[#1B2733] p-4 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="owned-vp" className="text-[11px] text-[#ECE8E1]/60">
                보유 VP{shop.vp !== null ? ' (자동)' : ''}
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
              <p className="text-[11px] text-[#ECE8E1]/60">담은 스킨 {selectedIds.length}개</p>
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
            className="flex h-12 items-center justify-center gap-2 bg-[#FF4655] px-5 font-bold text-white hover:bg-[#ff5f6c] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ clipPath: NOTCH_CLIP }}
          >
            <Coins size={18} />
            담은 스킨 VP 가이드
          </button>
        </section>
      </main>

      <AnimatePresence>
        {detailSkin && (
          <SkinDetail
            key={detailSkin.id}
            skin={detailSkin}
            revealed={revealed.has(detailSkin.id)}
            onReveal={() => markRevealed(detailSkin.id)}
            onClose={() => setDetailId(null)}
            selected={selectedIds.includes(detailSkin.id)}
            onToggleSelect={() => toggleSelect(detailSkin.id)}
            ownedVp={ownedVp}
          />
        )}
      </AnimatePresence>

      <VpGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        recommendations={recommendations}
      />
    </div>
  );
}

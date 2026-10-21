import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Browser } from '@capacitor/browser';
import {
  ClipboardPaste,
  Coins,
  ExternalLink,
  Heart,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import BundleDetail from './components/BundleDetail';
import BundlesView from './components/BundlesView';
import CollectionView from './components/CollectionView';
import ProfileBar from './components/ProfileBar';
import ShopGrid from './components/ShopGrid';
import SkinDetail from './components/SkinDetail';
import SkinPreview from './components/SkinPreview';
import TabBar from './components/TabBar';
import type { Tab } from './components/TabBar';
import VpGuideModal from './components/VpGuideModal';
import WishlistView from './components/WishlistView';
import { notifyWishlist } from './services/notify';
import { LoginCancelledError, riotWebLogin } from './services/riotLogin';
import { MfaRequiredError, riotPasswordLogin, riotSubmitMfa } from './services/riotPasswordLogin';
import {
  AuthExpiredError,
  REGIONS,
  RIOT_LOGIN_URL,
  fetchMyShop,
  parseAccessToken,
} from './services/riotStore';
import type { Region } from './services/riotStore';
import { NOTCH_CLIP } from './types/valorant';
import type { BundleItem, CatalogSkin, DailyShop, PreviewSkin, ValorantSkin } from './types/valorant';
import { shareBadges } from './utils/shareCard';
import type { BadgeShareItem, ShareResult } from './utils/shareCard';
import {
  clearSession,
  clearToken,
  loadCatalog,
  loadNotified,
  loadRegion,
  loadRevealed,
  loadSnapshot,
  loadStats,
  loadToken,
  loadWishlist,
  saveCatalog,
  saveNotified,
  saveRegion,
  saveRevealed,
  saveSnapshot,
  saveStats,
  saveToken,
  saveWishlist,
} from './utils/storage';
import type { UserStats } from './utils/storage';
import { formatCountdown, secondsLeft } from './utils/time';
import { calculateVpRecommendations, formatVp } from './utils/vpCalculator';

type Phase = 'boot' | 'login' | 'shop';

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

/* ---------- 로그인 화면 ---------- */

interface LoginScreenProps {
  region: Region;
  onRegion: (r: Region) => void;
  busy: boolean;
  error: string | null;
  mfaEmail: string | null;
  onWebLogin: () => void;
  onPasswordLogin: (username: string, password: string) => void;
  onMfa: (code: string) => void;
  onSubmit: (pasted: string) => void;
}

const fieldClass =
  'h-11 w-full bg-[#1B2733] px-3 text-sm text-[#ECE8E1] outline-none ring-1 ring-white/10 focus:ring-[#FF4655]';

function LoginScreen({
  region,
  onRegion,
  busy,
  error,
  mfaEmail,
  onWebLogin,
  onPasswordLogin,
  onMfa,
  onSubmit,
}: LoginScreenProps) {
  const [pasted, setPasted] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const openExternal = () => {
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
          로그인하면 내 상점이 바로 열려요. 비밀번호는 이 앱에 저장되지 않아요.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">지역</p>
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
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onWebLogin}
        className="flex h-14 w-full items-center justify-center gap-2 bg-[#FF4655] text-lg font-bold text-white hover:bg-[#ff5f6c] disabled:opacity-60"
        style={{ clipPath: NOTCH_CLIP }}
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
        Riot 계정으로 로그인
      </button>

      {error && <p className="break-words text-sm text-[#FF4655]">{error}</p>}

      <details className="text-sm text-[#ECE8E1]/70" open={mfaEmail !== null}>
        <summary className="cursor-pointer select-none">아이디/비밀번호로 로그인 (앱 전용)</summary>
        <div className="mt-3 space-y-2">
          {mfaEmail === null ? (
            <>
              <input
                className={fieldClass}
                placeholder="Riot 아이디"
                autoComplete="off"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className={fieldClass}
                type="password"
                placeholder="비밀번호"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || username === '' || password === ''}
                onClick={() => {
                  onPasswordLogin(username.trim(), password);
                  setPassword('');
                }}
                className="h-11 w-full bg-[#ECE8E1] text-sm font-bold text-[#0F1923] disabled:opacity-40"
              >
                로그인
              </button>
            </>
          ) : (
            <>
              <p className="text-xs">
                {mfaEmail} 로 보낸 인증 코드를 입력해 주세요.
              </p>
              <input
                className={fieldClass}
                inputMode="numeric"
                placeholder="인증 코드 6자리"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button
                type="button"
                disabled={busy || code.length < 6}
                onClick={() => onMfa(code)}
                className="h-11 w-full bg-[#ECE8E1] text-sm font-bold text-[#0F1923] disabled:opacity-40"
              >
                인증하기
              </button>
            </>
          )}
          <p className="text-[11px] leading-relaxed text-[#ECE8E1]/50">
            비공식 방식이라 Riot이 막으면 안 될 수 있어요. 그땐 위의 Riot 계정 로그인을 쓰세요.
          </p>
        </div>
      </details>

      <details className="text-sm text-[#ECE8E1]/70">
        <summary className="cursor-pointer select-none">주소를 붙여넣어 로그인</summary>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={openExternal}
            className="flex h-10 w-full items-center justify-center gap-2 bg-[#1B2733] text-xs font-bold hover:bg-[#223244]"
          >
            <ExternalLink size={14} />
            브라우저에서 Riot 로그인 열기
          </button>
          <p className="text-xs leading-relaxed text-[#ECE8E1]/60">
            로그인 후 열린 playvalorant.com 페이지의 주소 전체를 복사해서 붙여넣으세요.
          </p>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={3}
            placeholder="https://playvalorant.com/opt_in#access_token=…"
            className="w-full resize-none bg-[#1B2733] p-3 text-xs text-[#ECE8E1] outline-none ring-1 ring-white/10 focus:ring-[#FF4655]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={paste}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 bg-[#1B2733] text-xs font-bold hover:bg-[#223244]"
            >
              <ClipboardPaste size={14} />
              붙여넣기
            </button>
            <button
              type="button"
              disabled={busy || pasted.trim() === ''}
              onClick={() => onSubmit(pasted)}
              className="h-9 flex-1 bg-[#ECE8E1] text-xs font-bold text-[#0F1923] disabled:opacity-40"
            >
              불러오기
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}

/* ---------- 메인 ---------- */

const TAB_TITLES: Record<Tab, string> = {
  shop: '오늘의 상점',
  night: '야시장',
  bundles: '판매 중인 세트',
  wish: '위시리스트',
  collection: '내 컬렉션',
};

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
  const [mfaEmail, setMfaEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('shop');
  const [wishIds, setWishIds] = useState<string[]>(() => loadWishlist());
  const [stats, setStats] = useState<UserStats>(() => loadStats());
  const [catalog, setCatalog] = useState<CatalogSkin[]>(() => loadCatalog());
  const [wishAlert, setWishAlert] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewSkin | null>(null);
  const [bundleId, setBundleId] = useState<string | null>(null);
  const nightCounted = useRef(false);
  const now = useNow(shop !== null);

  const bumpStats = useCallback((fn: (s: UserStats) => UserStats) => {
    setStats((prev) => {
      const next = fn(prev);
      saveStats(next);
      return next;
    });
  }, []);

  /** 위시리스트 스킨이 상점/야시장에 있는지 확인하고, 처음 보는 것만 알림을 보낸다. */
  const checkWishHits = useCallback((next: DailyShop) => {
    const wish = loadWishlist();
    const hits = [...next.skins, ...next.night].filter((s) => wish.includes(s.skinId));
    setWishAlert(hits.map((h) => h.name));
    const notified = loadNotified();
    const fresh = hits.filter((h) => !notified.includes(h.id));
    if (fresh.length > 0) {
      saveNotified([...notified, ...fresh.map((h) => h.id)]);
      void notifyWishlist(fresh.map((h) => h.name));
    }
  }, []);

  const applyShop = useCallback(
    (next: DailyShop) => {
      setShop(next);
      setOwnedInput(String(next.wallet.vp ?? 0));
      setSelectedIds([]);
      nightCounted.current = false;
      setPhase('shop');
      checkWishHits(next);
    },
    [checkWishHits],
  );

  const loadWith = useCallback(
    async (token: string, reg: Region, expiresAt: number): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const { shop: next, catalog: cat } = await fetchMyShop(token, reg);
        saveToken({ token, expiresAt, region: reg });
        saveSnapshot(next);
        if (cat.length > 0) {
          saveCatalog(cat);
          setCatalog(cat);
        }
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

  const handleWebLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      const url = await riotWebLogin();
      setBusy(false);
      handleSubmit(url);
    } catch (e) {
      setBusy(false);
      if (e instanceof LoginCancelledError) return;
      setError(
        e instanceof Error
          ? `${e.message} 아래 "주소로 로그인"을 이용해 주세요.`
          : '로그인에 실패했어요. 아래 "주소로 로그인"을 이용해 주세요.',
      );
    }
  };

  const finishPassword = async (run: () => Promise<string>) => {
    setError(null);
    setBusy(true);
    try {
      const url = await run();
      setBusy(false);
      setMfaEmail(null);
      handleSubmit(url);
    } catch (e) {
      setBusy(false);
      if (e instanceof MfaRequiredError) {
        setMfaEmail(e.email || '등록된 이메일');
        return;
      }
      setError(e instanceof Error ? e.message : '로그인에 실패했어요.');
    }
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

  const handleTab = (t: Tab) => {
    setTab(t);
    if (t === 'night' && shop && shop.night.length > 0 && !nightCounted.current) {
      nightCounted.current = true;
      bumpStats((s) => ({ ...s, nightVisits: s.nightVisits + 1 }));
    }
  };

  const markRevealed = (skin: ValorantSkin) => {
    if (revealed.has(skin.id)) return;
    setRevealed((prev) => {
      const next = new Set(prev);
      next.add(skin.id);
      saveRevealed(next);
      return next;
    });
    const wished = wishIds.includes(skin.skinId);
    bumpStats((s) => ({
      ...s,
      reveals: s.reveals + 1,
      premiumSeen: s.premiumSeen + (skin.tier === 'Premium' ? 1 : 0),
      exclusiveSeen: s.exclusiveSeen + (skin.tier === 'Exclusive' ? 1 : 0),
      ultraSeen: s.ultraSeen + (skin.tier === 'Ultra' ? 1 : 0),
      wishHits: s.wishHits + (wished ? 1 : 0),
    }));
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleWish = (skinId: string) => {
    const adding = !wishIds.includes(skinId);
    const next = adding ? [...wishIds, skinId] : wishIds.filter((x) => x !== skinId);
    setWishIds(next);
    saveWishlist(next);
    if (adding && shop) {
      const hit = [...shop.skins, ...shop.night].find((s) => s.skinId === skinId);
      if (hit) setWishAlert((a) => (a.includes(hit.name) ? a : [...a, hit.name]));
    }
  };

  const handleShareBadges = async (ownedCount: number, badges: BadgeShareItem[]): Promise<ShareResult> => {
    const r = await shareBadges(shop?.riotId ?? 'Riot 계정', ownedCount, badges);
    if (r === 'shared' || r === 'downloaded') bumpStats((s) => ({ ...s, shares: s.shares + 1 }));
    return r;
  };

  const openCatalogPreview = (c: CatalogSkin) =>
    setPreview({
      skinId: c.id,
      name: c.name,
      weapon: c.weapon,
      tier: c.tier,
      imageUrl: c.imageUrl,
      price: c.price ?? null,
    });

  const openItemPreview = (it: BundleItem) => {
    if (!it.skinId) return;
    setPreview({
      skinId: it.skinId,
      name: it.name,
      weapon: it.weapon ?? '',
      tier: it.tier ?? 'Select',
      imageUrl: it.imageUrl,
      price: it.price,
    });
  };

  const ownedVp = Number(ownedInput) || 0;
  const allSkins = useMemo(() => (shop ? [...shop.skins, ...shop.night] : []), [shop]);
  const totalVp = useMemo(
    () => allSkins.filter((s) => selectedIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0),
    [allSkins, selectedIds],
  );
  const recommendations = useMemo(
    () => calculateVpRecommendations(totalVp, ownedVp),
    [totalVp, ownedVp],
  );
  const inShopIds = useMemo(() => new Set(allSkins.map((s) => s.skinId)), [allSkins]);
  const detailSkin = allSkins.find((s) => s.id === detailId) ?? null;
  const bundleDetail = shop?.bundles.find((b) => b.id === bundleId) ?? null;

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
          mfaEmail={mfaEmail}
          onWebLogin={handleWebLogin}
          onPasswordLogin={(u, p) => void finishPassword(() => riotPasswordLogin(u, p))}
          onMfa={(c) => void finishPassword(() => riotSubmitMfa(c))}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  const shopLeft = secondsLeft(shop.fetchedAt, shop.remainingSeconds, now);
  const nightLeft = secondsLeft(shop.fetchedAt, shop.nightRemainingSeconds, now);

  const vpPanel = (
    <section
      aria-label="VP 계산"
      className="grid gap-4 bg-[#1B2733] p-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="owned-vp" className="text-[11px] text-[#ECE8E1]/60">
            보유 VP{shop.wallet.vp !== null ? ' (자동)' : ''}
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
  );

  return (
    <div className="min-h-screen bg-[#0F1923] pb-24 text-[#ECE8E1]">
      <header className="space-y-3 border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black tracking-tight">{TAB_TITLES[tab]}</h1>
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
        </div>
        <ProfileBar riotId={shop.riotId} wallet={shop.wallet} />
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {error && <p className="break-words text-sm text-[#FF4655]">{error}</p>}

        {tab === 'shop' && (
          <>
            {wishAlert.length > 0 && (
              <div className="flex items-start justify-between gap-3 bg-[#FF4655]/15 p-3 text-sm">
                <p className="flex items-start gap-2 font-bold">
                  <Heart size={16} color="#FF4655" fill="#FF4655" className="mt-0.5 shrink-0" />
                  위시리스트 스킨이 상점에 떴어요! {wishAlert.join(', ')}
                </p>
                <button type="button" onClick={() => setWishAlert([])} className="shrink-0 text-xs text-[#ECE8E1]/70">
                  닫기
                </button>
              </div>
            )}
            <p className="text-xs text-[#ECE8E1]/60">
              {shopLeft > 0 ? `상점 갱신까지 ${formatCountdown(shopLeft)}` : '새 상점이 열렸어요. 새로고침해 주세요.'}
            </p>
            <ShopGrid skins={shop.skins} revealedIds={revealed} selectedIds={selectedIds} wishIds={wishIds} onOpen={setDetailId} />
            {vpPanel}
          </>
        )}

        {tab === 'night' &&
          (shop.night.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#ECE8E1]/60">지금은 야시장이 열려 있지 않아요.</p>
          ) : (
            <>
              <p className="text-xs text-[#ECE8E1]/60">
                야시장 종료까지 {formatCountdown(nightLeft)} · 할인가로 표시돼요
              </p>
              <ShopGrid skins={shop.night} revealedIds={revealed} selectedIds={selectedIds} wishIds={wishIds} onOpen={setDetailId} />
              {vpPanel}
            </>
          ))}

        {tab === 'bundles' && (
          <BundlesView
            bundles={shop.bundles}
            fetchedAt={shop.fetchedAt}
            now={now}
            onOpenBundle={setBundleId}
            onOpenItem={openItemPreview}
          />
        )}

        {tab === 'wish' && (
          <WishlistView
            catalog={catalog}
            wishIds={wishIds}
            inShopIds={inShopIds}
            onToggle={toggleWish}
            onOpen={openCatalogPreview}
          />
        )}

        {tab === 'collection' && (
          <CollectionView
            catalog={catalog}
            ownedSkinIds={shop.ownedSkinIds}
            stats={stats}
            wishCount={wishIds.length}
            onShareBadges={handleShareBadges}
            onOpen={openCatalogPreview}
          />
        )}
      </main>

      <TabBar tab={tab} onTab={handleTab} wishDot={wishAlert.length > 0} />

      <AnimatePresence>
        {detailSkin && (
          <SkinDetail
            key={detailSkin.id}
            skin={detailSkin}
            revealed={revealed.has(detailSkin.id)}
            onReveal={() => markRevealed(detailSkin)}
            onClose={() => setDetailId(null)}
            selected={selectedIds.includes(detailSkin.id)}
            onToggleSelect={() => toggleSelect(detailSkin.id)}
            ownedVp={ownedVp}
            wished={wishIds.includes(detailSkin.skinId)}
            onToggleWish={() => toggleWish(detailSkin.skinId)}
            onShared={() => bumpStats((s) => ({ ...s, shares: s.shares + 1 }))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bundleDetail && (
          <BundleDetail
            key={bundleDetail.id}
            bundle={bundleDetail}
            fetchedAt={shop.fetchedAt}
            now={now}
            ownedVp={ownedVp}
            onClose={() => setBundleId(null)}
            onOpenItem={openItemPreview}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {preview && (
          <SkinPreview
            key={preview.skinId}
            skin={preview}
            onClose={() => setPreview(null)}
            wished={wishIds.includes(preview.skinId)}
            onToggleWish={() => toggleWish(preview.skinId)}
            owned={shop.ownedSkinIds.includes(preview.skinId)}
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

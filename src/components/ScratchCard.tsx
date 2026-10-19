import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { NOTCH_CLIP, TIER_STYLES } from '../types/valorant';
import type { ValorantSkin } from '../types/valorant';

interface ScratchCardProps {
  skin: ValorantSkin;
  revealed: boolean;
  onReveal: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  rotate: number;
}

const REVEAL_THRESHOLD = 0.5;
const MEASURE_INTERVAL_MS = 120;

function paintCover(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.globalCompositeOperation = 'source-over';

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#8D98A3');
  g.addColorStop(0.5, '#DCE2E7');
  g.addColorStop(1, '#7F8B96');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(15, 25, 35, 0.14)';
  ctx.lineWidth = Math.max(2, w * 0.012);
  const step = w * 0.09;
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
    ctx.stroke();
  }

  // 발로란트 V 마크 느낌의 쉐브론
  ctx.fillStyle = '#FF4655';
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.3);
  ctx.lineTo(w * 0.4, h * 0.3);
  ctx.lineTo(w * 0.5, h * 0.46);
  ctx.lineTo(w * 0.6, h * 0.3);
  ctx.lineTo(w * 0.72, h * 0.3);
  ctx.lineTo(w * 0.5, h * 0.64);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0F1923';
  ctx.font = `700 ${Math.round(w * 0.075)}px "Noto Sans KR", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('긁어서 확인', w / 2, h * 0.78);
}

function makeParticles(count: number, colors: string[]): Particle[] {
  return Array.from({ length: count }, (_, id) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 120;
    return {
      id,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      size: 4 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 0.8 + Math.random() * 0.8,
      rotate: Math.random() * 360,
    };
  });
}

export default function ScratchCard({
  skin,
  revealed,
  onReveal,
  selected,
  onToggleSelect,
}: ScratchCardProps) {
  const style = TIER_STYLES[skin.tier];
  const reduceMotion = useReducedMotion();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const lastMeasure = useRef(0);
  const completed = useRef(false);
  const [progress, setProgress] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  // 커버 초기화 (마운트 시 / 다시 덮일 때)
  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    completed.current = false;
    paintCover(ctx, canvas.width, canvas.height);
    setProgress(0);
  }, [revealed]);

  const particles = useMemo<Particle[]>(
    () => (revealed ? makeParticles(style.particleCount, style.particleColors) : []),
    [revealed, style],
  );

  const toCanvasPoint = (e: PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const scratch = (e: PointerEvent<HTMLCanvasElement>, isStart: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const p = toCanvasPoint(e, canvas);
    const from = isStart || !lastPoint.current ? p : lastPoint.current;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = canvas.width * 0.09;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x + 0.01, p.y);
    ctx.stroke();
    lastPoint.current = p;
  };

  /** 투명해진 픽셀 비율 (6px 간격 샘플링) */
  const measureCleared = (): number => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return 0;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const stride = 6;
    let total = 0;
    let cleared = 0;
    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        total += 1;
        if (data[(y * width + x) * 4 + 3] < 128) cleared += 1;
      }
    }
    return total === 0 ? 0 : cleared / total;
  };

  const checkProgress = (force: boolean) => {
    const now = performance.now();
    if (!force && now - lastMeasure.current < MEASURE_INTERVAL_MS) return;
    lastMeasure.current = now;
    const ratio = measureCleared();
    setProgress(ratio);
    if (ratio >= REVEAL_THRESHOLD && !completed.current) {
      completed.current = true;
      onReveal();
    }
  };

  const handleDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    scratch(e, true);
  };
  const handleMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    scratch(e, false);
    checkProgress(false);
  };
  const handleUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    checkProgress(true);
  };
  const handleKey = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!completed.current) {
        completed.current = true;
        onReveal();
      }
    }
  };

  const shake = revealed && style.shake && !reduceMotion;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative aspect-[3/4] w-full transition-shadow duration-700"
        style={{
          boxShadow: revealed
            ? `0 0 0 2px ${style.color}, 0 0 24px ${style.glow}, 0 0 56px ${style.glow}`
            : '0 0 0 1px rgba(236, 232, 225, 0.16)',
        }}
      >
        <motion.div
          className="absolute inset-0"
          animate={shake ? { x: [0, -9, 9, -6, 6, -3, 3, 0], y: [0, 3, -3, 2, -2, 0] } : { x: 0, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          {/* 스킨 정보 레이어 */}
          <div
            className="absolute inset-0 flex flex-col justify-between overflow-hidden p-3"
            style={{ background: `linear-gradient(165deg, ${style.from} 0%, #0F1923 72%)` }}
          >
            <span
              className="self-start px-2 py-0.5 text-xs font-bold text-[#0F1923]"
              style={{ backgroundColor: style.color }}
            >
              {style.label}
            </span>

            <div className="flex flex-1 items-center justify-center">
              {imgFailed ? (
                <span className="text-2xl font-black text-white/70">{skin.weapon}</span>
              ) : (
                <img
                  src={skin.imageUrl}
                  alt={`${skin.name} ${skin.weapon}`}
                  draggable={false}
                  onError={() => setImgFailed(true)}
                  className="max-h-full w-full object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]"
                />
              )}
            </div>

            <div>
              <p className="text-sm font-bold leading-tight text-[#ECE8E1]">{skin.name}</p>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-[#ECE8E1]/70">{skin.weapon}</span>
                <span className="font-bold" style={{ color: style.color }}>
                  {skin.price.toLocaleString('ko-KR')} VP
                </span>
              </div>
            </div>
          </div>

          {/* 스크래치 커버 */}
          <AnimatePresence>
            {!revealed && (
              <motion.canvas
                ref={canvasRef}
                key="cover"
                role="button"
                tabIndex={0}
                aria-label={`${skin.weapon} 스킨 카드 긁기. Enter 키로 바로 열기`}
                className="absolute inset-0 h-full w-full cursor-pointer touch-none"
                exit={{ opacity: 0, scale: 1.18, filter: 'blur(6px)', transition: { duration: 0.5 } }}
                onPointerDown={handleDown}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
                onKeyDown={handleKey}
              />
            )}
          </AnimatePresence>

          {!revealed && progress > 0 && (
            <span className="pointer-events-none absolute right-2 top-2 bg-[#0F1923]/80 px-1.5 py-0.5 text-xs font-bold text-[#FF4655]">
              {Math.min(100, Math.round((progress / REVEAL_THRESHOLD) * 100))}%
            </span>
          )}
        </motion.div>

        {/* 파티클 */}
        {particles.length > 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            {particles.map((p) => (
              <motion.span
                key={p.id}
                className="absolute"
                style={{ width: p.size, height: p.size, backgroundColor: p.color }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.2, rotate: p.rotate }}
                transition={{ duration: reduceMotion ? 0.01 : p.duration, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!revealed}
        aria-pressed={selected}
        onClick={onToggleSelect}
        className={`flex h-10 items-center justify-center gap-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          selected ? 'bg-[#FF4655] text-white' : 'bg-[#ECE8E1] text-[#0F1923] hover:bg-white'
        }`}
        style={{ clipPath: NOTCH_CLIP }}
      >
        {selected ? <Check size={16} /> : <Plus size={16} />}
        {selected ? '구매 목록에 담김' : revealed ? '구매 목록에 담기' : '긁으면 선택 가능'}
      </button>
    </div>
  );
}

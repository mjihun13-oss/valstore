import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TIER_STYLES } from '../types/valorant';
import type { SkinTier, ValorantSkin } from '../types/valorant';

interface ScratchCardProps {
  skin: ValorantSkin;
  revealed: boolean;
  onReveal: () => void;
  /** 크로마 선택 시 바꿔 보여줄 이미지 */
  imageUrl?: string;
}

/** 이 비율 이상 긁으면 나머지가 깔끔하게 지워진다 */
const REVEAL_THRESHOLD = 0.65;
/** 붓 굵기 (카드 너비 대비) */
const BRUSH_RATIO = 0.13;
const MEASURE_INTERVAL_MS = 120;
const MAX_PARTICLES = 420;

type Shape = 'dot' | 'star' | 'spark';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  size: number;
  color: string;
  shape: Shape;
  rot: number;
  vr: number;
  glow: number;
}

interface Burst {
  colors: string[];
  count: number;
  size: [number, number];
  shapes: Shape[];
  speed: number;
  gravity: number;
  glow: number;
  life: [number, number];
}

/** 긁는 동안 나오는 파티클. 높은 티어일수록 크고 화려하다. */
const BURSTS: Record<SkinTier, Burst> = {
  Select: { colors: ['#DDE6EE', '#9FB4C4'], count: 1, size: [2, 4], shapes: ['dot'], speed: 1.6, gravity: 0.05, glow: 0, life: [18, 30] },
  Deluxe: { colors: ['#DDE6EE', '#9FB4C4'], count: 1, size: [2, 4], shapes: ['dot'], speed: 1.6, gravity: 0.05, glow: 0, life: [18, 30] },
  Premium: { colors: ['#FF5CAD', '#B66BFF', '#FFFFFF'], count: 4, size: [10, 20], shapes: ['star'], speed: 3.2, gravity: -0.05, glow: 16, life: [45, 75] },
  Exclusive: { colors: ['#FFC94D', '#FF9F43', '#FFFFFF'], count: 6, size: [8, 18], shapes: ['spark', 'star'], speed: 5.5, gravity: 0.16, glow: 18, life: [40, 70] },
  Ultra: { colors: ['#FF4655', '#FFD54A', '#FFFFFF'], count: 9, size: [12, 26], shapes: ['star', 'spark'], speed: 7.5, gravity: 0.1, glow: 26, life: [50, 85] },
};

function paintCover(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.globalCompositeOperation = 'source-over';

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#6F7B86');
  g.addColorStop(0.5, '#C9D0D6');
  g.addColorStop(1, '#5F6B76');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(15, 25, 35, 0.16)';
  ctx.lineWidth = Math.max(2, w * 0.012);
  const step = w * 0.09;
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
    ctx.stroke();
  }

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
  ctx.font = `700 ${Math.round(w * 0.07)}px "Noto Sans KR", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('문질러서 확인', w / 2, h * 0.78);
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function drawStar(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const r = i % 2 === 0 ? size : size * 0.32;
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export default function ScratchCard({ skin, revealed, onReveal, imageUrl }: ScratchCardProps) {
  const style = TIER_STYLES[skin.tier];
  const src = imageUrl || skin.imageUrl;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const lastMeasure = useRef(0);
  const completed = useRef(false);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number | null>(null);
  const dprRef = useRef(1);
  const [progress, setProgress] = useState(0);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    const fx = fxRef.current;
    if (!canvas || !fx) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 확대 애니메이션 중에도 정확하도록 transform 영향을 받지 않는 clientWidth 사용
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    fx.width = canvas.width;
    fx.height = canvas.height;
    completed.current = false;
    paintCover(ctx, canvas.width, canvas.height);
    setProgress(0);
  }, [revealed]);

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const runParticles = () => {
    if (raf.current !== null) return;
    const loop = () => {
      const c = fxRef.current;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) {
        raf.current = null;
        return;
      }
      ctx.clearRect(0, 0, c.width, c.height);
      const list = particles.current;
      const dpr = dprRef.current;
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const p = list[i];
        p.life -= 1;
        if (p.life <= 0) {
          list.splice(i, 1);
          continue;
        }
        p.vy += p.g * dpr;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        ctx.save();
        ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.glow * dpr;
        if (p.shape === 'star') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          drawStar(ctx, p.size);
        } else if (p.shape === 'spark') {
          ctx.lineWidth = Math.max(1.5, p.size * 0.22);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (list.length > 0) {
        raf.current = requestAnimationFrame(loop);
      } else {
        raf.current = null;
        ctx.clearRect(0, 0, c.width, c.height);
      }
    };
    raf.current = requestAnimationFrame(loop);
  };

  const emit = (x: number, y: number) => {
    const b = BURSTS[skin.tier];
    const dpr = dprRef.current;
    const list = particles.current;
    for (let i = 0; i < b.count && list.length < MAX_PARTICLES; i += 1) {
      const a = rand(0, Math.PI * 2);
      const spd = b.speed * dpr * rand(0.4, 1.1);
      const life = Math.round(rand(b.life[0], b.life[1]));
      list.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - (b.gravity < 0 ? 1.2 * dpr : 0.6 * dpr),
        g: b.gravity,
        life,
        max: life,
        size: rand(b.size[0], b.size[1]) * dpr,
        color: pick(b.colors),
        shape: pick(b.shapes),
        rot: rand(0, Math.PI),
        vr: rand(-0.2, 0.2),
        glow: b.glow,
      });
    }
    runParticles();
  };

  const toPoint = (e: PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
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
    const p = toPoint(e, canvas);
    const from = isStart || !lastPoint.current ? p : lastPoint.current;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = canvas.width * BRUSH_RATIO;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x + 0.01, p.y);
    ctx.stroke();
    lastPoint.current = p;
    emit(p.x, p.y);
  };

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
    if ((e.key === 'Enter' || e.key === ' ') && !completed.current) {
      e.preventDefault();
      completed.current = true;
      onReveal();
    }
  };

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden">
      <div
        className="absolute inset-0 flex flex-col justify-between p-4"
        style={{ background: `linear-gradient(165deg, ${style.from} 0%, #0F1923 75%)` }}
      >
        <span
          className="self-start px-2 py-0.5 text-xs font-bold text-[#0F1923]"
          style={{ backgroundColor: style.color }}
        >
          {style.label}
        </span>

        <div className="flex flex-1 items-center justify-center">
          {!src || failedSrc === src ? (
            <span className="text-2xl font-black text-white/70">{skin.weapon}</span>
          ) : (
            <img
              src={src}
              alt={`${skin.name} ${skin.weapon}`}
              draggable={false}
              onError={() => setFailedSrc(src)}
              className="max-h-full w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
            />
          )}
        </div>

        <div>
          <p className="text-lg font-bold leading-tight text-[#ECE8E1]">{skin.name}</p>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-[#ECE8E1]/70">{skin.weapon}</span>
            <span className="font-bold" style={{ color: style.color }}>
              {skin.originalPrice !== undefined && skin.originalPrice !== skin.price && (
                <s className="mr-1.5 font-normal text-[#ECE8E1]/50">
                  {skin.originalPrice.toLocaleString('ko-KR')}
                </s>
              )}
              {skin.price.toLocaleString('ko-KR')} VP
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!revealed && (
          <motion.canvas
            ref={canvasRef}
            key="cover"
            role="button"
            tabIndex={0}
            aria-label={`${skin.weapon} 스킨 카드 긁기. Enter 키로 바로 열기`}
            className="absolute inset-0 h-full w-full cursor-pointer touch-none"
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            onKeyDown={handleKey}
          />
        )}
      </AnimatePresence>

      <canvas ref={fxRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />

      {!revealed && progress > 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 h-1.5 bg-black/40">
          <div
            className="h-full bg-[#FF4655] transition-[width] duration-150"
            style={{ width: `${Math.min(100, (progress / REVEAL_THRESHOLD) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

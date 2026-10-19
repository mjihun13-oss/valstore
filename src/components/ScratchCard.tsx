import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TIER_STYLES } from '../types/valorant';
import type { ValorantSkin } from '../types/valorant';

interface ScratchCardProps {
  skin: ValorantSkin;
  revealed: boolean;
  onReveal: () => void;
  /** 크로마 선택 시 바꿔 보여줄 이미지 */
  imageUrl?: string;
}

/** 이 비율 이상 긁어야 카드가 열린다 */
const REVEAL_THRESHOLD = 0.75;
const BRUSH_RATIO = 0.06;
const MEASURE_INTERVAL_MS = 150;

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

export default function ScratchCard({ skin, revealed, onReveal, imageUrl }: ScratchCardProps) {
  const style = TIER_STYLES[skin.tier];
  const src = imageUrl || skin.imageUrl;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const lastMeasure = useRef(0);
  const completed = useRef(false);
  const [progress, setProgress] = useState(0);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 확대 애니메이션 중에도 정확하도록 transform 영향을 받지 않는 clientWidth 사용
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    completed.current = false;
    paintCover(ctx, canvas.width, canvas.height);
    setProgress(0);
  }, [revealed]);

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
            exit={{ opacity: 0, scale: 1.12, filter: 'blur(6px)', transition: { duration: 0.45 } }}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            onKeyDown={handleKey}
          />
        )}
      </AnimatePresence>

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

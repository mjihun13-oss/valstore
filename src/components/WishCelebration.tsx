import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const COLORS = ['#FFD54A', '#FF5CAD', '#FF4655', '#00C2FF', '#2BFFA0', '#FFFFFF', '#B66BFF'];

interface WishCelebrationProps {
  /** 0이면 재생 안 함. 값이 바뀔 때마다 새로 재생 */
  playKey: number;
  name: string;
}

/** 위시리스트 스킨이 나왔을 때의 축하 연출 (색종이, 하트, 황금빛, 배너) */
export default function WishCelebration({ playKey, name }: WishCelebrationProps) {
  const reduce = useReducedMotion();

  const confetti = useMemo(
    () =>
      Array.from({ length: 90 }, (_, id) => ({
        id,
        left: rand(0, 100),
        w: rand(6, 14),
        h: rand(10, 22),
        drift: rand(-80, 80),
        rot: rand(360, 1080),
        delay: rand(0, 1),
        dur: rand(2.4, 4.2),
        color: COLORS[Math.floor(rand(0, COLORS.length))],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playKey],
  );
  const hearts = useMemo(
    () =>
      Array.from({ length: 16 }, (_, id) => ({
        id,
        x: rand(-170, 170),
        rise: rand(220, 520),
        size: rand(18, 40),
        delay: rand(0.1, 1),
        dur: rand(1.8, 2.8),
        color: COLORS[Math.floor(rand(0, 3))],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playKey],
  );

  if (reduce || playKey === 0) return null;

  return (
    <div key={playKey} className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(255,213,74,0.55), rgba(255,92,173,0.25) 45%, transparent 70%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 0] }}
        transition={{ duration: 2.6, times: [0, 0.15, 0.6, 1] }}
      />

      {confetti.map((c) => (
        <motion.span
          key={c.id}
          className="absolute"
          style={{ left: `${c.left}%`, top: -30, width: c.w, height: c.h, backgroundColor: c.color }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', x: c.drift, rotate: c.rot, opacity: [1, 1, 0.8] }}
          transition={{ duration: c.dur, delay: c.delay, ease: 'easeIn' }}
        />
      ))}

      {hearts.map((h) => (
        <motion.div
          key={h.id}
          className="absolute"
          style={{ left: '50%', top: '60%' }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
          animate={{ x: h.x, y: -h.rise, opacity: [0, 1, 1, 0], scale: [0.3, 1.1, 1, 0.8] }}
          transition={{ duration: h.dur, delay: h.delay, ease: 'easeOut' }}
        >
          <Heart size={h.size} color={h.color} fill={h.color} />
        </motion.div>
      ))}

      <motion.div
        className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] mx-auto max-w-md px-4 py-3 text-center text-[#0F1923]"
        style={{
          background: 'linear-gradient(90deg, #FFD54A, #FFF2B0, #FFD54A)',
          boxShadow: '0 0 32px rgba(255,213,74,0.9)',
        }}
        initial={{ y: -120, opacity: 0, scale: 0.8 }}
        animate={{ y: [-120, 0, 0, -120], opacity: [0, 1, 1, 0], scale: [0.8, 1.05, 1, 1] }}
        transition={{ duration: 3.4, times: [0, 0.12, 0.85, 1] }}
      >
        <p className="text-lg font-black">위시리스트 스킨 당첨!</p>
        <p className="mt-0.5 text-sm font-bold">{name}</p>
      </motion.div>
    </div>
  );
}

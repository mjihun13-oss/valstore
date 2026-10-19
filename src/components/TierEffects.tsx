import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TIER_STYLES } from '../types/valorant';
import type { SkinTier } from '../types/valorant';

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const STAR_CLIP =
  'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)';

/** Premium: 보라빛 파동이 퍼지고 별빛이 천천히 떠오른다 */
function Aura({ playKey }: { playKey: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 24 }, (_, id) => ({
        id,
        x: rand(-160, 160),
        rise: rand(160, 460),
        size: rand(8, 22),
        delay: rand(0, 0.7),
        dur: rand(1.5, 2.4),
        color: pick(['#FF5CAD', '#B66BFF', '#FFFFFF']),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playKey],
  );

  return (
    <>
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 45%, rgba(182,107,255,0.4), transparent 60%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.8 }}
      />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '45%',
            width: 220,
            height: 220,
            marginLeft: -110,
            marginTop: -110,
            border: '3px solid',
            borderColor: i % 2 === 0 ? '#FF5CAD' : '#B66BFF',
          }}
          initial={{ scale: 0.2, opacity: 0.9 }}
          animate={{ scale: 3.2, opacity: 0 }}
          transition={{ duration: 1.3, delay: i * 0.2, ease: 'easeOut' }}
        />
      ))}
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute"
          style={{
            left: '50%',
            top: '62%',
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            clipPath: STAR_CLIP,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
          animate={{ x: s.x, y: -s.rise, opacity: [0, 1, 1, 0], scale: [0.2, 1, 0.8, 0.3], rotate: [0, 90] }}
          transition={{ duration: s.dur, delay: s.delay, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

/** Exclusive: 번쩍이는 플래시와 금빛 불꽃이 사방으로 터진다 */
function Sparks({ playKey }: { playKey: number }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 48 }, (_, id) => {
        const a = rand(0, Math.PI * 2);
        const d = rand(120, 380);
        return {
          id,
          ax: Math.cos(a) * d,
          ay: Math.sin(a) * d,
          deg: (a * 180) / Math.PI + 90,
          h: rand(10, 26),
          w: rand(2, 4),
          dur: rand(0.9, 1.5),
          color: pick(['#FFC94D', '#FF9F43', '#FFFFFF', '#FF4655']),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playKey],
  );

  return (
    <>
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0.75 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute left-0 right-0 h-[3px]"
        style={{
          top: '45%',
          background: 'linear-gradient(90deg, transparent, #FFC94D, #FFFFFF, #FFC94D, transparent)',
          boxShadow: '0 0 18px 4px rgba(255,201,77,0.8)',
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, times: [0, 0.35, 1] }}
      />
      {sparks.map((s) => (
        <motion.span
          key={s.id}
          className="absolute"
          style={{
            left: '50%',
            top: '45%',
            width: s.w,
            height: s.h,
            backgroundColor: s.color,
            rotate: s.deg,
            boxShadow: `0 0 8px ${s.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: [0, s.ax, s.ax * 1.05],
            y: [0, s.ay, s.ay + 110],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: s.dur, times: [0, 0.55, 1], ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

/** Ultra: 번개가 내리치고 충격파가 퍼지며 화면이 붉게 물든다 */
function Storm({ playKey }: { playKey: number }) {
  const bolts = useMemo(
    () =>
      [0, 0.14, 0.32].map((delay, id) => {
        let x = rand(15, 85);
        const pts = ['' + x + ',0'];
        for (let k = 1; k <= 7; k += 1) {
          x = Math.min(95, Math.max(5, x + rand(-10, 10)));
          pts.push(`${x},${k * 9}`);
        }
        return { id, delay, points: pts.join(' ') };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playKey],
  );

  return (
    <>
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 45%, transparent 35%, rgba(255,70,85,0.6) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.6, 0] }}
        transition={{ duration: 1.8, times: [0, 0.1, 0.5, 1] }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {bolts.map((b) => (
          <motion.polyline
            key={b.id}
            points={b.points}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            style={{ filter: 'drop-shadow(0 0 6px #FF4655) drop-shadow(0 0 12px #FFD54A)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0, 1, 0, 0] }}
            transition={{ duration: 0.9, delay: b.delay, times: [0, 0.08, 0.16, 0.24, 0.5, 1] }}
          />
        ))}
      </svg>
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '45%',
            width: 160,
            height: 160,
            marginLeft: -80,
            marginTop: -80,
            border: '5px solid',
            borderColor: i === 0 ? '#FFD54A' : '#FF4655',
          }}
          initial={{ scale: 0.1, opacity: 1 }}
          animate={{ scale: 6, opacity: 0 }}
          transition={{ duration: 0.9, delay: 0.25 + i * 0.15, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="absolute left-0 right-0 text-center text-6xl font-black tracking-[0.3em] text-[#FFD54A]"
        style={{ top: '38%', textShadow: '0 0 24px #FF4655, 0 4px 0 #8A1F2B' }}
        initial={{ scale: 3, opacity: 0, filter: 'blur(12px)' }}
        animate={{
          scale: [3, 0.9, 1, 1],
          opacity: [0, 1, 1, 0],
          filter: ['blur(12px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
        }}
        transition={{ duration: 1.7, times: [0, 0.2, 0.7, 1] }}
      >
        ULTRA
      </motion.div>
    </>
  );
}

interface TierEffectsProps {
  tier: SkinTier;
  /** 0이면 재생 안 함. 값이 바뀔 때마다 효과를 새로 재생한다. */
  playKey: number;
}

export default function TierEffects({ tier, playKey }: TierEffectsProps) {
  const reduce = useReducedMotion();
  const effect = TIER_STYLES[tier].effect;
  if (reduce || playKey === 0 || effect === 'none') return null;

  return (
    <div key={playKey} className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {effect === 'aura' && <Aura playKey={playKey} />}
      {effect === 'sparks' && <Sparks playKey={playKey} />}
      {effect === 'storm' && <Storm playKey={playKey} />}
    </div>
  );
}

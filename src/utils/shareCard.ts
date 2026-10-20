import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { TIER_STYLES } from '../types/valorant';
import type { ValorantSkin } from '../types/valorant';

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

const W = 1080;
const H = 1350;
const FONT = '"Noto Sans KR", system-ui, sans-serif';

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function newCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  return { canvas, ctx };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, maxW: number): void {
  let size = start;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && size > 24) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
}

/** 자랑용 스킨 카드 이미지 */
async function renderSkinImage(skin: ValorantSkin, imageUrl: string): Promise<Blob> {
  const style = TIER_STYLES[skin.tier];
  const { canvas, ctx } = newCanvas();

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, style.from);
  g.addColorStop(1, '#0F1923');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = style.color;
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  ctx.font = `800 32px ${FONT}`;
  const chipW = ctx.measureText(style.label).width + 48;
  ctx.fillStyle = style.color;
  ctx.fillRect(72, 72, chipW, 56);
  ctx.fillStyle = '#0F1923';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.label, 96, 101);

  const img = await loadImage(imageUrl);
  if (img) {
    const bx = 60;
    const by = 170;
    const bw = W - 120;
    const bh = 760;
    const scale = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
  }

  ctx.textBaseline = 'alphabetic';
  fitText(ctx, skin.name, 800, 68, W - 144);
  ctx.fillStyle = '#ECE8E1';
  ctx.fillText(skin.name, 72, 1030);

  ctx.font = `500 38px ${FONT}`;
  ctx.fillStyle = style.color;
  ctx.fillText(`${skin.weapon} · ${skin.price.toLocaleString('ko-KR')} VP`, 72, 1095);

  ctx.fillStyle = '#FF4655';
  ctx.fillRect(72, H - 130, 56, 6);
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = 'rgba(236,232,225,0.8)';
  ctx.fillText('오늘 내 발로란트 상점', 72, H - 80);

  return toBlob(canvas);
}

export interface BadgeShareItem {
  name: string;
  desc: string;
  color: string;
}

/** 자랑용 뱃지 카드 이미지 */
async function renderBadgeImage(
  riotId: string,
  ownedCount: number,
  badges: BadgeShareItem[],
): Promise<Blob> {
  const { canvas, ctx } = newCanvas();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1B2733');
  g.addColorStop(1, '#0F1923');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#FF4655';
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  ctx.textBaseline = 'alphabetic';
  fitText(ctx, riotId, 800, 72, W - 144);
  ctx.fillStyle = '#ECE8E1';
  ctx.fillText(riotId, 72, 170);

  ctx.font = `500 38px ${FONT}`;
  ctx.fillStyle = 'rgba(236,232,225,0.75)';
  ctx.fillText(`보유 스킨 ${ownedCount}개 · 뱃지 ${badges.length}개`, 72, 235);

  const shown = badges.slice(0, 10);
  shown.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 72 + col * 474;
    const y = 300 + row * 190;
    ctx.fillStyle = '#223244';
    ctx.fillRect(x, y, 450, 170);
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, 10, 170);
    fitText(ctx, b.name, 800, 40, 390);
    ctx.fillStyle = b.color;
    ctx.fillText(b.name, x + 34, y + 72);
    fitText(ctx, b.desc, 500, 28, 390);
    ctx.fillStyle = 'rgba(236,232,225,0.7)';
    ctx.fillText(b.desc, x + 34, y + 122);
  });
  if (shown.length === 0) {
    ctx.font = `600 36px ${FONT}`;
    ctx.fillStyle = 'rgba(236,232,225,0.6)';
    ctx.fillText('아직 모은 뱃지가 없어요', 72, 340);
  }

  ctx.fillStyle = '#FF4655';
  ctx.fillRect(72, H - 130, 56, 6);
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = 'rgba(236,232,225,0.8)';
  ctx.fillText('내 발로란트 상점 뱃지', 72, H - 80);
  return toBlob(canvas);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(blob);
  });
}

const isCancel = (e: unknown): boolean =>
  e instanceof Error && (e.name === 'AbortError' || /cancel/i.test(e.message));

/** 이미지(가능하면)와 글을 공유한다. 이미지가 안 되면 글만 공유한다. */
async function shareBlob(makeBlob: () => Promise<Blob>, text: string): Promise<ShareResult> {
  try {
    const blob = await makeBlob();

    if (Capacitor.isNativePlatform()) {
      const data = await blobToBase64(blob);
      const { uri } = await Filesystem.writeFile({
        path: `share-${Date.now()}.png`,
        data,
        directory: Directory.Cache,
      });
      await Share.share({ title: '발로란트 상점 자랑', text, url: uri, dialogTitle: '자랑하기' });
      return 'shared';
    }

    const file = new File([blob], 'valorant-shop.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return 'shared';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'valorant-shop.png';
    a.click();
    return 'downloaded';
  } catch (e) {
    if (isCancel(e)) return 'cancelled';
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: '발로란트 상점 자랑', text });
        return 'shared';
      }
      if (navigator.share) {
        await navigator.share({ text });
        return 'shared';
      }
    } catch (e2) {
      if (isCancel(e2)) return 'cancelled';
    }
    return 'failed';
  }
}

export function shareSkin(skin: ValorantSkin, imageUrl: string): Promise<ShareResult> {
  const text = `오늘 내 발로란트 상점에 ${skin.name} ${skin.weapon}(${skin.tier})이 떴어요! (${skin.price.toLocaleString('ko-KR')} VP)`;
  return shareBlob(() => renderSkinImage(skin, imageUrl), text);
}

export function shareBadges(
  riotId: string,
  ownedCount: number,
  badges: BadgeShareItem[],
): Promise<ShareResult> {
  const text = `${riotId}의 발로란트 뱃지 ${badges.length}개! 보유 스킨 ${ownedCount}개`;
  return shareBlob(() => renderBadgeImage(riotId, ownedCount, badges), text);
}

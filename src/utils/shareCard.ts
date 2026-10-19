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

/** 자랑용 카드 이미지(PNG)를 캔버스로 그린다. */
async function renderShareImage(skin: ValorantSkin, imageUrl: string): Promise<Blob> {
  const style = TIER_STYLES[skin.tier];
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

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

  let size = 68;
  ctx.font = `800 ${size}px ${FONT}`;
  while (ctx.measureText(skin.name).width > W - 144 && size > 32) {
    size -= 4;
    ctx.font = `800 ${size}px ${FONT}`;
  }
  ctx.textBaseline = 'alphabetic';
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

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
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

/** 스킨 카드 이미지를 만들어 공유한다. 이미지가 안 되면 글만 공유한다. */
export async function shareSkin(skin: ValorantSkin, imageUrl: string): Promise<ShareResult> {
  const text = `오늘 내 발로란트 상점에 ${skin.name} ${skin.weapon}(${skin.tier})이 떴어요! (${skin.price.toLocaleString('ko-KR')} VP)`;

  try {
    const blob = await renderShareImage(skin, imageUrl);

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

import type { SkinChroma } from '../types/valorant';

export interface SkinDetailData {
  imageUrl: string;
  chromas: SkinChroma[];
  videoUrl: string | null;
  levelCount: number;
}

interface RawDetail {
  displayIcon: string | null;
  chromas: {
    uuid: string;
    displayName: string;
    displayIcon: string | null;
    fullRender: string | null;
    swatch: string | null;
    streamedVideo: string | null;
  }[];
  levels: { displayIcon: string | null; streamedVideo: string | null }[];
}

const cache = new Map<string, SkinDetailData>();

/** 스킨 한 개의 크로마·영상 정보를 필요할 때만 불러온다. (미리보기용) */
export async function fetchSkinDetail(skinId: string): Promise<SkinDetailData> {
  const cached = cache.get(skinId);
  if (cached) return cached;

  const res = await fetch(`https://valorant-api.com/v1/weapons/skins/${skinId}?language=ko-KR`);
  if (!res.ok) throw new Error(`스킨 정보를 불러오지 못했어요 (${res.status})`);
  const { data } = (await res.json()) as { data: RawDetail };

  const chromas: SkinChroma[] = data.chromas
    .map((c) => ({
      id: c.uuid,
      name: c.displayName,
      imageUrl: c.fullRender ?? c.displayIcon ?? '',
      swatchUrl: c.swatch,
      videoUrl: c.streamedVideo,
    }))
    .filter((c) => c.imageUrl !== '');

  const result: SkinDetailData = {
    imageUrl: data.displayIcon ?? data.levels[0]?.displayIcon ?? chromas[0]?.imageUrl ?? '',
    chromas,
    videoUrl: [...data.levels].reverse().find((l) => l.streamedVideo)?.streamedVideo ?? null,
    levelCount: data.levels.length,
  };
  cache.set(skinId, result);
  return result;
}

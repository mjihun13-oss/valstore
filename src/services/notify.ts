import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/** 위시리스트 스킨이 상점에 떴을 때 폰 알림을 띄운다. (앱을 열었을 때 확인되는 시점에 울린다) */
export async function notifyWishlist(names: string[]): Promise<void> {
  if (!Capacitor.isNativePlatform() || names.length === 0) return;
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Date.now() / 1000) % 2147483647,
          title: '위시리스트 스킨이 상점에 떴어요!',
          body: names.join(', '),
          schedule: { at: new Date(Date.now() + 1000) },
        },
      ],
    });
  } catch {
    /* 알림 실패는 무시 */
  }
}

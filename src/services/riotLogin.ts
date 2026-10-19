import { Capacitor } from '@capacitor/core';
import { InAppBrowser } from '@capgo/inappbrowser';
import { RIOT_LOGIN_URL } from './riotStore';

export class LoginCancelledError extends Error {}

interface ListenerHandle {
  remove: () => Promise<void> | void;
}

/** 플러그인 버전에 따라 타입이 조금 달라도 빌드가 깨지지 않도록 필요한 부분만 정의한다. */
interface InAppBrowserLike {
  addListener(event: string, cb: (e: { url?: string }) => void): Promise<ListenerHandle>;
  openWebView(opts: { url: string; title?: string }): Promise<unknown>;
  close(): Promise<unknown> | void;
}

/**
 * 앱 안에서 Riot 로그인 창을 열고, 로그인이 끝나 주소에 access_token 이 붙으면
 * 그 주소를 돌려준다. 이미 Riot에 로그인된 기기면 창이 거의 바로 닫힌다.
 */
export async function riotWebLogin(): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('자동 로그인은 설치한 앱에서만 돼요. 아래에서 주소를 직접 붙여넣어 주세요.');
  }
  const iab = InAppBrowser as unknown as InAppBrowserLike;
  const handles: ListenerHandle[] = [];

  return new Promise<string>((resolve, reject) => {
    let finished = false;

    const finish = (action: () => void) => {
      if (finished) return;
      finished = true;
      handles.forEach((h) => {
        try {
          void h.remove();
        } catch {
          /* 무시 */
        }
      });
      action();
    };

    const onUrl = (e: { url?: string }) => {
      const url = e.url ?? '';
      if (!url.includes('access_token=')) return;
      finish(() => resolve(url));
      void Promise.resolve(iab.close()).catch(() => undefined);
    };
    const onClose = () => finish(() => reject(new LoginCancelledError('cancelled')));

    void (async () => {
      try {
        handles.push(await iab.addListener('urlChangeEvent', onUrl));
        handles.push(await iab.addListener('closeEvent', onClose));
        await iab.openWebView({ url: RIOT_LOGIN_URL, title: 'Riot 로그인' });
      } catch (err) {
        finish(() =>
          reject(err instanceof Error ? err : new Error('로그인 창을 열지 못했어요.')),
        );
      }
    })();
  });
}

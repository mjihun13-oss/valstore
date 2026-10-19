import type { CapacitorConfig } from '@capacitor/cli';

/**
 * server.url 을 지정하지 않으므로 웹 자산(dist)이 앱 안에 번들되어
 * 실행할 때 웹에서 내려받는 데이터가 없다.
 */
const config: CapacitorConfig = {
  appId: 'com.example.valorantshop', // 스토어 등록 전에 본인 도메인으로 변경
  appName: 'Valorant Shop',
  webDir: 'dist',
  backgroundColor: '#0F1923',
  ios: { contentInset: 'always' },
  android: { allowMixedContent: false },
};

export default config;

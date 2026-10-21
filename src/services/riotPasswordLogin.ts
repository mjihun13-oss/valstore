import { Capacitor } from '@capacitor/core';

/** 인증 코드(MFA)가 필요할 때 던진다. */
export class MfaRequiredError extends Error {
  email: string;
  constructor(email: string) {
    super('mfa required');
    this.email = email;
  }
}

const AUTH_URL = 'https://auth.riotgames.com/api/v1/authorization';
/** 웹 버전에서 로그인을 대신 처리해 주는 서버 주소 (Vercel 배포 시 자동으로 생긴다) */
const LOGIN_API = (import.meta.env.VITE_LOGIN_API as string | undefined) ?? '/api/login';
/** 웹 로그인 도중(인증 코드 입력 단계)에 유지해야 하는 Riot 세션 쿠키 */
let webCookie = '';
const USER_AGENT = 'RiotClient/63.0.9.4909983.4789131 rso-auth (Windows;10;;Professional, x64)';

interface AuthResponse {
  type: string;
  error?: string;
  response?: { parameters?: { uri?: string } };
  multifactor?: { email?: string; method?: string };
}

async function authRequest(method: 'POST' | 'PUT', body: unknown): Promise<AuthResponse> {
  const res = await fetch(AUTH_URL, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify(body),
  });
  if (res.status === 403 || res.status === 429) {
    throw new Error(
      `Riot이 이 방식의 로그인을 막았어요 (${res.status}). "Riot 계정으로 로그인" 버튼을 이용해 주세요.`,
    );
  }
  if (!res.ok) throw new Error(`로그인 요청에 실패했어요 (${res.status})`);
  return (await res.json()) as AuthResponse;
}

/** 성공하면 access_token 이 붙은 주소를 돌려준다. */
function handle(r: AuthResponse): string {
  const uri = r.response?.parameters?.uri;
  if (r.type === 'response' && uri) return uri;
  if (r.type === 'multifactor') throw new MfaRequiredError(r.multifactor?.email ?? '');
  if (r.error === 'auth_failure' || r.type === 'auth') {
    throw new Error('아이디 또는 비밀번호가 올바르지 않아요.');
  }
  if (r.error === 'rate_limited') {
    throw new Error('요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.');
  }
  throw new Error(`로그인에 실패했어요 (${r.error ?? r.type})`);
}

async function webAuth(body: Record<string, unknown>): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(LOGIN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, cookie: webCookie }),
    });
  } catch {
    throw new Error('로그인 서버에 연결하지 못했어요.');
  }
  if (!res.ok) {
    throw new Error('로그인 서버를 찾지 못했어요. 웹사이트가 Vercel로 배포돼 있어야 해요.');
  }
  const j = (await res.json()) as { status: number; data: AuthResponse; cookie: string };
  webCookie = j.cookie;
  if (j.status === 403 || j.status === 429) {
    throw new Error(
      `Riot이 이 방식의 로그인을 막았어요 (${j.status}). "Riot 계정으로 로그인" 버튼을 이용해 주세요.`,
    );
  }
  return j.data;
}

/** 비밀번호는 Riot 서버로만 보내고 앱에 저장하지 않는다. */
export async function riotPasswordLogin(username: string, password: string): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    webCookie = '';
    return handle(await webAuth({ step: 'auth', username, password }));
  }
  await authRequest('POST', {
    client_id: 'play-valorant-web-prod',
    nonce: '1',
    redirect_uri: 'https://playvalorant.com/opt_in',
    response_type: 'token id_token',
    scope: 'account openid',
  });
  return handle(
    await authRequest('PUT', { type: 'auth', username, password, remember: false, language: 'en_US' }),
  );
}

export async function riotSubmitMfa(code: string): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    return handle(await webAuth({ step: 'mfa', code }));
  }
  return handle(await authRequest('PUT', { type: 'multifactor', code, rememberDevice: false }));
}

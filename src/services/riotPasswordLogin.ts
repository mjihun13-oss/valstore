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

function assertNative(): void {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('아이디/비밀번호 로그인은 설치한 앱에서만 돼요. "Riot 계정으로 로그인"을 이용해 주세요.');
  }
}

/** 비밀번호는 Riot 서버로만 보내고 앱에 저장하지 않는다. */
export async function riotPasswordLogin(username: string, password: string): Promise<string> {
  assertNative();
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
  assertNative();
  return handle(await authRequest('PUT', { type: 'multifactor', code, rememberDevice: false }));
}

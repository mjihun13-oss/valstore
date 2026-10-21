// Vercel 서버리스 함수: 웹에서 아이디/비밀번호 로그인을 대신 처리한다.
// 브라우저는 Riot 로그인에 필요한 쿠키를 직접 다룰 수 없어서 서버가 쿠키를 들고 Riot과 통신한다.
// 비밀번호는 Riot으로만 전달하고 저장하거나 기록하지 않는다.
const AUTH_URL = 'https://auth.riotgames.com/api/v1/authorization';
const USER_AGENT = 'RiotClient/63.0.9.4909983.4789131 rso-auth (Windows;10;;Professional, x64)';

function jarFromString(s) {
  const jar = new Map();
  for (const part of String(s || '').split('; ')) {
    const i = part.indexOf('=');
    if (i > 0) jar.set(part.slice(0, i), part.slice(i + 1));
  }
  return jar;
}

function collectCookies(res, jar) {
  const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of list) {
    const pair = c.split(';')[0];
    const i = pair.indexOf('=');
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}

const cookieHeader = (jar) => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

async function authFetch(method, body, jar) {
  const headers = { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT };
  if (jar.size > 0) headers.Cookie = cookieHeader(jar);
  const res = await fetch(AUTH_URL, { method, headers, body: JSON.stringify(body) });
  collectCookies(res, jar);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('method not allowed');
    return;
  }
  let b;
  try {
    b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  } catch {
    res.status(400).send('bad body');
    return;
  }
  const jar = jarFromString(b.cookie);

  try {
    let r;
    if (b.step === 'mfa') {
      r = await authFetch('PUT', { type: 'multifactor', code: String(b.code ?? ''), rememberDevice: false }, jar);
    } else {
      await authFetch(
        'POST',
        {
          client_id: 'play-valorant-web-prod',
          nonce: '1',
          redirect_uri: 'https://playvalorant.com/opt_in',
          response_type: 'token id_token',
          scope: 'account openid',
        },
        jar,
      );
      r = await authFetch(
        'PUT',
        { type: 'auth', username: String(b.username ?? ''), password: String(b.password ?? ''), remember: false, language: 'en_US' },
        jar,
      );
    }
    res.status(200).json({ status: r.status, data: r.data, cookie: cookieHeader(jar) });
  } catch {
    res.status(502).json({ error: 'upstream error' });
  }
}

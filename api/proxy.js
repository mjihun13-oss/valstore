// Vercel 서버리스 함수: 웹 버전에서 Riot 서버 호출을 대신 전달한다. (같은 사이트 안이라 CORS 문제가 없다)
// Riot 관련 주소만 허용하고, 필요한 헤더만 전달한다.
const ALLOWED_HOSTS = [
  /^auth\.riotgames\.com$/,
  /^entitlements\.auth\.riotgames\.com$/,
  /^pd\.(kr|ap|na|eu)\.a\.pvp\.net$/,
];
const FORWARD_HEADERS = [
  'authorization',
  'content-type',
  'x-riot-entitlements-jwt',
  'x-riot-clientplatform',
  'x-riot-clientversion',
];

export default async function handler(req, res) {
  let target;
  try {
    target = new URL(String(req.query.url ?? ''));
  } catch {
    res.status(400).send('bad url');
    return;
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.some((r) => r.test(target.hostname))) {
    res.status(403).send('host not allowed');
    return;
  }

  const headers = {};
  for (const name of FORWARD_HEADERS) {
    if (req.headers[name]) headers[name] = String(req.headers[name]);
  }

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  }

  try {
    const upstream = await fetch(target.toString(), { method: req.method, headers, body });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json');
    res.send(text);
  } catch {
    res.status(502).send('upstream error');
  }
}

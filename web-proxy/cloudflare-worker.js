// 웹 버전용 프록시. Riot 서버는 브라우저의 직접 호출(CORS)을 막기 때문에 이 Worker가 대신 전달한다.
// Riot 관련 주소만 허용하고, ALLOWED_ORIGIN 변수로 내 사이트에서 온 요청만 받도록 잠글 수 있다.
const ALLOWED_HOSTS = [
  /^auth\.riotgames\.com$/,
  /^entitlements\.auth\.riotgames\.com$/,
  /^pd\.(kr|ap|na|eu)\.a\.pvp\.net$/,
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      // Authorization 은 '*' 로는 허용되지 않아서, 브라우저가 요청한 헤더를 그대로 허용한다.
      'Access-Control-Allow-Headers':
        request.headers.get('Access-Control-Request-Headers') ||
        'authorization,content-type,x-riot-entitlements-jwt,x-riot-clientplatform,x-riot-clientversion',
      'Access-Control-Max-Age': '86400',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
      return new Response('forbidden', { status: 403, headers: cors });
    }

    let target;
    try {
      target = new URL(new URL(request.url).searchParams.get('url'));
    } catch {
      return new Response('bad url', { status: 400, headers: cors });
    }
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.some((r) => r.test(target.hostname))) {
      return new Response('host not allowed', { status: 403, headers: cors });
    }

    const headers = new Headers(request.headers);
    ['origin', 'referer', 'host'].forEach((h) => headers.delete(h));

    const res = await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    });
    const out = new Headers(res.headers);
    Object.entries(cors).forEach(([k, v]) => out.set(k, v));
    return new Response(res.body, { status: res.status, headers: out });
  },
};

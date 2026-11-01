import { connect } from 'cloudflare:sockets';
import { checkProxyRequest, connectErrorCode, ipReport, json, parseTcpTarget } from './lib.js';

const TCP_TIMEOUT_MS = 5000;

async function tcpCheck(url, request) {
  const target = parseTcpTarget(url.searchParams.get('host'), url.searchParams.get('port'));
  const colo = request.cf?.colo ?? null;
  if (target.error) return json({ ok: false, error: target.error }, 400);

  const started = Date.now();
  let socket;
  let timer;
  try {
    socket = connect({ hostname: target.host, port: target.port });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), TCP_TIMEOUT_MS);
    });
    await Promise.race([socket.opened, timeout]);
    // Date.now() only advances across I/O in Workers, which is exactly what we time here.
    const ms = Date.now() - started;
    return json({ ok: true, host: target.host, port: target.port, ms, colo, measuredFrom: 'cloudflare-edge' });
  } catch (err) {
    const error = connectErrorCode(err);
    return json({
      ok: false, host: target.host, port: target.port, colo, measuredFrom: 'cloudflare-edge',
      error, detail: error === 'timeout' ? null : String(err?.message || err).slice(0, 200),
    }, 502);
  } finally {
    clearTimeout(timer);
    // close() rejects if the socket never opened; nothing to clean up in that case.
    socket?.close().catch(() => {});
  }
}

// Fallback for visitors whose own anonymous Globalping quota is spent (#13): the
// same request, sent with the netcheck key from the GLOBALPING_TOKEN secret. The
// token never leaves the Worker. Without the secret this answers 503 and the page
// shows its normal "quota used up" message.
async function globalpingProxy(request, env, url) {
  if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);
  if (!env.GLOBALPING_TOKEN) return json({ error: 'no-token' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const check = checkProxyRequest(request.headers.get('origin'), url.origin, body);
  if (check.error) return json({ error: check.error }, check.error === 'forbidden-origin' ? 403 : 400);
  const res = await fetch('https://api.globalping.io/v1/measurements', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GLOBALPING_TOKEN}` },
    body: JSON.stringify(body),
  });
  // Pass Globalping's answer through, without its rate-limit headers: those describe
  // the shared key, not the visitor.
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/api/ip':
        return json(ipReport(request));
      case '/api/ip.txt':
        // For `curl https://netcheck.whosane.dev/api/ip.txt` in a terminal.
        return new Response((request.headers.get('cf-connecting-ip') || '') + '\n', {
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
        });
      case '/api/tcp':
        return tcpCheck(url, request);
      case '/api/gp/measurements':
        return globalpingProxy(request, env, url);
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'not-found' }, 404);
    return env.ASSETS.fetch(request);
  },
};

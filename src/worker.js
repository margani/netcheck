import { connect } from 'cloudflare:sockets';
import { connectErrorCode, ipReport, json, parseTcpTarget } from './lib.js';

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
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'not-found' }, 404);
    return env.ASSETS.fetch(request);
  },
};

// Pure helpers for the Worker. No `cloudflare:*` imports here, so `node --test`
// can load this file without the Workers runtime.

// Fields of request.cf that describe the visitor's connection. Anything else in
// request.cf (bot scores, TLS fingerprints, client cipher lists) is left out: the
// page shows people their own connection, not Cloudflare's internal signals.
const CF_FIELDS = [
  'country', 'city', 'region', 'regionCode', 'postalCode', 'continent',
  'timezone', 'latitude', 'longitude', 'asn', 'asOrganization', 'colo',
  'httpProtocol', 'tlsVersion',
];

export function ipVersion(ip) {
  if (!ip) return null;
  return ip.includes(':') ? 6 : 4;
}

export function ipReport(request) {
  const ip = request.headers.get('cf-connecting-ip');
  const cf = request.cf || {};
  const info = {};
  for (const key of CF_FIELDS) info[key] = cf[key] ?? null;
  const headers = {};
  for (const [name, value] of request.headers) headers[name] = value;
  return { ip, ipVersion: ipVersion(ip), ...info, headers };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2) + '\n', {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Every answer is about this one visitor: never let a cache hand it to someone else.
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

// The edge TCP check only connects to these ports. Without a list, /api/tcp would be
// a free port scanner running from Cloudflare's network; these are the services
// people actually ask "can I reach it" about.
export const TCP_PORTS = [22, 53, 80, 443, 853, 993, 995, 3389, 5222, 8080, 8443];

const HOSTNAME = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z][a-z0-9-]{0,62}$/i;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// Literal addresses that are not on the public internet. Workers cannot reach a
// private network anyway, but refusing them here gives a clear error instead of a
// confusing timeout, and keeps the endpoint from probing Cloudflare-internal space.
export function isPrivateAddress(host) {
  const m = IPV4.exec(host);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (m.slice(1).some((p) => Number(p) > 255)) return true;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19));
  }
  if (host.includes(':')) {
    const h = host.toLowerCase();
    return h === '::' || h === '::1' || h.startsWith('fc') || h.startsWith('fd') ||
      h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb') ||
      h.startsWith('ff') || h.startsWith('::ffff:');
  }
  return false;
}

// Returns { host, port } or { error } with a stable error code the page translates.
export function parseTcpTarget(rawHost, rawPort) {
  let host = String(rawHost || '').trim().toLowerCase();
  if (!host) return { error: 'missing-host' };
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || !TCP_PORTS.includes(port)) return { error: 'port-not-allowed' };
  const isV4 = IPV4.test(host);
  const isV6 = host.includes(':') && /^[0-9a-f:.]+$/.test(host);
  // Checked before the hostname rule: "localhost" has no dot and would otherwise
  // get the less helpful "bad-host".
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host.endsWith('.internal') || isPrivateAddress(host)) return { error: 'private-host' };
  if (!isV4 && !isV6 && !HOSTNAME.test(host)) return { error: 'bad-host' };
  return { host, port };
}

// Maps a connect() failure to a code the page translates. Workers cannot open TCP
// sockets to hosts behind Cloudflare's proxy; the runtime says "cannot connect to
// the specified address ... consider using fetch" (seen for example.com:443 on
// 2026-10-31, #3). Telling people that is more useful than "could not connect".
export function connectErrorCode(err) {
  const msg = String(err?.message || '');
  if (msg === 'timeout') return 'timeout';
  if (/cannot connect to the specified address|consider using fetch/i.test(msg)) return 'cloudflare-host';
  return 'connect-failed';
}

// Globalping API client for the browser (https://globalping.io, docs:
// https://globalping.io/docs/api.globalping.io). Checked 2026-10-31: anonymous
// clients get 250 measurements per hour per IP and at most 50 probes each; the API
// sends `access-control-allow-origin: *`, so the page calls it directly and the
// visitor's own quota is used, not ours.

export const API = 'https://api.globalping.io/v1';
export const TYPES = ['ping', 'traceroute', 'dns', 'http'];
// The record types Globalping's dns measurement accepts that people commonly need.
export const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA'];
export const MAX_PROBES = 10;

// People paste URLs into every box. Ping/traceroute/DNS need just the host;
// HTTP keeps the scheme, path and query.
export function parseTarget(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`;
  let u;
  try { u = new URL(withScheme); } catch { return null; }
  if (!u.hostname) return null;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  return {
    host,
    https: /^https:/i.test(text) || !/^[a-z][a-z0-9+.-]*:\/\//i.test(text),
    path: u.pathname || '/',
    query: u.search.replace(/^\?/, ''),
    port: u.port ? Number(u.port) : null,
  };
}

export function buildMeasurement({ type, target, location, limit, dnsType }) {
  if (!TYPES.includes(type)) throw new Error('bad-type');
  const t = parseTarget(target);
  if (!t) throw new Error('bad-target');
  const n = Math.min(MAX_PROBES, Math.max(1, Math.round(Number(limit) || 3)));
  const magic = String(location || '').trim() || 'world';
  // Only the global limit: the API rejects a per-location limit next to it
  // ("locations[0].limit is not allowed when a global limit is set", 2026-10-31).
  const body = { type, target: t.host, locations: [{ magic }], limit: n };
  if (type === 'ping') body.measurementOptions = { packets: 4 };
  if (type === 'dns') body.measurementOptions = { query: { type: DNS_TYPES.includes(dnsType) ? dnsType : 'A' } };
  if (type === 'http') {
    body.measurementOptions = {
      protocol: t.https ? 'HTTPS' : 'HTTP',
      request: { method: 'HEAD', path: t.path, ...(t.query ? { query: t.query } : {}) },
      ...(t.port ? { port: t.port } : {}),
    };
  }
  return body;
}

export function probeLabel(probe = {}) {
  const place = [probe.city, probe.country].filter(Boolean).join(', ');
  const net = probe.network ? `${probe.network}${probe.asn ? ` (AS${probe.asn})` : ''}` : (probe.asn ? `AS${probe.asn}` : '');
  return [place, net].filter(Boolean).join(' · ');
}

const round = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10) / 10 : null);

// One line of numbers per probe; the page adds translated labels.
export function summarize(type, result = {}) {
  if (result.status === 'in-progress') return { kind: 'pending' };
  if (result.status && result.status !== 'finished') return { kind: 'failed' };
  switch (type) {
    case 'ping': {
      const s = result.stats || {};
      if (s.avg == null) return { kind: 'failed' };
      return { kind: 'ping', min: round(s.min), avg: round(s.avg), max: round(s.max), loss: round(s.loss) };
    }
    case 'traceroute': {
      const hops = result.hops || [];
      const last = hops[hops.length - 1];
      const ms = (last?.timings || []).map((x) => x.rtt).filter((x) => typeof x === 'number');
      return { kind: 'traceroute', hops: hops.length, lastMs: ms.length ? round(Math.min(...ms)) : null };
    }
    case 'dns': {
      const answers = (result.answers || []).map((a) => a.value);
      return { kind: 'dns', answers, ms: round(result.timings?.total) };
    }
    case 'http':
      if (result.statusCode == null) return { kind: 'failed' };
      return { kind: 'http', status: result.statusCode, ms: round(result.timings?.total) };
  }
  return { kind: 'failed' };
}

// Polls a measurement until it is no longer in progress. The API asks clients to
// poll no faster than every 500 ms; 30 s covers a slow traceroute.
export async function runMeasurement(body, { onUpdate, signal, fetchImpl = fetch, intervalMs = 500, maxMs = 30000 } = {}) {
  const res = await fetchImpl(`${API}/measurements`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal,
  });
  const quota = {
    remaining: Number(res.headers.get('x-ratelimit-remaining')),
    reset: Number(res.headers.get('x-ratelimit-reset')),
  };
  if (!res.ok) {
    let msg = '';
    try {
      // "Parameter validation failed." alone says nothing; the reason is in params.
      const e = (await res.json())?.error || {};
      msg = [e.message, ...Object.values(e.params || {})].filter(Boolean).join(' ');
    } catch {}
    const err = new Error(res.status === 429 ? 'rate-limited' : (msg || `http-${res.status}`));
    err.quota = quota;
    throw err;
  }
  const { id } = await res.json();
  const started = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const r = await fetchImpl(`${API}/measurements/${encodeURIComponent(id)}`, { signal });
    const m = await r.json();
    onUpdate?.(m, quota);
    if (m.status !== 'in-progress') return { measurement: m, quota };
    if (Date.now() - started > maxMs) return { measurement: m, quota, timedOut: true };
  }
}

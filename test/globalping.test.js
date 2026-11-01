import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMeasurement, myCountryLocation, parseTarget, probeLabel, runMeasurement, summarize, MAX_PROBES, TYPES } from '../public/globalping.js';

test('parseTarget strips URLs down to what each check needs', () => {
  assert.equal(parseTarget('example.com').host, 'example.com');
  assert.equal(parseTarget(' https://Example.com/a/b?x=1 ').host, 'example.com');
  const u = parseTarget('http://example.com:8080/a?x=1');
  assert.deepEqual([u.https, u.path, u.query, u.port], [false, '/a', 'x=1', 8080]);
  assert.equal(parseTarget('example.com').https, true, 'no scheme means HTTPS');
  assert.equal(parseTarget('[2606:4700::1111]').host, '2606:4700::1111');
  assert.equal(parseTarget(''), null);
  assert.equal(parseTarget('http://'), null);
});

test('buildMeasurement makes valid Globalping bodies', () => {
  const ping = buildMeasurement({ type: 'ping', target: 'https://example.com/x', location: 'Germany', limit: '5' });
  assert.deepEqual(ping, {
    type: 'ping', target: 'example.com', locations: [{ magic: 'Germany' }], limit: 5,
    measurementOptions: { packets: 4 },
  });
  const dns = buildMeasurement({ type: 'dns', target: 'example.com', location: '', limit: 3, dnsType: 'MX' });
  assert.equal(dns.locations[0].magic, 'world');
  assert.deepEqual(dns.measurementOptions, { query: { type: 'MX' } });
  assert.equal(buildMeasurement({ type: 'dns', target: 'a.com', dnsType: 'BOGUS' }).measurementOptions.query.type, 'A');
  const http = buildMeasurement({ type: 'http', target: 'http://example.com:8080/p?q=1', limit: 1 });
  assert.deepEqual(http.measurementOptions, { protocol: 'HTTP', request: { method: 'HEAD', path: '/p', query: 'q=1' }, port: 8080 });
  assert.equal(buildMeasurement({ type: 'traceroute', target: 'a.com', limit: 999 }).limit, MAX_PROBES);
  assert.equal(buildMeasurement({ type: 'traceroute', target: 'a.com', limit: 0 }).limit, 3);
  assert.throws(() => buildMeasurement({ type: 'bogus', target: 'a.com' }), /bad-type/);
  assert.throws(() => buildMeasurement({ type: 'ping', target: '  ' }), /bad-target/);
});

test('probeLabel', () => {
  assert.equal(probeLabel({ city: 'Frankfurt', country: 'DE', network: 'Hetzner', asn: 24940 }), 'Frankfurt, DE · Hetzner (AS24940)');
  assert.equal(probeLabel({ country: 'IR', asn: 197207 }), 'IR · AS197207');
  assert.equal(probeLabel(), '');
});

test('summarize each result type', () => {
  assert.deepEqual(summarize('ping', { status: 'finished', stats: { min: 1.234, avg: 2.26, max: 3, loss: 0 } }),
    { kind: 'ping', min: 1.2, avg: 2.3, max: 3, loss: 0 });
  assert.deepEqual(summarize('ping', { status: 'finished', stats: { avg: null } }), { kind: 'failed' });
  assert.deepEqual(summarize('ping', { status: 'in-progress' }), { kind: 'pending' });
  assert.deepEqual(summarize('ping', { status: 'failed' }), { kind: 'failed' });
  assert.deepEqual(summarize('traceroute', { status: 'finished', hops: [{ timings: [] }, { timings: [{ rtt: 9.87 }, { rtt: 8.1 }] }] }),
    { kind: 'traceroute', hops: 2, lastMs: 8.1 });
  assert.deepEqual(summarize('dns', { status: 'finished', answers: [{ value: '1.2.3.4' }], timings: { total: 12 } }),
    { kind: 'dns', answers: ['1.2.3.4'], ms: 12 });
  assert.deepEqual(summarize('http', { status: 'finished', statusCode: 301, timings: { total: 99.94 } }),
    { kind: 'http', status: 301, ms: 99.9 });
});

function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, opts) => {
    calls.push({ url, opts });
    const next = responses.shift();
    return {
      ok: next.status < 400, status: next.status,
      headers: new Headers(next.headers || {}),
      json: async () => next.body,
    };
  };
  return { impl, calls };
}

test('runMeasurement posts, then polls until finished', async () => {
  const { impl, calls } = fakeFetch([
    { status: 202, body: { id: 'abc' }, headers: { 'x-ratelimit-remaining': '249', 'x-ratelimit-reset': '3600' } },
    { status: 200, body: { status: 'in-progress', results: [] } },
    { status: 200, body: { status: 'finished', results: [{ probe: {}, result: { status: 'finished' } }] } },
  ]);
  const updates = [];
  const out = await runMeasurement({ type: 'ping' }, { fetchImpl: impl, intervalMs: 1, onUpdate: (m) => updates.push(m.status) });
  assert.equal(out.measurement.status, 'finished');
  assert.equal(out.quota.remaining, 249);
  assert.deepEqual(updates, ['in-progress', 'finished']);
  assert.equal(calls[0].opts.method, 'POST');
  assert.match(calls[1].url, /\/measurements\/abc$/);
});

test('runMeasurement reports rate limiting and API errors', async () => {
  await assert.rejects(runMeasurement({}, { fetchImpl: fakeFetch([{ status: 429, body: {} }]).impl }), /rate-limited/);
  await assert.rejects(
    runMeasurement({}, { fetchImpl: fakeFetch([{ status: 422, body: { error: { message: 'No suitable probes supporting IPv6 found.' } } }]).impl }),
    /No suitable probes/);
});

test('MTR measurements and summaries (#11)', () => {
  assert.ok(TYPES.includes('mtr'));
  const body = buildMeasurement({ type: 'mtr', target: 'https://github.com/', limit: 2 });
  assert.deepEqual(body, { type: 'mtr', target: 'github.com', locations: [{ magic: 'world' }], limit: 2, measurementOptions: { packets: 3 } });
  // Shape from a real Globalping MTR result, 2026-11-01.
  const result = { status: 'finished', hops: [
    { stats: { avg: 1.2, loss: 0 } },
    { stats: { min: 11.262, max: 12.05, avg: 11.7, total: 3, loss: 33.3 } },
  ] };
  assert.deepEqual(summarize('mtr', result), { kind: 'mtr', hops: 2, lastAvg: 11.7, lastLoss: 33.3 });
  assert.deepEqual(summarize('mtr', { status: 'finished', hops: [] }), { kind: 'failed' });
});

test('myCountryLocation turns /api/ip data into a Globalping location (#12)', () => {
  assert.equal(myCountryLocation({ country: 'IR' }), 'IR');
  assert.equal(myCountryLocation({ country: 'gb' }), 'GB');
  // Cloudflare uses XX for unknown and T1 for Tor: no probes can match those.
  assert.equal(myCountryLocation({ country: 'XX' }), null);
  assert.equal(myCountryLocation({ country: 'T1' }), null);
  assert.equal(myCountryLocation({}), null);
  assert.equal(myCountryLocation(null), null);
});

test('runMeasurement falls back to the keyed proxy only on 429 (#13)', async () => {
  const { impl, calls } = fakeFetch([
    { status: 429, body: {}, headers: { 'x-ratelimit-remaining': '0' } },
    { status: 202, body: { id: 'k1' } },
    { status: 200, body: { status: 'finished', results: [] } },
  ]);
  const out = await runMeasurement({ type: 'ping' }, { fetchImpl: impl, intervalMs: 1, fallbackUrl: '/api/gp/measurements' });
  assert.equal(out.viaKey, true);
  assert.equal(calls[1].url, '/api/gp/measurements');
  assert.equal(calls[1].opts.method, 'POST');
  assert.match(calls[2].url, /api\.globalping\.io\/v1\/measurements\/k1$/, 'polling stays on the public API');
});

test('runMeasurement without a configured key still reports rate limiting (#13)', async () => {
  const { impl } = fakeFetch([{ status: 429, body: {} }, { status: 503, body: { error: 'no-token' } }]);
  await assert.rejects(runMeasurement({}, { fetchImpl: impl, fallbackUrl: '/api/gp/measurements' }), /rate-limited/);
});

test('runMeasurement does not use the key for other errors (#13)', async () => {
  const { impl, calls } = fakeFetch([{ status: 422, body: { error: { message: 'No suitable probes' } } }]);
  await assert.rejects(runMeasurement({}, { fetchImpl: impl, fallbackUrl: '/api/gp/measurements' }), /No suitable probes/);
  assert.equal(calls.length, 1);
});

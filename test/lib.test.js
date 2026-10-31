import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ipReport, ipVersion, isPrivateAddress, parseTcpTarget, TCP_PORTS } from '../src/lib.js';

test('ipReport reads the visitor IP, cf fields and headers', async () => {
  const request = {
    headers: new Headers({ 'cf-connecting-ip': '203.0.113.7', 'user-agent': 'test' }),
    cf: { country: 'GB', city: 'London', asn: 2856, asOrganization: 'BT', colo: 'LHR', botManagement: { score: 1 } },
  };
  const r = ipReport(request);
  assert.equal(r.ip, '203.0.113.7');
  assert.equal(r.ipVersion, 4);
  assert.equal(r.country, 'GB');
  assert.equal(r.asn, 2856);
  assert.equal(r.colo, 'LHR');
  assert.equal(r.region, null, 'missing cf fields are null, not absent');
  assert.equal(r.botManagement, undefined, 'internal cf signals are not exposed');
  assert.equal(r.headers['user-agent'], 'test');
});

test('ipReport works without request.cf (local dev)', () => {
  const r = ipReport({ headers: new Headers() });
  assert.equal(r.ip, null);
  assert.equal(r.ipVersion, null);
  assert.deepEqual(r.headers, {});
});

test('ipVersion tells v4 from v6', () => {
  assert.equal(ipVersion('1.1.1.1'), 4);
  assert.equal(ipVersion('2606:4700::1111'), 6);
});

test('isPrivateAddress catches non-public literals', () => {
  const priv = ['10.0.0.1', '127.0.0.1', '172.16.5.5', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1', '999.1.1.1', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1'];
  assert.ok(priv.length > 0);
  for (const h of priv) assert.equal(isPrivateAddress(h), true, h);
  for (const h of ['1.1.1.1', '8.8.8.8', '172.32.0.1', '100.128.0.1', '2606:4700::1111', 'example.com']) {
    assert.equal(isPrivateAddress(h), false, h);
  }
});

test('parseTcpTarget accepts public hosts on allowed ports', () => {
  assert.deepEqual(parseTcpTarget('Example.COM', '443'), { host: 'example.com', port: 443 });
  assert.deepEqual(parseTcpTarget('1.1.1.1', 53), { host: '1.1.1.1', port: 53 });
  assert.deepEqual(parseTcpTarget('[2606:4700::1111]', 443), { host: '2606:4700::1111', port: 443 });
});

test('parseTcpTarget refuses what would make it a scanner or an internal probe', () => {
  assert.equal(parseTcpTarget('', 443).error, 'missing-host');
  assert.equal(parseTcpTarget('example.com', 25).error, 'port-not-allowed');
  assert.equal(parseTcpTarget('example.com', 'abc').error, 'port-not-allowed');
  assert.ok(!TCP_PORTS.includes(25));
  assert.equal(parseTcpTarget('localhost', 80).error, 'private-host');
  assert.equal(parseTcpTarget('db.internal', 443).error, 'private-host');
  assert.equal(parseTcpTarget('192.168.0.1', 80).error, 'private-host');
  assert.equal(parseTcpTarget('exa mple.com', 80).error, 'bad-host');
  assert.equal(parseTcpTarget('http://example.com', 80).error, 'bad-host');
  assert.equal(parseTcpTarget('nodot', 80).error, 'bad-host');
});

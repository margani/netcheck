import { DNS_TYPES, buildMeasurement, myCountryLocation, probeLabel, runMeasurement, summarize } from './globalping.js';

const TCP_PORTS = [443, 80, 22, 53, 853, 993, 995, 3389, 5222, 8080, 8443];

// Every Persian string starts with a Persian letter so the bidi algorithm picks RTL.
const STRINGS = {
  fa: {
    title: 'نت‌چک',
    tagline: 'آی‌پی شما، و پینگ، تریس‌روت، DNS و HTTP از نقاط مختلف دنیا',
    myIp: 'آی‌پی من', copy: 'کپی', copied: 'کپی شد',
    headers: 'هدرهای درخواست شما',
    ipNote: 'این‌ها را کلودفلر از روی همین اتصال می‌بیند. چیزی ذخیره نمی‌شود.',
    asJson: 'همین به صورت JSON', asText: 'فقط آی‌پی، برای curl',
    ipFailed: 'دریافت آی‌پی ناموفق بود.',
    country: 'کشور', city: 'شهر', region: 'استان یا منطقه', asn: 'شمارهٔ شبکه (ASN)',
    asOrganization: 'اپراتور', colo: 'دیتاسنتر کلودفلر', timezone: 'منطقهٔ زمانی',
    httpProtocol: 'پروتکل HTTP', tlsVersion: 'نسخهٔ TLS', ipVersion: 'نسخهٔ آی‌پی',
    checks: 'آزمون از نقاط مختلف دنیا',
    checksNote: 'این آزمون‌ها روی دستگاه‌های داوطلب Globalping در کشورهای مختلف اجرا می‌شوند، نه روی دستگاه شما.',
    type: 'نوع آزمون', ping: 'پینگ', traceroute: 'تریس‌روت',
    target: 'مقصد (دامنه یا آی‌پی)', from: 'از کجا', probes: 'تعداد نقطه', dnsType: 'نوع رکورد',
    fromHint: 'مکان را به انگلیسی بنویسید: کشور، شهر، قاره یا شمارهٔ شبکه، مثل Germany یا Asia یا AS13335.',
    run: 'اجرا', running: 'در حال اجرا…', done: 'تمام شد.',
    myCountry: 'از کشور خودم',
    viaKey: 'سهمیهٔ رایگان شما تمام شده بود، پس این آزمون با کلید مشترک نت‌چک اجرا شد.',
    mtrLast: 'گام آخر: میانگین {ms} میلی‌ثانیه، از دست رفته {loss} درصد',
    quota: 'سهمیهٔ باقی‌ماندهٔ این ساعت در Globalping: {n}',
    badTarget: 'مقصد معتبر نیست.',
    rateLimited: 'سهمیهٔ رایگان Globalping برای این ساعت تمام شده. کمی بعد دوباره امتحان کنید.',
    noProbes: 'هیچ دستگاهی در این مکان پیدا نشد. مکان دیگری امتحان کنید.',
    apiError: 'خطا از Globalping: {msg}',
    netError: 'اتصال به Globalping برقرار نشد.',
    timedOut: 'بعضی نتیجه‌ها به موقع نرسیدند.',
    min: 'کمینه', avg: 'میانگین', max: 'بیشینه', loss: 'از دست رفته',
    hops: 'تعداد گام: {n}', lastHop: 'گام آخر: {ms} میلی‌ثانیه',
    noAnswers: 'پاسخی نیامد', status: 'کد وضعیت', time: 'زمان',
    failed: 'ناموفق', pending: 'در انتظار…', raw: 'خروجی کامل',
    edge: 'اتصال TCP از لبهٔ کلودفلر',
    edgeNote: 'این زمان از دیتاسنتر کلودفلرِ نزدیک شما اندازه گرفته می‌شود، نه از دستگاه شما. فقط پورت‌های رایج مجازند.',
    host: 'میزبان', port: 'پورت', connect: 'آزمون اتصال', connecting: 'در حال اتصال…',
    edgeOk: 'وصل شد در {ms} میلی‌ثانیه، از دیتاسنتر {colo}',
    'edge-timeout': 'پس از ۵ ثانیه پاسخی نیامد.',
    'edge-connect-failed': 'اتصال برقرار نشد.',
    'edge-cloudflare-host': 'این میزبان پشت کلودفلر است و کلودفلر اجازهٔ اتصال TCP از داخل خودش به آن را نمی‌دهد. میزبان دیگری امتحان کنید یا از آزمون HTTP بالا استفاده کنید.',
    'edge-port-not-allowed': 'این پورت مجاز نیست.',
    'edge-bad-host': 'نام میزبان معتبر نیست.',
    'edge-private-host': 'آدرس‌های شبکهٔ خصوصی پشتیبانی نمی‌شوند.',
    'edge-missing-host': 'میزبان را وارد کنید.',
    'edge-error': 'خطا در آزمون اتصال.',
    ms: 'میلی‌ثانیه', pct: '{n} درصد',
    noTracking: 'بدون تبلیغ، بدون ردیابی، بدون آنالیتیکس.',
    credit: 'آزمون‌های جهانی با', source: 'کد منبع (MIT)',
  },
  en: {
    title: 'netcheck',
    tagline: 'Your IP, plus ping, traceroute, DNS and HTTP from around the world',
    myIp: 'My IP', copy: 'Copy', copied: 'Copied',
    headers: 'Your request headers',
    ipNote: 'This is what Cloudflare sees of this connection. Nothing is stored.',
    asJson: 'Same as JSON', asText: 'Just the IP (for curl)',
    ipFailed: 'Could not load your IP.',
    country: 'Country', city: 'City', region: 'Region', asn: 'Network (ASN)',
    asOrganization: 'Provider', colo: 'Cloudflare data centre', timezone: 'Time zone',
    httpProtocol: 'HTTP protocol', tlsVersion: 'TLS version', ipVersion: 'IP version',
    checks: 'Checks from around the world',
    checksNote: 'These run on Globalping volunteer probes in many countries, not on your device.',
    type: 'Check type', ping: 'Ping', traceroute: 'Traceroute',
    target: 'Target (domain or IP)', from: 'From', probes: 'Probes', dnsType: 'Record type',
    fromHint: 'A country, city, continent or network, e.g. Germany, Asia or AS13335.',
    run: 'Run', running: 'Running…', done: 'Done.',
    myCountry: 'From my country',
    viaKey: 'Your free quota was used up, so this check ran on netcheck\u2019s shared key.',
    mtrLast: 'last hop avg {ms} ms, loss {loss}%',
    quota: 'Globalping checks left this hour: {n}',
    badTarget: 'That target is not valid.',
    rateLimited: 'The free Globalping quota for this hour is used up. Try again a bit later.',
    noProbes: 'No probes found in that location. Try another one.',
    apiError: 'Globalping error: {msg}',
    netError: 'Could not reach Globalping.',
    timedOut: 'Some results did not arrive in time.',
    min: 'min', avg: 'avg', max: 'max', loss: 'loss',
    hops: '{n} hops', lastHop: 'last hop {ms} ms',
    noAnswers: 'no answers', status: 'status', time: 'time',
    failed: 'Failed', pending: 'Waiting…', raw: 'Full output',
    edge: 'TCP connect from Cloudflare’s edge',
    edgeNote: 'Timed from the Cloudflare data centre nearest to you, not from your device. Common ports only.',
    host: 'Host', port: 'Port', connect: 'Test connection', connecting: 'Connecting…',
    edgeOk: 'Connected in {ms} ms from Cloudflare {colo}',
    'edge-timeout': 'No answer within 5 seconds.',
    'edge-connect-failed': 'Could not connect.',
    'edge-cloudflare-host': 'This host is behind Cloudflare, and Cloudflare does not allow TCP connections from its own edge to it. Try another host, or use the HTTP check above.',
    'edge-port-not-allowed': 'That port is not allowed.',
    'edge-bad-host': 'That host name is not valid.',
    'edge-private-host': 'Private network addresses are not supported.',
    'edge-missing-host': 'Enter a host.',
    'edge-error': 'The connection test failed.',
    ms: 'ms', pct: '{n}%',
    noTracking: 'No ads, no tracking, no analytics.',
    credit: 'Global checks by', source: 'Source code (MIT)',
  },
};

const $ = (id) => document.getElementById(id);
let lang = 'fa';
let ipData = null;
let lastRun = null; // { type, measurement } so a language switch can re-render results

function t(key, vars = {}) {
  const s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function readStoredLang() {
  try { return localStorage.getItem('netcheck:lang'); } catch { return null; }
}

function pickLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'fa' || q === 'en') return q;
  const stored = readStoredLang();
  if (stored === 'fa' || stored === 'en') return stored;
  return (navigator.languages || [navigator.language]).some((l) => /^fa/i.test(l || '')) ? 'fa' : 'en';
}

function applyLang(next) {
  lang = next;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  const toggle = $('lang-toggle');
  toggle.textContent = lang === 'fa' ? 'English' : 'فارسی';
  toggle.lang = lang === 'fa' ? 'en' : 'fa';
  renderFacts();
  if (lastRun) renderResults(lastRun.type, lastRun.measurement);
}

// ---- My IP ----

const FACTS = ['country', 'city', 'region', 'asn', 'asOrganization', 'colo', 'timezone', 'ipVersion', 'httpProtocol', 'tlsVersion'];

function countryName(code) {
  if (!code) return null;
  try { return `${new Intl.DisplayNames([lang], { type: 'region' }).of(code)} (${code})`; } catch { return code; }
}

function renderFacts() {
  const dl = $('facts');
  dl.replaceChildren();
  if (!ipData) return;
  for (const key of FACTS) {
    let value = ipData[key];
    if (value == null || value === '') continue;
    if (key === 'country') value = countryName(value);
    if (key === 'asn') value = `AS${value}`;
    if (key === 'ipVersion') value = `IPv${value}`;
    const div = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = t(key);
    dd.textContent = value;
    // Names of places and networks come back in Latin script; isolate them so they
    // keep their own direction inside a Persian line.
    dd.dir = 'auto';
    div.append(dt, dd);
    dl.append(div);
  }
}

async function loadIp() {
  try {
    const res = await fetch('/api/ip', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    ipData = await res.json();
    $('ip').textContent = ipData.ip || '?';
    const body = $('headers');
    body.replaceChildren();
    for (const [name, value] of Object.entries(ipData.headers || {}).sort()) {
      const tr = document.createElement('tr');
      const a = document.createElement('td');
      const b = document.createElement('td');
      a.textContent = name;
      b.textContent = value;
      tr.append(a, b);
      body.append(tr);
    }
    renderFacts();
    const code = myCountryLocation(ipData);
    const btn = $('my-country');
    btn.hidden = !code;
    btn.title = code || '';
  } catch {
    $('ip').textContent = t('ipFailed');
  }
}

$('copy-ip').addEventListener('click', async () => {
  if (!ipData?.ip) return;
  try {
    await navigator.clipboard.writeText(ipData.ip);
    const btn = $('copy-ip');
    btn.textContent = t('copied');
    setTimeout(() => { btn.textContent = t('copy'); }, 1500);
  } catch {}
});

// ---- Globalping checks ----

$('my-country').addEventListener('click', () => {
  const code = myCountryLocation(ipData);
  if (code) $('location').value = code;
});

const dnsSelect = $('dns-type');
for (const type of DNS_TYPES) dnsSelect.append(new Option(type, type));

function currentType() {
  return document.querySelector('input[name="type"]:checked').value;
}

function syncTypeFields() {
  const dns = currentType() === 'dns';
  $('dns-field').hidden = !dns;
  $('fields').classList.toggle('with-dns', dns);
}
for (const input of document.querySelectorAll('input[name="type"]')) input.addEventListener('change', syncTypeFields);

function summaryText(type, s) {
  switch (s.kind) {
    case 'pending': return t('pending');
    case 'failed': return t('failed');
    case 'ping': return `${t('avg')} ${s.avg} ${t('ms')} · ${t('min')} ${s.min} · ${t('max')} ${s.max} · ${t('loss')} ${t('pct', { n: s.loss })}`;
    case 'traceroute': return [t('hops', { n: s.hops }), s.lastMs != null ? t('lastHop', { ms: s.lastMs }) : null].filter(Boolean).join(' · ');
    case 'mtr': return [t('hops', { n: s.hops }), t('mtrLast', { ms: s.lastAvg, loss: s.lastLoss })].join(' · ');
    case 'dns': return [s.answers.length ? s.answers.join(', ') : t('noAnswers'), s.ms != null ? `${t('time')} ${s.ms} ${t('ms')}` : null].filter(Boolean).join(' · ');
    case 'http': return `${t('status')} ${s.status}${s.ms != null ? ` · ${t('time')} ${s.ms} ${t('ms')}` : ''}`;
  }
  return '';
}

function renderResults(type, measurement) {
  const list = $('results');
  const open = new Set([...list.querySelectorAll('details[open]')].map((d) => d.dataset.idx));
  list.replaceChildren();
  (measurement.results || []).forEach((r, i) => {
    const li = document.createElement('li');
    const probe = document.createElement('div');
    probe.className = 'probe';
    probe.dir = 'auto';
    probe.textContent = probeLabel(r.probe);
    const s = summarize(type, r.result);
    const sum = document.createElement('div');
    sum.className = `summary${s.kind === 'failed' ? ' failed' : ''}`;
    sum.textContent = summaryText(type, s);
    li.append(probe, sum);
    if (r.result?.rawOutput) {
      const det = document.createElement('details');
      det.dataset.idx = String(i);
      det.open = open.has(String(i));
      const summary = document.createElement('summary');
      summary.textContent = t('raw');
      const pre = document.createElement('pre');
      pre.textContent = r.result.rawOutput;
      det.append(summary, pre);
      li.append(det);
    }
    list.append(li);
  });
}

function setStatus(text, error = false) {
  const el = $('check-status');
  el.textContent = text;
  el.classList.toggle('error', error);
}

let controller = null;

$('check-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = currentType();
  let body;
  try {
    body = buildMeasurement({
      type, target: $('target').value, location: $('location').value, limit: $('limit').value, dnsType: dnsSelect.value,
    });
  } catch {
    setStatus(t('badTarget'), true);
    return;
  }
  controller?.abort();
  controller = new AbortController();
  const run = $('run');
  run.disabled = true;
  run.textContent = t('running');
  setStatus('');
  $('results').replaceChildren();
  lastRun = null;
  try {
    const { measurement, quota, timedOut, viaKey } = await runMeasurement(body, {
      signal: controller.signal,
      fallbackUrl: '/api/gp/measurements',
      onUpdate: (m) => { lastRun = { type, measurement: m }; renderResults(type, m); },
    });
    lastRun = { type, measurement };
    renderResults(type, measurement);
    const parts = [timedOut ? t('timedOut') : t('done')];
    if (viaKey) parts.push(t('viaKey'));
    else if (Number.isFinite(quota.remaining)) parts.push(t('quota', { n: quota.remaining }));
    setStatus(parts.join(' '));
  } catch (err) {
    if (err.name === 'AbortError') return;
    if (err.message === 'rate-limited') setStatus(t('rateLimited'), true);
    else if (/probe/i.test(err.message)) setStatus(t('noProbes'), true);
    else if (err instanceof TypeError) setStatus(t('netError'), true);
    else setStatus(t('apiError', { msg: err.message }), true);
  } finally {
    run.disabled = false;
    run.textContent = t('run');
  }
});

// ---- Edge TCP connect ----

const portSelect = $('edge-port');
for (const p of TCP_PORTS) portSelect.append(new Option(String(p), String(p)));

$('edge-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const out = $('edge-result');
  const btn = $('edge-run');
  const host = $('edge-host').value.trim().replace(/^[a-z]+:\/\//i, '').replace(/[/?#].*$/, '');
  btn.disabled = true;
  btn.textContent = t('connecting');
  out.className = 'edge-result';
  out.textContent = '';
  try {
    const res = await fetch(`/api/tcp?host=${encodeURIComponent(host)}&port=${portSelect.value}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.ok) {
      out.classList.add('ok');
      out.textContent = t('edgeOk', { ms: data.ms, colo: data.colo || '?' });
    } else {
      out.classList.add('bad');
      out.textContent = STRINGS[lang][`edge-${data.error}`] ? t(`edge-${data.error}`) : t('edge-error');
    }
  } catch {
    out.classList.add('bad');
    out.textContent = t('edge-error');
  } finally {
    btn.disabled = false;
    btn.textContent = t('connect');
  }
});

$('lang-toggle').addEventListener('click', () => {
  const next = lang === 'fa' ? 'en' : 'fa';
  try { localStorage.setItem('netcheck:lang', next); } catch {}
  applyLang(next);
});

syncTypeFields();
applyLang(pickLang());
loadIp();

# netcheck

Your IP, plus ping, traceroute, DNS and HTTP checks from around the world, in Persian and English.
No ads, no tracking, no analytics.

- **My IP**: a small Cloudflare Worker returns the address Cloudflare sees (`CF-Connecting-IP`),
  your country, city, network (ASN), the Cloudflare data centre that served you, and your request
  headers. As a page, as JSON at [`/api/ip`](https://netcheck-sandbox.whosane.workers.dev/api/ip),
  or as plain text for a terminal:

  ```sh
  curl https://netcheck-sandbox.whosane.workers.dev/api/ip.txt
  ```

- **Ping, traceroute, DNS, HTTP**: a Worker cannot send ICMP, so these run on the free
  [Globalping](https://globalping.io) network of volunteer probes. Your browser calls the
  Globalping API directly, so the checks count against your own anonymous quota
  (250 tests per hour per IP, at most 50 probes per test, as of 2026-10-31; the page asks for
  at most 10).
- **TCP connect from Cloudflare's edge**: `/api/tcp?host=example.com&port=443` times a TCP
  connection with the Workers `connect()` API. It is measured from the Cloudflare data centre
  nearest to you, **not from your device**, and only to common ports (22, 53, 80, 443, 853, 993,
  995, 3389, 5222, 8080, 8443) and public addresses, so it cannot be used as a port scanner.

Sandbox: https://netcheck-sandbox.whosane.workers.dev

## Run it locally

Needs Node.js 20 or newer. No dependencies to install.

```sh
npm test          # unit tests (node --test)
npm run dev       # wrangler dev on http://localhost:8787
```

## Layout

| Path | What |
|---|---|
| `src/worker.js` | The Worker: `/api/ip`, `/api/ip.txt`, `/api/tcp`; everything else is a static file |
| `src/lib.js` | Pure helpers (IP report, TCP target checks), tested in Node |
| `public/` | The page: `index.html`, `app.js` (UI and strings), `globalping.js` (API client) |
| `test/` | Unit tests |
| `scripts/deploy.sh` | Deploy command for Cloudflare Workers Builds |

## Credits

Global measurements by [Globalping](https://globalping.io) (jsDelivr). Font:
[Vazirmatn](https://github.com/rastikerdar/vazirmatn).

## Licence

[MIT](LICENSE)

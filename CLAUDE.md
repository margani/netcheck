# netcheck

Public, MIT-licensed network check tool (github.com/margani/netcheck): my IP from a
Cloudflare Worker, ping/traceroute/DNS/HTTP through the Globalping API from the browser,
and a TCP-connect timing from Cloudflare's edge.

## Rules

- No ads, no tracking, no analytics, no third-party scripts. The only external calls are
  Google Fonts (Vazirmatn) and `api.globalping.io` from the browser. `localStorage` holds
  only the language (`netcheck:lang`), every access in try/catch.
- Bilingual, Persian and English, same conventions as `margani/tools`: every UI string in
  both languages in `STRINGS` (`public/app.js`), `data-i18n` keys in the markup, static
  markup in Persian, `?lang=` → localStorage → browser language. Logical CSS properties only.
- Every Persian string starts with a Persian letter. In Persian never put a Latin unit or
  symbol after a number ("12 ms", "0%", "(curl)"): the bidi algorithm shows "ms 12", "%0" and
  mirrored parentheses. Use words (`میلی‌ثانیه`, `درصد`) via the `ms`/`pct` strings
  (found in the visual check, 2026-10-31).
- Light and dark through `prefers-color-scheme` and the tokens on `:root`. Must work at
  390px with no horizontal scroll.
- `.field` sets `display:flex`, which beats the `hidden` attribute; the global
  `[hidden] { display:none !important }` rule exists for that (2026-10-31).
- `/api/tcp` only connects to the ports in `TCP_PORTS` and refuses private/reserved
  addresses. Never widen it to arbitrary ports: it would become a port scanner on
  Cloudflare's network.
- Workers `connect()` cannot reach hosts behind Cloudflare's proxy (example.com is one):
  "cannot connect to the specified address ... consider using fetch". Local `wrangler dev`
  connects from the laptop and hides this; check `/api/tcp` on the deployed sandbox with a
  Cloudflare host and a non-Cloudflare one (github.com, 8.8.8.8) (#3, 2026-10-31).
- Globalping: the request takes one global `limit`; a per-location `limit` next to it is
  rejected with "Parameter validation failed" (2026-10-31). Show the API's `params` in errors.
  Anonymous quota is 250 tests per hour per IP; each probe counts as one test.
- Screenshots: local `wrangler dev` fills `request.cf` with the real location of the machine.
  Mock `/api/ip` with demo data (203.0.113.7) before taking any screenshot that is posted.

## Tests and checks

- `npm test` (node --test, no dependencies); CI runs it on every PR (`.github/workflows/test.yml`).
- Visual check: `npm run dev`, then Playwright at 1280 and 390 px, light and dark, `?lang=fa`
  and `?lang=en`, asserting no horizontal overflow and that a Globalping ping returns results.

## Hosting

- Cloudflare **Hossein** account (`cbaf7c8b254ee4af435b9d6e32d2c6f1`).
- Sandbox: Worker `netcheck-sandbox` (`wrangler deploy --env sandbox`) on
  https://netcheck-sandbox.whosane.workers.dev, deployed by a Workers Builds trigger on `main`
  running `bash scripts/deploy.sh sandbox`.
- Production: Worker `netcheck` on custom domain `netcheck.whosane.dev` (zone whosane.dev, same
  account). Its Workers Builds trigger runs `bash scripts/deploy.sh`. Launching it needs the
  owner's explicit approval.
- Verify a deploy with `/version.json`, which must name the merged commit. Never deploy by hand.

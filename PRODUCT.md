# Product

<!-- impeccable:product-schema 1 -->

> Written by `/impeccable init` on 2026-10-31 without an interview: the owner was asleep
> and asked (through the hub session) not to be asked questions tonight. Every fact
> below comes from the project brief and the repository and is marked
> **(inferred, owner to confirm)**. Remove a marker once the owner confirms that line.

## Platform

web (inferred, owner to confirm: a responsive web page; no native app is planned in the brief)

## Users

- People who want to know how their own connection looks from outside: their public IP,
  the country and network it is attributed to, and the request headers they send.
  (inferred, owner to confirm)
- Persian-speaking users are a primary audience alongside English-speaking ones, including
  people checking whether a site or service is reachable from outside their own network
  (for example from other countries). The page defaults to Persian for `fa*` browsers.
  (inferred, owner to confirm)
- Developers and admins who need a quick ping, traceroute, DNS or HTTP check from several
  places in the world, often from a phone (the brief requires 390px). (inferred, owner to confirm)

## Product Purpose

A small, honest network check tool: "my IP" plus ping, traceroute, DNS, HTTP and an edge
TCP-connect timing, with no ads, no tracking and no analytics. Success is a correct answer
in seconds, readable in Persian or English, on any screen. (inferred, owner to confirm)

## Positioning

- Free of ads, tracking and analytics, open source (MIT). The 2023 idea for this tool
  (margani/net-tools) planned ads; this product deliberately drops them.
  (inferred, owner to confirm)
- Bilingual Persian/English with correct right-to-left layout, which most network tools lack.
  (inferred, owner to confirm)
- Honest about where each number is measured: world checks come from Globalping's probes,
  the TCP timing from Cloudflare's edge, never presented as measured from the user's device.
  (inferred from the brief, owner to confirm)

## Operating Context

- Used ad hoc, often when something is broken or slow, sometimes from a terminal
  (`curl …/api/ip.txt`). (inferred, owner to confirm)
- Part of the owner's family of small whosane.dev tools (e.g. tools.whosane.dev), sharing
  their conventions: Vazirmatn, light/dark tokens, Persian/English switch.
  (inferred from the repo and margani/tools, owner to confirm)

## Capabilities and Constraints

- My IP from a Cloudflare Worker: `CF-Connecting-IP`, `request.cf` fields (country, city,
  ASN, provider, colo, time zone, HTTP/TLS version) and request headers, as a page, JSON
  (`/api/ip`) and plain text (`/api/ip.txt`). (built)
- Ping, traceroute, DNS, HTTP through the Globalping API, called from the browser on the
  visitor's own anonymous quota (250 tests/hour/IP, ≤50 probes per test as of 2026-10-31;
  the page asks for at most 10). Globalping must be credited on the page. (built; from the brief)
- TCP-connect timing via Workers `connect()`, only to an allow-list of common ports and
  public addresses; it cannot reach hosts behind Cloudflare's proxy. (built)
- No ads, tracking, analytics or third-party scripts; only Google Fonts and the Globalping API.
  (from the brief)
- Static assets plus a small Worker, no framework, no build step. (built; owner's usual stack)
- Must work at 390px, light and dark, Persian (RTL) and English. (from the brief)
- Production runs on netcheck.whosane.dev (launched 2026-11-01). Production deploys need the
  owner's approval. Do not use or claim the netcheck.online domain or name; it belongs to
  someone else. (from the brief)
- Undecided: whether MTR or a "check from my own country" shortcut is wanted; any API key
  for Globalping (higher limits). (open, owner to decide)

## Brand Commitments

- Name: "netcheck" in English, «نت‌چک» in Persian. (inferred, owner to confirm)
- Voice: plain and factual, says what is measured from where; no marketing claims.
  (inferred, owner to confirm)

## Evidence on Hand

None: no users, testimonials, usage numbers or press. Future work must not invent any.

## Product Principles

1. Say where every number comes from (Cloudflare edge, Globalping probe, never "your device"
   unless it is). (inferred, owner to confirm)
2. Nothing about the visitor is stored or sent anywhere except the check they asked for.
   (inferred from the brief, owner to confirm)
3. Persian and English are equal; neither is a translation afterthought. (inferred, owner to confirm)
4. Fast answer first, raw output one click away. (inferred, owner to confirm)

## Accessibility & Inclusion

Keyboard-usable controls with visible focus, readable contrast in both themes, correct
bidi for mixed Persian/Latin text (units as words in Persian). No formal standard was
named. (inferred, owner to confirm)

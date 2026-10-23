# Let's Meet

Find the day everyone's free. Create a plan, send one link to your group, and each friend either connects Google Calendar or taps in their days. Let's Meet shows where everyone overlaps: the best evening for dinner, or which 2-night stretch works for a trip.

- **Two kinds of plans.** *By time* (dinner, drinks, meetings) finds the longest windows where most people are free. *By nights* (trips, retreats) finds stretches of consecutive free days for any trip length.
- **Phone-first, iOS-style UI.** Drag across days to select them, swipe across a calendar to change several days at once, pick a cover image for the link preview. English and Japanese.
- **Private by design.** Gmail and event details are never touched, Google access stays in the browser, answers are end-to-end encrypted, and every plan deletes itself (details below).

日本語のセットアップ手順は [docs/SETUP.ja.md](docs/SETUP.ja.md) にあります。

## How your data is protected

The idea is *what we never hold can't leak*. Instead of piling up defences, the app avoids receiving or keeping risky data in the first place.

| | What it does | Code |
|---|---|---|
| 1. No Gmail, no event details | The only Google permission requested is `calendar.freebusy` (when you're busy). No email address, no `openid`/`profile`. | `app/src/lib/google.ts` |
| 2. Google access never reaches the server | Google sign-in and the free/busy request run in the visitor's browser. The access token stays in memory and is revoked right after the single request. The server has no Google code at all. | `app/src/lib/google.ts`, `worker/` |
| 3. End-to-end encrypted answers | Names and availability are encrypted in the browser (AES-GCM 256, WebCrypto). The key lives after the `#` in the link, which browsers never send to the server. | `app/src/lib/crypto.ts` |
| 4. Self-deleting plans | Each plan is a Durable Object with a timer: everything is deleted 7 days after creation. Picking a date deletes everyone's answers at once; only the title and date remain until the day after the event. | `worker/src/poll.ts` |
| 5. Small attack surface | Strict CSP (scripts only from the site and Google's sign-in), no inline scripts or styles, no referrers, no analytics, no request logs. Five dev-only npm dependencies, pinned, with install scripts disabled. | `worker/src/index.ts`, `.npmrc` |

**Worst cases.** A full copy of the server's storage reveals plan titles, date ranges, cover choices and ciphertext; there are no tokens, emails or calendar contents to steal. Tampered site code could read the free/busy times of people who connect *after* the tampering, within the plan's dates, and nothing more (the permission doesn't reach Gmail or event details). A leaked plan link exposes that plan's availability, until the plan deletes itself.

## Run it locally

Needs Node.js 20 or later.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:8787. This mode needs no Google setup: "Connect Google Calendar" fills in sample busy times.

- Tests: `npm test`
- Type check: `npm run typecheck`
- See the self-delete timer work: `npx wrangler dev --var POLL_TTL_SECONDS:90` (plans delete after 90 seconds)
- Turn on the commit guard (blocks `.env`, keys and local data from being committed): `npm run hooks`

## Host your own copy

You need a Google account (for Google Cloud) and a Cloudflare account. Both are free for this. The full walkthrough, screen by screen, is in [docs/SETUP.ja.md](docs/SETUP.ja.md) (Japanese). In short:

1. **Cloudflare:** `npx wrangler login`, then `npm run deploy`. Note the `https://letsmeet.<your-subdomain>.workers.dev` address it prints.
2. **Google Cloud:** create a project, enable the **Google Calendar API**, and set up Google Auth Platform:
   - Audience: External, publishing status **Testing**. Add the Google accounts that will use it as test users (up to 100).
   - Data access: add **only** `https://www.googleapis.com/auth/calendar.freebusy`.
   - Clients: create an OAuth client of type **Web application**. Add your site address (and `http://localhost:8787` for local testing) under *Authorized JavaScript origins*. No redirect URIs. The client secret is not used; don't store it anywhere.
3. **Configure and redeploy:** `cp .env.example .env`, put the client ID in `VITE_GOOGLE_CLIENT_ID` (and a contact address in `VITE_CONTACT_EMAIL`), then `npm run deploy` again. The client ID is built into the page, so redeploy whenever it changes.
4. **Going public:** to let anyone use it beyond your test users, attach your own domain, fill in Branding (home page and `/privacy`), verify the domain, and submit the app for Google's verification. Replace the simplified Google Calendar mark (`GCAL` in `app/src/ui/dom.ts`) with Google's official asset first.

### Configuration

| Where | Name | Meaning |
|---|---|---|
| `.env` | `VITE_GOOGLE_CLIENT_ID` | Your OAuth client ID. Empty = people fill in their days by hand. |
| `.env` | `VITE_CONTACT_EMAIL` | Contact address shown on `/privacy`. |
| `wrangler.jsonc` | `POLL_TTL_SECONDS` | How long an undecided plan lives (default 7 days). |
| `wrangler.jsonc` | `ratelimits` | Write requests allowed per visitor per minute (default 30). |

## Project layout

```
app/                  the web app (Vite + plain TypeScript, no UI framework)
  src/screens/        create, share/respond/results/decided, info pages
  src/lib/            scheduling logic, encryption, API client, Google free/busy, calendar links, dates
  src/ui/             calendar, time grid, wheel picker, cover art, menus, availability colours
  public/og/          link-preview images (regenerate with scripts/make-og.sh)
worker/               Cloudflare Worker: API, security headers, link previews
  src/poll.ts         one Durable Object per plan, with its self-delete timer
  src/validate.ts     strict checks on everything the browser sends
tests/                unit tests (Vitest)
docs/SETUP.ja.md      step-by-step setup guide (Japanese)
```

## Check the privacy claims yourself

1. **No token reaches the server:** in the browser's network panel, a Google token (starts with `ya29.`) appears only in the one request to `www.googleapis.com`. (The `Authorization` header on requests to your own site is the per-answer edit secret, unrelated to Google.)
2. **The server only has ciphertext:** after answering locally, search the files under `.wrangler/state/v3/do/` for a name you entered; it isn't there.
3. **Permission is free/busy only, and removed after use:** check https://myaccount.google.com/connections.
4. **Plans really delete:** run with `POLL_TTL_SECONDS:90`, create a plan, and see `/api/polls/<id>` return 404 after 90 seconds.
5. **CSP is enforced:** try loading an outside script from the browser console and watch it get blocked.

## Security

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## License

[MIT](LICENSE)

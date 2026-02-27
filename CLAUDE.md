# Opticon - Claude Guide

## Deployment Targets

- Production: `https://opticon.heyitsmejosh.com`
- Docs: `https://heyitsmejosh.com/opticon/`

## What This Project Is

Opticon is a financial terminal app with:

- High-speed simulator UI (`src/App.jsx`)
- Personal finance panel (`src/components/FinancePanel.jsx`) -- portfolio, budget, debt, goals, spending
- Prediction market feed and filters
- Map-first backdrop + overlays (`src/components/LiveMapBackdrop.jsx`)
- Tactical HUD styling pass (grid overlay + live status badge + neon map controls)
- Single serverless API entry (`api/gateway.js`) with handlers under `server/api/`
- Stock data: FMP batch quotes (primary) + Yahoo Finance (fallback)
- Auth system: bcrypt password hashing, httpOnly cookie sessions, email verification
- Portfolio API: KV-backed CRUD (`server/api/portfolio.js`), syncs with CLI via `balance` command
- Geolocation zoom policy: granted GPS uses neighborhood zoom; cached location uses near-neighborhood zoom; IP fallback stays wider.

## Auth System

- `server/api/auth.js` -- register, login, verify-email, me, logout actions
- `src/hooks/useAuth.js` -- auth state hook
- `src/components/LoginPage.jsx` -- login form
- `src/components/RegisterPage.jsx` -- register form with inline pricing
- Sessions: httpOnly secure cookie, stored in Vercel KV (`session:{token}`)
- Users: stored in KV (`user:{email}`)
- Email verification: token stored in KV (`verify:{token}`)

## Finance Panel

- `src/components/FinancePanel.jsx` -- full-screen finance overlay
- `src/hooks/usePortfolio.js` -- portfolio data hook, server sync when authenticated, localStorage fallback
- `src/utils/financeData.js` -- demo data + JSON schema validation
- `server/api/portfolio.js` -- KV-backed portfolio CRUD (get, update, summary)
- PORTFOLIO button in header opens the panel
- Users can import/export JSON balance sheets
- Demo data loads by default
- Live stock prices from useStocks merge into holdings for real-time valuation
- CLI: `~/.local/bin/balance` reads/writes portfolio via API

## Situation Monitor Data Sources

- Flights: `/api/flights`
- Traffic flow + nearby incidents: `/api/traffic`
- Construction/barrier incidents: `/api/incidents`
- Earthquakes: `/api/earthquakes`
- Global geopolitical events feed: `/api/events`
- Weather alerts: `/api/weather-alerts`
- Crime data: `/api/crime`
- Local events: `/api/local-events`

Notes:
- Map overlays include traffic/construction/seismic/global-event/crime/local-event markers.
- Local overlays refresh by current map viewport center.
- Fallback markers are intentionally injected when upstream feeds are sparse, to avoid empty-city states.
- Predictions are shown only when a confident geographic anchor is inferred.

## Local Development

```bash
npm install
npm run dev
```

App URL: `http://localhost:5173`

## Test + Build

```bash
npm test -- --run
npm run build
```

## Deployment Workflow

```bash
git checkout main
git pull
npm test -- --run
git add .
git commit -m "..."
git push origin main
```

Pushing `main` triggers production deploy on Vercel. Custom domain: `opticon.heyitsmejosh.com`.
If Hobby deploys fail with function-count errors, ensure endpoint logic stays in `server/api/` and only `api/gateway.js` is deployed as the runtime function.

## Billing / Upgrade

- Pricing modal offers `Free`, `Starter ($20)`, and `Pro ($50)`.
- Checkout endpoint is `POST /api/stripe?action=checkout` with `{ priceId }`.
- Allowed price IDs are controlled by:
  - `STRIPE_PRICE_ID_STARTER`
  - `STRIPE_PRICE_ID_PRO`
  - `VITE_STRIPE_PRICE_ID_STARTER`
  - `VITE_STRIPE_PRICE_ID_PRO`
- Apple Pay is handled by Stripe Checkout on supported devices once domain verification is enabled in Stripe.

## Stock Data API

- FMP (Financial Modeling Prep) is the primary stock data source. Requires `FMP_API_KEY` env var.
- Yahoo Finance chart API is the fallback when FMP is unavailable or quota exhausted. Yahoo requests are throttled in batches of 10 with 100ms delays to avoid rate limiting.
- 90s cache TTL to stay within FMP 250 req/day free tier.
- Cron job caches all 100 symbols (FMP batch first, Yahoo chunked fallback) to Vercel Blob daily.
- `X-Opticon-Data-Source` header shows which provider served the data (`fmp`/`yahoo`/`mixed`).

## Stripe Setup

To activate paid tiers:

1. Create a Stripe account at https://dashboard.stripe.com/register
2. In Stripe Dashboard, create two Products:
   - **Opticon Starter** ($20/mo recurring)
   - **Opticon Pro** ($50/mo recurring)
3. Copy each product's Price ID (starts with `price_`)
4. Set Vercel env vars:
   - `STRIPE_SECRET_KEY` -- from Stripe Dashboard > Developers > API keys
   - `STRIPE_PRICE_ID_STARTER` -- Price ID for Starter product
   - `STRIPE_PRICE_ID_PRO` -- Price ID for Pro product
   - `VITE_STRIPE_PUBLISHABLE_KEY` -- publishable key (starts with `pk_`)
   - `VITE_STRIPE_PRICE_ID_STARTER` -- same as STRIPE_PRICE_ID_STARTER (needed client-side)
   - `VITE_STRIPE_PRICE_ID_PRO` -- same as STRIPE_PRICE_ID_PRO (needed client-side)
5. For Apple Pay: Stripe Dashboard > Settings > Payment methods > Apple Pay > add + verify domain
6. Webhook (optional): create endpoint at `https://opticon.heyitsmejosh.com/api/stripe?action=webhook` for `checkout.session.completed` events

## Current Priorities

- Keep simulator and monitor responsive
- Keep API handlers small and test-covered
- Deduplicate logic before adding new features
- Preserve UI behavior unless explicitly requested

## Roadmap
- [ ] iOS companion app (opticon-ios)
- [ ] Apple Pay integration via Stripe
- [ ] Real-time WebSocket quotes
- [ ] Portfolio analytics dashboard
- [ ] Prediction market accuracy tracking
- [ ] Price alert system with push notifications

# Rise - Claude Guide

## Deployment Targets

- Vercel production: `https://rise-production.vercel.app/`
- GitHub Pages docs shell: `https://heyitsmejosh.com/rise/`

Use the Vercel production URL for runtime/API validation.

## What This Project Is

Rise is a financial terminal app with:

- High-speed simulator UI (`src/App.jsx`)
- Prediction market feed and filters
- Situation Monitor map (`src/components/SituationMonitor.jsx`)
- Serverless data endpoints under `api/`

## Situation Monitor Data Sources

- Flights: `/api/flights`
- Traffic flow + nearby incidents: `/api/traffic`
- Construction/barrier incidents: `/api/incidents`
- Earthquakes: `/api/earthquakes`
- Global geopolitical events feed: `/api/events`
- Weather alerts: `/api/weather-alerts`

Notes:
- Map markers currently visualize flights/incidents/earthquakes.
- Geopolitical events are shown in the events panel.

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

If Vercel is connected to this repo with production branch `main`, pushing `main` triggers a production deployment.

## Billing / Upgrade

- Pricing modal offers `Free`, `Starter ($20)`, and `Pro ($50)`.
- Checkout endpoint is `POST /api/stripe?action=checkout` with `{ priceId }`.
- Allowed price IDs are controlled by:
  - `STRIPE_PRICE_ID_STARTER`
  - `STRIPE_PRICE_ID_PRO`
  - `VITE_STRIPE_PRICE_ID_STARTER`
  - `VITE_STRIPE_PRICE_ID_PRO`
- Apple Pay is handled by Stripe Checkout on supported devices once domain verification is enabled in Stripe.

## Current Priorities

- Keep simulator and monitor responsive
- Keep API handlers small and test-covered
- Deduplicate logic before adding new features
- Preserve UI behavior unless explicitly requested

# Rise

Low-latency financial terminal with prediction markets, trading simulator, and quantitative analysis.

**Live**: https://rise-production.vercel.app | **Docs**: https://heyitsmejosh.com/rise/

![Architecture](architecture.svg)

## Features

- **Trading Simulator**: 61 assets, autonomous algorithm, 50ms tick rate, $1 → $1T continuous run (Fibonacci milestones, no interruptions)
- **Prediction Markets**: Real-time Polymarket feeds with probability filters
- **Monte Carlo**: 5K-path simulations with bull/base/bear scenarios
- **Live Data**: Yahoo Finance stocks, commodities, crypto

## Quick Start

```bash
git clone https://github.com/nulljosh/rise.git
cd rise
npm install
npm run dev
```

Opens at http://localhost:5173

## Tech Stack

- React 19 + Vite
- Recharts for visualization
- Polymarket + Yahoo Finance APIs
- Custom Monte Carlo engine
- Vercel deployment

## Architecture Goals

| Metric | Target | Current |
|--------|--------|---------|
| Bundle Size | <500KB | 233KB |
| Memory | <10MB | ~177KB |
| API Latency | <100ms | ~200ms |
| React Warnings | 0 | 0 |

## Development

```bash
npm test              # Run tests
npm run build         # Production build
npm run test:speed    # Playwright speed test
```

**Structure**:
- `api/` - Serverless functions (markets, stocks, commodities)
- `src/` - React components and hooks
- `src/utils/` - Monte Carlo math, asset config

## Monetization

Free tier includes all features. Pro tier ($49/mo) adds:
- cTrader auto-trading integration
- TradingView webhooks
- Priority API access

## Deployment

**Vercel**: Auto-deploys from main branch via GitHub Actions

**GitHub Pages**: https://heyitsmejosh.com/rise/ (static build)

## Roadmap

**P0 — Critical (must ship)**
- [ ] Improve win rate 70% → 85% (entry filter tuning)
- [ ] Run history persistence (localStorage or Blob)
- [ ] Polymarket + Situation Monitor integration

**P1 — High priority**
- [ ] Historical backtesting against real OHLCV data
- [ ] Kalshi prediction market integration
- [ ] Custom ticker input by user

**P2 — Feature complete**
- [ ] Black-Scholes options pricing UI
- [ ] Price alerts / push notifications
- [ ] Situation Monitor panel (real-time news → PM market correlation)

**P3 — Performance**
- [ ] Delta-Threshold bandwidth optimization
- [ ] Binary payload compression
- [ ] WebSocket real-time feeds (replace polling)

**P4 — Pro tier**
- [ ] TradingView webhook auto-trading
- [ ] Interactive Brokers live API connection
- [ ] Paper trading mode (live prices, sim risk)

**P5 — Long-term**
- [ ] C++ core with WASM bridge
- [ ] Academic white paper publication

## Links

- [Issues](https://github.com/nulljosh/rise/issues)
- [Discussions](https://github.com/nulljosh/rise/discussions)
- [Twitter](https://twitter.com/trommatic)

---

Built with Claude Sonnet 4.5 | MIT License | Not financial advice

## Project Map

![Project Map](map.svg)

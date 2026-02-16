# Rise

Low-latency financial terminal with prediction markets, trading simulator, and quantitative analysis.

**Live**: https://rise-production.vercel.app | **Docs**: https://heyitsmejosh.com/rise/

![Architecture](architecture.svg)

## Features

- **Trading Simulator**: 61 assets, autonomous algorithm, 50ms tick rate, $1 → $1B in <60s
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

**P0**:
- [ ] Improve simulator win rate (70% → 85%)
- [ ] Add run history tracking

**P1**:
- [x] Sync with live prices
- [ ] Historical backtesting
- [ ] Kalshi integration

**P2**:
- [ ] Black-Scholes options
- [ ] Custom ticker input
- [ ] Price alerts

**P3**:
- [ ] Delta-Threshold algorithm
- [ ] Binary payloads
- [ ] WebSocket feeds

**P4**:
- [ ] TradingView webhooks
- [ ] Interactive Brokers API
- [ ] Paper trading

**P5**:
- [ ] C++ core with WASM bridge
- [ ] White paper publication

## Links

- [Issues](https://github.com/nulljosh/rise/issues)
- [Discussions](https://github.com/nulljosh/rise/discussions)
- [Twitter](https://twitter.com/trommatic)

---

Built with Claude Sonnet 4.5 | MIT License | Not financial advice

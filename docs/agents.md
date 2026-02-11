# AI Agents & Automation

Strategic suggestions for automating Bread with AI agents.

## Implemented Agents

### 1. Live Price Aggregator 
**Status:** Complete
**What it does:** Real-time price updates for 61 assets (stocks, indices, commodities, crypto)
**Tech:** Yahoo Finance API, batched requests
**Trigger:** 50ms tick rate in trading simulator

**Flow:**
1. App requests prices for active assets
2. API batches requests to Yahoo Finance
3. Parse responses and normalize data
4. Update state with new prices
5. Trigger trading algorithm if momentum detected

---

## Proposed Agents

### 2. News Sentiment Analyzer (High Priority)
**What it does:** Auto-parameterize Monte Carlo simulations with live news sentiment
**Tech:** NewsAPI + GPT-4 sentiment analysis
**Trigger:** Monte Carlo simulation start

**Flow:**
1. User requests Monte Carlo simulation for asset
2. Fetch last 24h news for asset symbol
3. GPT-4 analyzes sentiment → bullish/neutral/bearish score
4. Map sentiment to drift (μ):
   - Bullish: μ = 15-20% annualized
   - Neutral: μ = 7-10% annualized
   - Bearish: μ = 0-5% annualized
5. Calculate volatility (σ) from historical price data
6. Run 5,000 path simulation with auto-parameterized values

**Why this matters:**
- Removes manual parameter tuning
- Reflects real market conditions
- Educational: shows how news impacts probabilities
- Makes simulations more realistic

**Revenue potential:** Could sell as premium feature ($9/mo for live sentiment)

---

### 3. Strategy Backtester (High Priority)
**What it does:** Test trading strategies on historical data
**Tech:** 1-year historical candles from Yahoo Finance
**Trigger:** "Backtest" button in simulator

**Flow:**
1. Load 1-year historical data for all 61 assets
2. Replay data through trading algorithm at 1-day intervals
3. Track simulated balance, win rate, max drawdown
4. Calculate Sharpe ratio, Sortino ratio, Calmar ratio
5. Display equity curve and trade history
6. Compare to buy-and-hold benchmark

**Metrics tracked:**
- Win rate (% profitable trades)
- Sharpe ratio (risk-adjusted returns)
- Max drawdown (worst peak-to-trough)
- Average trade duration
- Best/worst performing assets

**Implementation:**
```javascript
// api/backtest.js
export default async function handler(req, res) {
  const { symbols, startDate, endDate } = req.query;

  // Fetch 1Y historical data
  const history = await fetchHistoricalData(symbols, startDate, endDate);

  // Replay through trading algorithm
  let balance = 100;
  const trades = [];

  for (const candle of history) {
    const signal = detectMomentum(candle);
    if (signal) {
      const trade = executeTrade(balance, signal);
      trades.push(trade);
      balance = trade.newBalance;
    }
  }

  return res.json({ finalBalance: balance, trades, metrics: calculateMetrics(trades) });
}
```

---

### 4. Real-Time Performance Tracker (Medium Priority)
**What it does:** Persist simulator runs and aggregate statistics
**Tech:** localStorage or Supabase
**Trigger:** After each simulation completes

**Flow:**
1. Simulator reaches $1B or stops early
2. Record:
   - Final balance
   - Time elapsed
   - Win rate
   - Best/worst assets
   - Stopped out count
3. Save to localStorage with timestamp
4. Display aggregate stats:
   - Last 10 runs average win rate
   - Fastest time to $1B
   - Most profitable asset overall

**UI additions:**
- "History" tab showing all past runs
- Aggregate stats card in dashboard
- Export to CSV for external analysis

---

### 5. Automated Speed Test Bot (Medium Priority)
**What it does:** Verify sub-60s target programmatically
**Tech:** Playwright/Puppeteer
**Trigger:** CI/CD pipeline or manual npm script

**Flow:**
1. Launch headless browser
2. Navigate to http://localhost:5173
3. Click "Start Simulator"
4. Monitor balance every 100ms
5. Stop when balance ≥ $1B
6. Assert time elapsed < 60 seconds
7. Log win rate, stopped out count

**Implementation:**
```javascript
// tests/speed.spec.js
test('$1 → $1B in under 60 seconds', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const startTime = Date.now();
  await page.click('button:has-text("Start")');

  await page.waitForSelector('text=/Balance: \\$1,0\\d{2},/', { timeout: 60000 });

  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeLessThan(60000);
});
```

**Current status:** Playwright tests exist but need CI/CD integration

---

### 6. Broker Integration Bot (Low Priority, High Impact)
**What it does:** Execute real trades based on simulator signals
**Tech:** Interactive Brokers TWS API, Alpaca API
**Trigger:** User enables "Live Trading Mode"

**Flow:**
1. User connects brokerage account (OAuth)
2. Simulator detects momentum signal
3. Send order to broker API:
   - Symbol: Asset ticker
   - Side: Buy/Sell
   - Quantity: Based on risk management rules
   - Order type: Market or limit
4. Broker confirms execution
5. Display in UI with real P&L
6. Track slippage vs simulated fills

**Risk management:**
- Start with paper trading mode (Alpaca sandbox)
- Max $100 position size initially
- Require 2FA for live trades
- Kill switch button (liquidate all positions)
- Position limits (max 20% per asset)

**Legal considerations:**
- Not financial advice disclaimer
- User must confirm they understand risks
- Regulatory compliance (check local laws)
- No guarantees on simulator performance

---

### 7. Kalshi Integration (Medium Priority)
**What it does:** Add second prediction market source
**Tech:** Kalshi REST API
**Trigger:** "Prediction Markets" tab load

**Flow:**
1. Fetch markets from Kalshi API
2. Filter by category (Politics, Finance, Sports)
3. Display alongside Polymarket data
4. Allow sorting by probability
5. Cross-market arbitrage detection (if same event on both)

**Example markets:**
- "Fed rate cut in Q1 2026" (87% yes)
- "S&P 500 above 6000 by Dec 2026" (64% yes)
- "Bitcoin above $100k by end of 2026" (72% yes)

**Arbitrage opportunity:**
- If Polymarket says 60% and Kalshi says 75%, flag for user
- Potential profit: Buy on Polymarket, sell on Kalshi

---

### 8. VIX Spike Alert Bot (Low Priority)
**What it does:** Alert when volatility spikes (market fear)
**Tech:** Yahoo Finance VIX data + push notifications
**Trigger:** VIX > 30 or >20% daily increase

**Flow:**
1. Poll VIX every 5 minutes
2. If VIX > 30 or daily change > 20%:
   - Show banner: "Something happened "
   - Push notification (if user opted in)
   - Suggest defensive strategies (cash, bonds)
3. Auto-pause simulator (market too chaotic)

**UI design:**
- Red banner at top: "VIX spiked to 35 (+24%) - Market fear mode"
- Button: "Show safe assets" (gold, bonds, cash)

---

### 9. Correlation Matrix Agent (Low Priority)
**What it does:** Calculate asset correlation matrix
**Tech:** Historical price data + correlation coefficient math
**Trigger:** "Analysis" tab

**Flow:**
1. Fetch 1-year historical data for all assets
2. Calculate correlation coefficients between all pairs
3. Display heatmap (red = negative correlation, green = positive)
4. Suggest diversification improvements

**Example insights:**
- "BTC and Gold are -0.3 correlated (good diversification)"
- "AAPL and MSFT are 0.8 correlated (redundant exposure)"

---

## Architecture

### Orchestration Layer
```
┌─────────────────────────────────────┐
│       Agent Orchestrator            │
│  (Vercel Functions + Cron)          │
└─────────────────────────────────────┘
         │
         ├─> Price Aggregator (Yahoo Finance)
         ├─> News Sentiment (GPT-4)
         ├─> Backtester (Historical replay)
         ├─> Performance Tracker (localStorage)
         ├─> Broker Integration (IB/Alpaca API)
         └─> VIX Alert (Push notifications)
```

### Storage
- **Vercel Blob** - Historical data cache, simulation runs
- **localStorage** - User settings, trade history
- **Supabase** (optional) - Multi-device sync, user accounts

---

## Revenue Model (Future)

### Free Tier
- Trading simulator (unlimited)
- Basic Monte Carlo (manual parameters)
- Polymarket markets (free data)
- 10 simulation runs saved

### Pro ($9/mo)
- Auto-parameterized Monte Carlo (news sentiment)
- Backtesting on 1Y historical data
- Kalshi + Polymarket integration
- Unlimited simulation history
- Export to CSV

### Quant ($29/mo)
- Real-time broker integration (paper trading)
- Strategy optimizer (grid search parameters)
- Custom stock input (any ticker)
- API access for algo traders
- Priority support

### Enterprise (Custom)
- White-label financial terminal
- Custom data sources
- On-premise deployment
- SLA guarantees

**Target market:** Retail traders, quant researchers, finance students

---

## Technical Debt & Risks

### Performance
- Monte Carlo simulations can lag on mobile (5,000 paths CPU-intensive)
- Batched price updates still cause React re-renders (need Delta-Threshold)
- Bundle size growing (233KB, target <200KB)

### Scalability
- Free tier Yahoo Finance has rate limits (2,000 req/hr)
- Vercel function timeout (10s max) may block backtesting
- localStorage has 5-10MB limit (affects simulation history)

### Reliability
- Yahoo Finance API can be flaky (need fallback to Finnhub/IEX)
- Polymarket API has no SLA (need error handling)
- Browser tab backgrounding pauses tick rate (need Web Worker)

---

## Next Steps

1.  Complete live price aggregation
2. ⏳ Build news sentiment analyzer (v1.3.0)
3. ⏳ Add backtesting on 1Y data
4. ⏳ Implement performance tracker with localStorage
5. ⏳ Integrate Kalshi prediction markets
6. ⏳ Test with real users (5-10 beta testers)

---

**Last updated:** 2026-02-09

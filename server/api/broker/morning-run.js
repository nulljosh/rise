// Vercel cron: 9:30 AM ET (14:30 UTC) weekdays — paper trade sim signals via Alpaca
// Schedule in vercel.json: { "path": "/api/broker/morning-run", "schedule": "30 14 * * 1-5" }
import { ALPACA_BASE, alpacaHeaders, hasAlpacaKey } from './alpaca.js';
const WATCHLIST = ['AAPL', 'NVDA', 'MSFT', 'SPY', 'QQQ'];
const SIGNAL_THRESHOLD = 0.55; // bull prob > 55% = buy, < 45% = sell

// GBM Monte Carlo — 500 paths, 30-day horizon
function monteCarlo(price, mu = 0.0005, sigma = 0.02, paths = 500, days = 30) {
  let bull = 0;
  for (let p = 0; p < paths; p++) {
    let s = price;
    for (let d = 0; d < days; d++) {
      const z = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
      s *= Math.exp((mu - 0.5 * sigma * sigma) + sigma * z);
    }
    if (s > price) bull++;
  }
  return bull / paths;
}

async function getPrice(symbol) {
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
  if (!r.ok) return null;
  const j = await r.json();
  return j?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
}

async function placeOrder(symbol, qty, side) {
  const r = await fetch(`${ALPACA_BASE}/v2/orders`, {
    method: 'POST',
    headers: alpacaHeaders(true),
    body: JSON.stringify({ symbol, qty: String(qty), side, type: 'market', time_in_force: 'day' }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || `Alpaca ${r.status}`);
  return data;
}

export default async function handler(req, res) {
  // Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!hasAlpacaKey()) {
    console.log('[MORNING-RUN] Alpaca not configured — skipping');
    return res.status(200).json({ ok: true, message: 'Alpaca not configured' });
  }

  const results = [];
  for (const symbol of WATCHLIST) {
    try {
      const price = await getPrice(symbol);
      if (!price) { results.push({ symbol, skipped: true }); continue; }
      const prob = monteCarlo(price);
      const signal = prob > SIGNAL_THRESHOLD ? 'buy' : prob < (1 - SIGNAL_THRESHOLD) ? 'sell' : null;
      console.log(`[MORNING-RUN] ${symbol} $${price} bull=${(prob * 100).toFixed(1)}% → ${signal || 'hold'}`);
      if (signal) {
        const order = await placeOrder(symbol, 1, signal);
        results.push({ symbol, price, prob, signal, orderId: order.id });
      } else {
        results.push({ symbol, price, prob, signal: 'hold' });
      }
    } catch (err) {
      console.error(`[MORNING-RUN] ${symbol}:`, err.message);
      results.push({ symbol, error: err.message });
    }
  }

  return res.status(200).json({ ok: true, results, runAt: new Date().toISOString() });
}

// Serverless function to fetch stock prices
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const symbols = ['IAU', 'SLV', 'PLTR', 'HOOD', 'SPY'];

  try {
    // Fetch all stock quotes in parallel using Yahoo Finance API
    const promises = symbols.map(async (symbol) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${symbol}: ${response.status}`);
          return { symbol, error: true };
        }

        const data = await response.json();
        const quote = data.chart.result[0];
        const meta = quote.meta;

        return {
          symbol,
          regularMarketPrice: meta.regularMarketPrice,
          regularMarketChangePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          currency: meta.currency || 'USD',
          previousClose: meta.previousClose
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        return { symbol, error: true };
      }
    });

    const results = await Promise.all(promises);

    // Convert array to object keyed by symbol
    const quotes = {};
    results.forEach(result => {
      if (!result.error) {
        quotes[result.symbol] = result;
      }
    });

    res.status(200).json({ quotes, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data', message: error.message });
  }
}

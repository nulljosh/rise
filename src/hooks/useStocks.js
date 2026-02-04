import { useState, useEffect, useCallback, useRef } from 'react';

// MAG7 + Popular stocks + CFDs (32 total)
const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'PLTR', 'HOOD', 'COST', 'JPM', 'WMT', 'TGT', 'PG', 'HIMS', 'COIN', 'SQ', 'SHOP', 'RKLB', 'SOFI', 'XAGUSD', 'XCUUSD', 'XAUUSD', 'XIC', 'NAS100', 'T', 'US500', 'US30', 'IBM', 'DXY', 'IWM', 'DIS'];

// Retry helper with exponential backoff
const fetchWithRetry = async (url, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, { signal: controller.signal });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      lastError = err;
      console.warn(`Fetch attempt ${i + 1}/${maxRetries} failed:`, err.message);

      // Don't retry on certain errors
      if (err.message.includes('400') || err.message.includes('Invalid')) {
        throw err;
      }

      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
};

// Fallback static data for when API fails (last known prices - Jan 24, 2026)
const FALLBACK_DATA = {
  AAPL: { symbol: 'AAPL', price: 247, changePercent: 0.42 },
  MSFT: { symbol: 'MSFT', price: 454, changePercent: -0.18 },
  GOOGL: { symbol: 'GOOGL', price: 323, changePercent: 0.33 },
  AMZN: { symbol: 'AMZN', price: 220, changePercent: 0.55 },
  NVDA: { symbol: 'NVDA', price: 185, changePercent: 1.24 },
  META: { symbol: 'META', price: 595, changePercent: -0.27 },
  TSLA: { symbol: 'TSLA', price: 421, changePercent: 2.15 },
  PLTR: { symbol: 'PLTR', price: 71, changePercent: 1.82 },
  HOOD: { symbol: 'HOOD', price: 38, changePercent: -0.55 },
  COST: { symbol: 'COST', price: 1020, changePercent: 0.31 },
  JPM: { symbol: 'JPM', price: 245, changePercent: 0.12 },
  WMT: { symbol: 'WMT', price: 95, changePercent: -0.08 },
  TGT: { symbol: 'TGT', price: 142, changePercent: 0.65 },
  PG: { symbol: 'PG', price: 170, changePercent: 0.22 },
  HIMS: { symbol: 'HIMS', price: 28, changePercent: 3.45 },
  COIN: { symbol: 'COIN', price: 265, changePercent: 2.87 },
  SQ: { symbol: 'SQ', price: 82, changePercent: 1.12 },
  SHOP: { symbol: 'SHOP', price: 115, changePercent: 0.88 },
  RKLB: { symbol: 'RKLB', price: 24, changePercent: 4.22 },
  SOFI: { symbol: 'SOFI', price: 16, changePercent: 1.55 },
  T: { symbol: 'T', price: 22, changePercent: -0.33 },
  IBM: { symbol: 'IBM', price: 235, changePercent: 0.18 },
  DIS: { symbol: 'DIS', price: 105, changePercent: -0.42 },
  IWM: { symbol: 'IWM', price: 228, changePercent: 0.55 },
};

export function useStocks(symbols = DEFAULT_SYMBOLS) {
  const [stocks, setStocks] = useState(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const retryCountRef = useRef(0);

  const fetchStocks = useCallback(async () => {
    try {
      // Validate symbols
      if (!Array.isArray(symbols) || symbols.length === 0) {
        throw new Error('Invalid symbols: must be a non-empty array');
      }

      const data = await fetchWithRetry(`/api/stocks?symbols=${symbols.join(',')}`);

      // Validate response
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array');
      }

      // Map to stock objects with validation
      const stockMap = {};
      data.forEach(s => {
        if (s && s.symbol && typeof s.price === 'number') {
          stockMap[s.symbol] = {
            symbol: s.symbol,
            price: s.price,
            change: s.change ?? 0,
            changePercent: s.changePercent ?? 0,
            volume: s.volume ?? 0,
            high52: s.fiftyTwoWeekHigh ?? s.price,
            low52: s.fiftyTwoWeekLow ?? s.price,
          };
        }
      });

      // Check if we got any valid data
      if (Object.keys(stockMap).length === 0) {
        throw new Error('No valid stock data received');
      }

      setStocks(stockMap);
      setError(null);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (err) {
      setError(err.message);
      console.error('Stock fetch error:', err);
      retryCountRef.current += 1;

      // Use fallback data on error if we don't have any stocks loaded
      if (Object.keys(stocks).length === 0) {
        console.warn('Using fallback stock data');
        setStocks(FALLBACK_DATA);
      }
    } finally {
      setLoading(false);
    }
  }, [symbols.join(',')]);

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [fetchStocks]);

  return {
    stocks,
    loading,
    error,
    refetch: fetchStocks,
    retryCount: retryCountRef.current
  };
}

export function useStockHistory(symbol, range = '1y') {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWithRetry(`/api/history?symbol=${encodeURIComponent(symbol)}&range=${range}`);

        // Validate response
        if (!data || !Array.isArray(data.history)) {
          throw new Error('Invalid history data format');
        }

        setHistory(data.history);
      } catch (err) {
        console.error('History fetch error:', err);
        setError(err.message);
        // Keep old data on error
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [symbol, range]);

  return { history, loading, error };
}

export const DEFAULT_SYMBOLS = 'AAPL,MSFT,GOOGL,AMZN,META,TSLA,NVDA';

export const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
};

export function parseSymbols(raw, { max = 50, validate = false, tooManyMessage } = {}) {
  const symbolList = (raw || DEFAULT_SYMBOLS)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (validate && symbolList.some(s => !/^[A-Za-z0-9.\-=^]+$/.test(s))) {
    return { error: 'Invalid symbols format' };
  }

  if (symbolList.length > max) {
    return { error: tooManyMessage || `Too many symbols${max === 100 ? ' (max 100)' : ''}` };
  }

  return { symbolList };
}

export function setStockResponseHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
}

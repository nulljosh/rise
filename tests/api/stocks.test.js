import { describe, it, expect, beforeEach, vi } from 'vitest';
import handler from '../../api/stocks.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('Stocks API', () => {
  let mockReq;
  let mockRes;
  let jsonData;
  let statusCode;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonData = null;
    statusCode = 200;

    mockReq = {
      query: {}
    };

    mockRes = {
      status: vi.fn((code) => {
        statusCode = code;
        return mockRes;
      }),
      json: vi.fn((data) => {
        jsonData = data;
        return mockRes;
      }),
      setHeader: vi.fn()
    };
  });

  it('should fetch stocks successfully with default symbols', async () => {
    const mockYahooResponse = {
      quoteResponse: {
        result: [
          {
            symbol: 'AAPL',
            regularMarketPrice: 150.25,
            regularMarketChange: 2.5,
            regularMarketChangePercent: 1.69,
            regularMarketVolume: 50000000,
            fiftyTwoWeekHigh: 180,
            fiftyTwoWeekLow: 120
          }
        ]
      }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockYahooResponse
    });

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(200);
    expect(jsonData).toBeInstanceOf(Array);
    expect(jsonData.length).toBe(1);
    expect(jsonData[0].symbol).toBe('AAPL');
    expect(jsonData[0].price).toBe(150.25);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
  });

  it('should handle custom symbols query parameter', async () => {
    mockReq.query.symbols = 'TSLA,NVDA';

    const mockYahooResponse = {
      quoteResponse: {
        result: [
          { symbol: 'TSLA', regularMarketPrice: 250 },
          { symbol: 'NVDA', regularMarketPrice: 500 }
        ]
      }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockYahooResponse
    });

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(200);
    expect(jsonData.length).toBe(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('TSLA,NVDA'),
      expect.any(Object)
    );
  });

  it('should validate symbols format', async () => {
    mockReq.query.symbols = 'INVALID@SYMBOLS!';

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(400);
    expect(jsonData.error).toBe('Invalid symbols format');
  });

  it('should limit number of symbols', async () => {
    const tooManySymbols = Array(51).fill('AAPL').join(',');
    mockReq.query.symbols = tooManySymbols;

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(400);
    expect(jsonData.error).toBe('Too many symbols');
  });

  it('should handle Yahoo Finance API errors', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(500);
    expect(jsonData.error).toBe('Failed to fetch stock data');
  });

  it('should handle network timeouts', async () => {
    global.fetch.mockImplementationOnce(() =>
      new Promise((resolve) => {
        setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 15000);
      })
    );

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(504);
    expect(jsonData.error).toBe('Request timeout');
  });

  it('should filter out invalid quotes', async () => {
    const mockYahooResponse = {
      quoteResponse: {
        result: [
          { symbol: 'AAPL', regularMarketPrice: 150 },
          { symbol: 'INVALID' }, // Missing price
          { regularMarketPrice: 100 }, // Missing symbol
        ]
      }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockYahooResponse
    });

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(200);
    expect(jsonData.length).toBe(1);
    expect(jsonData[0].symbol).toBe('AAPL');
  });

  it('should handle invalid response format', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: 'format' })
    });

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(500);
    expect(jsonData.error).toBe('Failed to fetch stock data');
  });

  it('should set appropriate cache headers', async () => {
    const mockYahooResponse = {
      quoteResponse: {
        result: [{ symbol: 'AAPL', regularMarketPrice: 150 }]
      }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockYahooResponse
    });

    await handler(mockReq, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      's-maxage=60, stale-while-revalidate=300'
    );
  });
});

// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../../server/api/broker/positions.js';

function makeReqRes(query = {}) {
  const req = { method: 'GET', query };
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; },
  };
  return { req, res };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ALPACA_API_KEY;
  delete process.env.ALPACA_API_SECRET;
  delete process.env.ALPACA_BASE_URL;
});

describe('api/broker/positions handler', () => {
  it('returns 405 for non-GET methods', async () => {
    const { req, res } = makeReqRes();
    req.method = 'POST';
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns configured false when key is missing', async () => {
    const { req, res } = makeReqRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ positions: [], account: null, configured: false });
  });

  it('returns mapped positions and account summary', async () => {
    process.env.ALPACA_API_KEY = 'test-key';
    process.env.ALPACA_API_SECRET = 'test-secret';
    process.env.ALPACA_BASE_URL = 'https://paper-api.alpaca.markets';

    global.fetch = vi.fn(url => {
      if (url.includes('/v2/positions')) {
        return Promise.resolve({
          json: () => Promise.resolve([{
            symbol: 'AAPL',
            qty: '2',
            side: 'long',
            avg_entry_price: '195.5',
            current_price: '200',
            unrealized_pl: '9',
            unrealized_plpc: '0.023',
            market_value: '400',
          }]),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({
          equity: '10000',
          cash: '2500',
          buying_power: '5000',
          last_equity: '9900',
        }),
      });
    });

    const { req, res } = makeReqRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.configured).toBe(true);
    expect(res._body.positions).toHaveLength(1);
    expect(res._body.positions[0]).toEqual({
      symbol: 'AAPL',
      qty: 2,
      side: 'long',
      avgEntry: 195.5,
      currentPrice: 200,
      pnl: 9,
      pnlPct: 2.3,
      marketValue: 400,
    });
    expect(res._body.account).toEqual({
      equity: 10000,
      cash: 2500,
      buyingPower: 5000,
      dayPnl: 100,
    });
  });

  it('returns empty positions when positions payload is not an array', async () => {
    process.env.ALPACA_API_KEY = 'test-key';

    global.fetch = vi.fn(url => {
      if (url.includes('/v2/positions')) return Promise.resolve({ json: () => Promise.resolve({ error: 'bad' }) });
      return Promise.resolve({ json: () => Promise.resolve({ equity: '100', cash: '20', buying_power: '40', last_equity: '90' }) });
    });

    const { req, res } = makeReqRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.positions).toEqual([]);
    expect(res._body.account).not.toBeNull();
  });

  it('returns 500 when fetch throws', async () => {
    process.env.ALPACA_API_KEY = 'test-key';
    global.fetch = vi.fn().mockRejectedValue(new Error('alpaca down'));

    const { req, res } = makeReqRes();
    await handler(req, res);

    expect(res._status).toBe(500);
    expect(res._body.error).toMatch(/alpaca down/i);
  });
});

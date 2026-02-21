// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../../server/api/broker/signal.js';

function makeReqRes(body = {}) {
  const req = { method: 'POST', body };
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(bodyValue) { this._body = bodyValue; return this; },
    setHeader(k, v) { this._headers[k] = v; },
  };
  return { req, res };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ALPACA_API_KEY;
  delete process.env.ALPACA_API_SECRET;
  delete process.env.ALPACA_BASE_URL;
});

describe('api/broker/signal handler', () => {
  it('returns 405 for non-POST methods', async () => {
    const { req, res } = makeReqRes();
    req.method = 'GET';
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 400 for missing required fields', async () => {
    const { req, res } = makeReqRes({ symbol: 'AAPL' });
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('returns 400 for invalid side', async () => {
    const { req, res } = makeReqRes({ symbol: 'AAPL', qty: 1, side: 'hold' });
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('returns 503 when alpaca key is not configured', async () => {
    const { req, res } = makeReqRes({ symbol: 'AAPL', qty: 1, side: 'buy' });
    await handler(req, res);
    expect(res._status).toBe(503);
  });

  it('places an order successfully', async () => {
    process.env.ALPACA_API_KEY = 'test-key';
    process.env.ALPACA_API_SECRET = 'test-secret';
    process.env.ALPACA_BASE_URL = 'https://paper-api.alpaca.markets';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'order-123', status: 'accepted' }),
    });

    const { req, res } = makeReqRes({ symbol: 'aapl', qty: 2, side: 'buy' });
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://paper-api.alpaca.markets/v2/orders',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          symbol: 'AAPL',
          qty: '2',
          side: 'buy',
          type: 'market',
          time_in_force: 'day',
        }),
      })
    );
  });

  it('passes through alpaca API error status/message', async () => {
    process.env.ALPACA_API_KEY = 'test-key';
    process.env.ALPACA_API_SECRET = 'test-secret';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'insufficient buying power' }),
    });

    const { req, res } = makeReqRes({ symbol: 'TSLA', qty: 100, side: 'buy' });
    await handler(req, res);

    expect(res._status).toBe(422);
    expect(res._body.error).toMatch(/insufficient/i);
  });

  it('returns 500 when request throws', async () => {
    process.env.ALPACA_API_KEY = 'test-key';
    process.env.ALPACA_API_SECRET = 'test-secret';

    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const { req, res } = makeReqRes({ symbol: 'AAPL', qty: 1, side: 'sell' });
    await handler(req, res);

    expect(res._status).toBe(500);
    expect(res._body.error).toMatch(/network down/i);
  });
});

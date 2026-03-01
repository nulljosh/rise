import { describe, it, expect, beforeEach, vi } from 'vitest';

// The handler uses a module-level cache Map. We need a fresh module per test
// to avoid cache leaking between tests. Dynamic import with query string busts vitest's cache.
let handler;
let testId = 0;

beforeEach(async () => {
  vi.resetAllMocks();
  global.fetch = vi.fn();
  // Bust module cache so the in-memory `cache` Map starts empty each test
  const mod = await import(`../../server/api/news.js?t=${++testId}`);
  handler = mod.default;
});

const mockOk = (body) => ({ ok: true, json: async () => body });
const mockFail = (status = 500) => ({ ok: false, status });

function makeGdeltArticle(overrides = {}) {
  return {
    title: 'Test Article About Markets',
    url: 'https://example.com/test-article',
    domain: 'example.com',
    seendate: '20260228T120000Z',
    socialimage: 'https://example.com/img.jpg',
    sourcelat: '40.7128',
    sourcelon: '-74.0060',
    sourcecountry: 'United States',
    ...overrides,
  };
}

function makeReqRes(query = {}) {
  let statusCode = 200;
  let jsonData = null;
  const res = {
    status: vi.fn((code) => { statusCode = code; return res; }),
    json: vi.fn((data) => { jsonData = data; return res; }),
    setHeader: vi.fn(),
  };
  return {
    req: {
      method: 'GET',
      query,
      headers: { origin: 'http://localhost:5173' },
    },
    res,
    status: () => statusCode,
    data: () => jsonData,
  };
}

describe('news API handler', () => {

  // --- Method validation ---

  it('returns 405 for non-GET requests', async () => {
    const { req, res, status, data } = makeReqRes();
    req.method = 'POST';

    await handler(req, res);

    expect(status()).toBe(405);
    expect(data().error).toMatch(/not allowed/i);
  });

  // --- Happy path ---

  it('returns 200 with { articles: [] } shape on success', async () => {
    const { req, res, status, data } = makeReqRes();
    global.fetch = vi.fn(() => Promise.resolve(mockOk({
      articles: [makeGdeltArticle()],
    })));

    await handler(req, res);

    expect(status()).toBe(200);
    expect(data()).toHaveProperty('articles');
    expect(data().articles).toBeInstanceOf(Array);
    expect(data().articles.length).toBeGreaterThan(0);
  });

  it('sets Cache-Control s-maxage=300 header', async () => {
    const { req, res } = makeReqRes();
    global.fetch = vi.fn(() => Promise.resolve(mockOk({
      articles: [makeGdeltArticle()],
    })));

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 's-maxage=300');
  });

  it('returns articles with correct fields', async () => {
    const { req, res, data } = makeReqRes();
    global.fetch = vi.fn(() => Promise.resolve(mockOk({
      articles: [makeGdeltArticle()],
    })));

    await handler(req, res);

    const article = data().articles[0];
    expect(article).toHaveProperty('title');
    expect(article).toHaveProperty('url');
    expect(article).toHaveProperty('source');
    expect(article).toHaveProperty('image');
    expect(article).toHaveProperty('lat');
    expect(article).toHaveProperty('lon');
    expect(article).toHaveProperty('publishedAt');
  });

  // --- Deduplication ---

  it('deduplicates articles with similar titles', async () => {
    const { req, res, data } = makeReqRes();
    global.fetch = vi.fn(() => Promise.resolve(mockOk({
      articles: [
        makeGdeltArticle({ title: 'Stock Market Rallies on Fed News', url: 'https://a.com/1' }),
        makeGdeltArticle({ title: 'Stock Market Rallies on Fed News Today', url: 'https://b.com/2' }),
        makeGdeltArticle({ title: 'Completely Different Article About Sports', url: 'https://c.com/3' }),
      ],
    })));

    await handler(req, res);

    // The first two are near-duplicates (Jaccard >= 0.6), so one gets dropped
    expect(data().articles.length).toBe(2);
  });

  // --- URL normalization ---

  it('normalizes URLs by stripping tracking params', async () => {
    const { req, res, data } = makeReqRes();
    global.fetch = vi.fn(() => Promise.resolve(mockOk({
      articles: [
        makeGdeltArticle({
          title: 'First Article',
          url: 'https://www.example.com/article?utm_source=twitter&utm_medium=social&id=123',
        }),
        makeGdeltArticle({
          title: 'Second Unique Article',
          url: 'https://example.com/article?id=123',
        }),
      ],
    })));

    await handler(req, res);

    // Both URLs normalize to example.com/article?id=123, so second is deduped
    expect(data().articles.length).toBe(1);
  });

  // --- Geo extraction ---

  it('extracts geo coordinates from GDELT sourcelat/sourcelon', async () => {
    const { req, res, data } = makeReqRes();
    global.fetch = vi.fn(() => Promise.resolve(mockOk({
      articles: [makeGdeltArticle({
        sourcelat: '51.5074',
        sourcelon: '-0.1278',
      })],
    })));

    await handler(req, res);

    expect(data().articles[0].lat).toBeCloseTo(51.5074, 3);
    expect(data().articles[0].lon).toBeCloseTo(-0.1278, 3);
  });

  it('falls back to keyword geo matching when GDELT has no coordinates', async () => {
    const { req, res, data } = makeReqRes();
    global.fetch = vi.fn(() => Promise.resolve(mockOk({
      articles: [makeGdeltArticle({
        title: 'Major Event Happening in Tokyo Today',
        sourcelat: '',
        sourcelon: '',
      })],
    })));

    await handler(req, res);

    // Should match Tokyo coordinates (35.6762, 139.6503)
    expect(data().articles[0].lat).toBeCloseTo(35.6762, 3);
    expect(data().articles[0].lon).toBeCloseTo(139.6503, 3);
  });

  // --- Error handling ---

  it('returns 502 when GDELT is unreachable', async () => {
    const { req, res, status, data } = makeReqRes();
    global.fetch = vi.fn(() => Promise.reject(new Error('ECONNREFUSED')));

    await handler(req, res);

    expect(status()).toBe(502);
    expect(data().error).toMatch(/unavailable/i);
    expect(data().articles).toEqual([]);
  });

  // --- Caching ---

  it('uses cache on second call within 5 minutes', async () => {
    const article = makeGdeltArticle();
    global.fetch = vi.fn(() => Promise.resolve(mockOk({ articles: [article] })));

    // First call -- hits GDELT
    const call1 = makeReqRes();
    await handler(call1.req, call1.res);
    expect(call1.status()).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call -- should use cache, fetch not called again
    const call2 = makeReqRes();
    await handler(call2.req, call2.res);
    expect(call2.status()).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(call2.data().articles.length).toBe(call1.data().articles.length);
  });
});

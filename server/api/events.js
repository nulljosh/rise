// GDELT Project — global news events, geocoded, real-time 15min updates (free, no auth)
const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc';
const CACHE_TTL = 5 * 60 * 1000;
let cache = null;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(cache.data);
  }

  const query = encodeURIComponent('conflict OR disaster OR crisis OR earthquake OR war');
  const url = `${GDELT_BASE}?query=${query}&mode=artlist&maxrecords=20&format=json&sort=datedesc`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`GDELT ${r.status}`);
    const json = await r.json();
    const events = (json.articles || []).slice(0, 10).map(a => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      date: a.seendate,
      country: a.sourcecountry,
    }));
    const data = { events };
    cache = { ts: Date.now(), data };
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(data);
  } catch (err) {
    clearTimeout(timer);
    console.warn('GDELT error:', err.message);
    return res.status(502).json({ error: 'GDELT unavailable', events: [] });
  }
}

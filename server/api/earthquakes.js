// USGS Earthquake Feed — M2.5+ past 24h (free, no auth, global)
const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const CACHE_TTL = 5 * 60 * 1000;
let cache = null;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(cache.data);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(USGS_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`USGS ${r.status}`);
    const json = await r.json();
    const earthquakes = (json.features || []).map(f => ({
      mag: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2],
    }));
    const data = { earthquakes };
    cache = { ts: Date.now(), data };
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(data);
  } catch (err) {
    clearTimeout(timer);
    console.warn('USGS error:', err.message);
    return res.status(502).json({ error: 'USGS feed unavailable', earthquakes: [] });
  }
}

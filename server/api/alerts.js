import { kv } from '@vercel/kv';
import { supabaseRequest, supabaseConfigured } from './supabase.js';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach(pair => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) cookies[key] = rest.join('=');
  });
  return cookies;
}

async function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.opticon_session;
  if (!token) return null;
  const session = await kv.get(`session:${token}`);
  if (!session) return null;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    await kv.del(`session:${token}`);
    return null;
  }
  return session;
}

export default async function handler(req, res) {
  const session = await getSessionUser(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  if (!supabaseConfigured()) return res.status(503).json({ error: 'Database not configured' });

  const email = session.email;

  // GET: list alerts
  if (req.method === 'GET') {
    const rows = await supabaseRequest(
      `alerts?user_email=eq.${encodeURIComponent(email)}&select=*&order=created_at.desc`
    );
    return res.status(200).json(rows || []);
  }

  // POST: create alert
  if (req.method === 'POST') {
    const { symbol, target_price, direction } = req.body || {};
    if (!symbol || !target_price || !direction) {
      return res.status(400).json({ error: 'symbol, target_price, and direction required' });
    }
    if (!['above', 'below'].includes(direction)) {
      return res.status(400).json({ error: 'direction must be "above" or "below"' });
    }

    const rows = await supabaseRequest('alerts', {
      method: 'POST',
      body: {
        user_email: email,
        symbol: symbol.toUpperCase().trim(),
        target_price: Number(target_price),
        direction,
      },
    });
    return res.status(201).json(Array.isArray(rows) ? rows[0] : rows);
  }

  // DELETE: remove alert by id
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Alert id required' });

    await supabaseRequest(
      `alerts?id=eq.${encodeURIComponent(id)}&user_email=eq.${encodeURIComponent(email)}`,
      { method: 'DELETE' }
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

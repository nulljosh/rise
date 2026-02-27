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

  // GET: list watchlist
  if (req.method === 'GET') {
    const rows = await supabaseRequest(`watchlists?user_email=eq.${encodeURIComponent(email)}&select=symbol,added_at&order=added_at.asc`);
    return res.status(200).json(rows || []);
  }

  // POST: add symbol
  if (req.method === 'POST') {
    const { symbol } = req.body || {};
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    try {
      const rows = await supabaseRequest('watchlists', {
        method: 'POST',
        body: { user_email: email, symbol: symbol.toUpperCase().trim() },
      });
      return res.status(201).json(Array.isArray(rows) ? rows[0] : rows);
    } catch (err) {
      if (err.status === 409 || (err.message && err.message.includes('duplicate'))) {
        return res.status(409).json({ error: 'Symbol already in watchlist' });
      }
      throw err;
    }
  }

  // DELETE: remove symbol
  if (req.method === 'DELETE') {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    await supabaseRequest(
      `watchlists?user_email=eq.${encodeURIComponent(email)}&symbol=eq.${encodeURIComponent(symbol.toUpperCase())}`,
      { method: 'DELETE' }
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

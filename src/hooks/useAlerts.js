import { useState, useEffect, useCallback, useRef } from 'react';

export function useAlerts(authUser) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (!authUser?.email || fetched.current) return;
    fetched.current = true;
    setLoading(true);
    fetch('/api/alerts', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(rows => setAlerts(Array.isArray(rows) ? rows : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authUser?.email]);

  const createAlert = useCallback(async ({ symbol, target_price, direction }) => {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, target_price, direction }),
    });
    if (!res.ok) return null;
    const alert = await res.json();
    setAlerts(prev => [alert, ...prev]);
    return alert;
  }, []);

  const deleteAlert = useCallback(async (id) => {
    await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return { alerts, loading, createAlert, deleteAlert };
}

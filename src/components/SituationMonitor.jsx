import { useEffect, useRef } from 'react';
import { useSituation } from '../hooks/useSituation';
import { Card, BlinkingDot } from './ui';

function CongestionBar({ value, t, font }) {
  const pct = value === 'heavy' ? 85 : value === 'moderate' ? 55 : value === 'clear' ? 15 : 0;
  const color = pct > 70 ? t.red : pct > 40 ? t.yellow : t.green;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: t.border, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 10, color, fontFamily: font, fontWeight: 700, minWidth: 48, textTransform: 'capitalize' }}>
        {value ?? 'unknown'}
      </span>
    </div>
  );
}

export default function SituationMonitor({ dark, t, font }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const {
    activeCenter, selectedCity, setSelectedCity,
    worldCities, userLocation,
    flights, traffic, flightsLoading, trafficLoading, flightsError, trafficError,
    incidents, earthquakes, events, weatherAlerts,
  } = useSituation();

  // Initialize MapLibre
  useEffect(() => {
    let map;
    (async () => {
      try {
        const maplibregl = (await import('maplibre-gl')).default;
        await import('maplibre-gl/dist/maplibre-gl.css');
        if (!mapRef.current || mapInstanceRef.current) return;
        map = new maplibregl.Map({
          container: mapRef.current,
          style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
          center: [activeCenter.lon, activeCenter.lat],
          zoom: 8,
          attributionControl: false,
        });
        mapInstanceRef.current = map;
        map.addControl(new maplibregl.AttributionControl({ compact: true }));
      } catch (err) {
        console.warn('MapLibre init failed:', err.message);
      }
    })();
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to active center
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({ center: [activeCenter.lon, activeCenter.lat], zoom: 8, duration: 1200 });
  }, [activeCenter.lat, activeCenter.lon]);

  // Update all markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    (async () => {
      try {
        const maplibregl = (await import('maplibre-gl')).default;

        // Flights — cyan dots
        flights.slice(0, 50).forEach(f => {
          if (f.lon == null || f.lat == null) return;
          const el = Object.assign(document.createElement('div'), {});
          el.style.cssText = 'width:6px;height:6px;border-radius:50%;background:#64D2FF;opacity:0.85;';
          markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([f.lon, f.lat]).addTo(mapInstanceRef.current));
        });

        // Incidents — orange dots
        incidents.forEach(inc => {
          if (inc.lon == null || inc.lat == null) return;
          const el = Object.assign(document.createElement('div'), {});
          el.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#FF9500;opacity:0.9;cursor:pointer;';
          el.title = inc.description || inc.type;
          markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([inc.lon, inc.lat]).addTo(mapInstanceRef.current));
        });

        // Earthquakes — red dots, size by magnitude
        earthquakes.forEach(eq => {
          if (eq.lon == null || eq.lat == null) return;
          const size = Math.max(6, Math.min(20, eq.mag * 3));
          const el = Object.assign(document.createElement('div'), {});
          el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:#FF3B30;opacity:0.75;cursor:pointer;border:1px solid rgba(255,59,48,0.5);`;
          el.title = `M${eq.mag} — ${eq.place}`;
          markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([eq.lon, eq.lat]).addTo(mapInstanceRef.current));
        });
      } catch { /* ignore maplibre errors */ }
    })();
  }, [flights, incidents, earthquakes]);

  const nearbyFlights = flights.slice(0, 6);
  const congestion = traffic?.flow?.congestion ?? null;
  const cityList = userLocation
    ? [{ id: 'me', label: userLocation.city, lat: userLocation.lat, lon: userLocation.lon }, ...worldCities]
    : worldCities;

  return (
    <Card dark={dark} t={t} style={{ padding: '16px 20px' }}>
      {/* Weather alert banner */}
      {weatherAlerts.length > 0 && (
        <div style={{
          background: `${t.yellow}18`, border: `1px solid ${t.yellow}40`,
          borderRadius: 8, padding: '6px 12px', marginBottom: 10,
          fontSize: 10, color: t.yellow, fontFamily: font, lineHeight: 1.5,
        }}>
          {weatherAlerts[0].headline || `${weatherAlerts[0].event} — ${weatherAlerts[0].source}`}
          {weatherAlerts.length > 1 && <span style={{ color: t.textTertiary }}> +{weatherAlerts.length - 1} more</span>}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BlinkingDot color={t.cyan} speed={3} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text, fontFamily: font }}>
            Situation Monitor
          </span>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {cityList.slice(0, 7).map(city => {
            const isSelected = selectedCity
              ? selectedCity.id === city.id
              : city.id === 'me' ? !!userLocation : !userLocation && city.id === worldCities[0].id;
            return (
              <button key={city.id} onClick={() => setSelectedCity(city.id === 'me' ? null : city)} style={{
                padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                border: isSelected ? `1.5px solid ${t.cyan}` : `1px solid ${t.border}`,
                background: isSelected ? `${t.cyan}18` : 'transparent',
                color: isSelected ? t.cyan : t.textTertiary,
                cursor: 'pointer', fontFamily: font,
              }}>
                {city.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{
        width: '100%', height: 260, borderRadius: 12, overflow: 'hidden', marginBottom: 14,
        background: '#1a1a2e', border: `1px solid ${t.border}`, position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: font, pointerEvents: 'none', zIndex: 0,
        }}>
          {activeCenter.lat.toFixed(4)}, {activeCenter.lon.toFixed(4)}
        </div>
      </div>

      {/* Flights + Traffic */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, fontFamily: font, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Flights nearby {flightsLoading && <span style={{ color: t.textTertiary }}>(updating...)</span>}
          </div>
          {flightsError && <div style={{ fontSize: 10, color: t.red, fontFamily: font }}>{flightsError}</div>}
          {nearbyFlights.length === 0 && !flightsLoading && (
            <div style={{ fontSize: 10, color: t.textTertiary, fontFamily: font }}>No flights tracked</div>
          )}
          {nearbyFlights.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: `1px solid ${t.border}`, fontSize: 10 }}>
              <span style={{ fontWeight: 700, color: t.cyan, fontFamily: font }}>{f.callsign || f.icao24}</span>
              <span style={{ color: t.textTertiary, fontFamily: font }}>{f.altitude ? `FL${Math.round(f.altitude / 100)}` : '—'}</span>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, fontFamily: font, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Traffic {trafficLoading && <span style={{ color: t.textTertiary }}>(loading...)</span>}
          </div>
          {trafficError && <div style={{ fontSize: 10, color: t.red, fontFamily: font }}>{trafficError}</div>}
          {congestion !== null && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: t.textTertiary, fontFamily: font, marginBottom: 4 }}>Congestion</div>
              <CongestionBar value={congestion} t={t} font={font} />
              {traffic?.flow?.source === 'estimated'
                ? <div style={{ fontSize: 9, color: t.textTertiary, fontFamily: font, marginTop: 4, fontStyle: 'italic' }}>EST</div>
                : traffic?.flow?.currentSpeed != null && (
                  <div style={{ fontSize: 9, color: t.textTertiary, fontFamily: font, marginTop: 4 }}>
                    {traffic.flow.currentSpeed} / {traffic.flow.freeFlowSpeed} km/h
                  </div>
                )
              }
            </div>
          )}
          {(traffic?.incidents ?? []).slice(0, 3).map((inc, i) => (
            <div key={i} style={{ fontSize: 9, color: t.textTertiary, fontFamily: font, padding: '2px 0' }}>
              {inc.type}: {inc.description || 'No details'}
            </div>
          ))}
        </div>
      </div>

      {/* Earthquakes (significant only, M4+) */}
      {earthquakes.filter(e => e.mag >= 4).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.red, fontFamily: font, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Seismic ({earthquakes.filter(e => e.mag >= 4).length} M4+)
          </div>
          {earthquakes.filter(e => e.mag >= 4).slice(0, 4).map((eq, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 10, padding: '2px 0', fontFamily: font }}>
              <span style={{ color: eq.mag >= 6 ? t.red : t.yellow, fontWeight: 700, minWidth: 28 }}>M{eq.mag.toFixed(1)}</span>
              <span style={{ color: t.textSecondary }}>{eq.place}</span>
            </div>
          ))}
        </div>
      )}

      {/* Global events panel */}
      {events.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, fontFamily: font, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Global Events
          </div>
          <div style={{ maxHeight: 100, overflowY: 'auto' }}>
            {events.slice(0, 6).map((ev, i) => (
              <div key={i} style={{ fontSize: 9, color: t.textTertiary, fontFamily: font, padding: '2px 0', borderBottom: `1px solid ${t.border}`, lineHeight: 1.4 }}>
                <span style={{ color: t.textSecondary }}>{ev.country ? `[${ev.country}] ` : ''}</span>
                {ev.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

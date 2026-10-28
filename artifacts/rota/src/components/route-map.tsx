import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "@workspace/api-client-react";

type Props = { origin: Place | null; destination: Place | null; coordinates: number[][] | null };

const pin = (letter: string, bg: string, fg: string) =>
  L.divIcon({
    className: "",
    html: `<div class="rota-pin" style="background:${bg};color:${fg}"><span>${letter}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

export function RouteMap({ origin, destination, coordinates }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([-23.5505, -46.6333], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>',
    }).addTo(m);
    m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts: L.LatLngExpression[] = [];
    if (coordinates && coordinates.length > 1) {
      const line = coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
      L.polyline(line, { color: "hsl(200 38% 14%)", weight: 9, opacity: 0.25 }).addTo(g);
      L.polyline(line, { color: "hsl(196 62% 22%)", weight: 5 }).addTo(g);
      L.polyline(line, { color: "hsl(38 92% 52%)", weight: 1.5, dashArray: "6 8" }).addTo(g);
      pts.push(...line);
    }
    if (origin) { L.marker([origin.lat, origin.lon], { icon: pin("A", "hsl(196 62% 22%)", "hsl(44 50% 97%)"), title: origin.label }).addTo(g); pts.push([origin.lat, origin.lon]); }
    if (destination) { L.marker([destination.lat, destination.lon], { icon: pin("B", "hsl(38 92% 52%)", "hsl(200 38% 12%)"), title: destination.label }).addTo(g); pts.push([destination.lat, destination.lon]); }
    if (pts.length === 1) m.flyTo(pts[0], 13, { duration: 0.8 });
    else if (pts.length > 1) m.flyToBounds(L.latLngBounds(pts), { padding: [40, 40], duration: 0.9 });
  }, [origin, destination, coordinates]);

  return <div ref={el} className="h-full w-full" data-testid="map-route" aria-label="Mapa da rota" role="region" />;
}

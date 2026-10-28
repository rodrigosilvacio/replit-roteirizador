import { Router, type IRouter } from "express";
import { SearchPlacesQueryParams, SearchPlacesResponse, CalculateRouteBody, CalculateRouteResponse } from "@workspace/api-zod";
import { optimizeOrder } from "../lib/route-optimizer";
import { instruction } from "../lib/directions";

const router: IRouter = Router();
const cache = new Map<string, { expires: number; data: unknown }>();

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "RotaRoutePlanner/1.0", Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
  return response.json();
}

router.get("/places", async (req, res) => {
  const parsed = SearchPlacesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Digite um endereço com pelo menos 3 caracteres." });
    return;
  }
  const q = parsed.data.q.trim();
  const key = q.toLocaleLowerCase("pt-BR");
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    res.json(cached.data);
    return;
  }
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "6");
    const result = await getJson(url.toString());
    const places = SearchPlacesResponse.parse(result.features.map((feature: any) => {
      const p = feature.properties;
      const street = [p.street, p.housenumber].filter(Boolean).join(", ");
      const parts = [p.name, street, p.district, p.city || p.county, p.state, p.country].filter(Boolean);
      return {
        label: [...new Set(parts)].join(", "),
        lon: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1],
      };
    }));
    if (cache.size > 300) cache.clear();
    cache.set(key, { data: places, expires: Date.now() + 300000 });
    res.json(places);
  } catch {
    req.log.warn("Address provider unavailable");
    res.status(503).json({ error: "A busca de endereços está indisponível. Tente novamente em instantes." });
  }
});

router.post("/route", async (req, res) => {
  const parsed = CalculateRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Selecione uma origem e um destino válidos." });
    return;
  }
  const { origin, destination, stops = [], optimize = false } = parsed.data;
  const places = [origin, ...stops, destination];
  if (places.every(p => p.lat === origin.lat && p.lon === origin.lon)) {
    res.status(400).json({ error: "Inclua pelo menos dois locais diferentes para calcular o trajeto." });
    return;
  }
  try {
    const base = "https://routing.openstreetmap.de/routed-car";
    const coords = (points: typeof places) => points.map(p => `${p.lon},${p.lat}`).join(";");
    const getRoute = async (points: typeof places) => {
      const result = await getJson(`${base}/route/v1/driving/${coords(points)}?overview=full&geometries=geojson&steps=true&continue_straight=false`);
      if (result.code !== "Ok" || !result.routes?.length) throw new Error("NO_ROUTE");
      const r = result.routes[0];
      if (r.legs?.length !== points.length - 1 || !Number.isFinite(r.duration) || r.duration < 0 ||
          !Number.isFinite(r.distance) || r.distance < 0 || r.geometry?.coordinates?.length < 2)
        throw new Error("Invalid provider route");
      return r;
    };
    const original = await getRoute(places);
    let route = original;
    let orderedPlaces = places;
    if (optimize && stops.length >= 2) {
      const table = await getJson(`${base}/table/v1/driving/${coords(places)}?annotations=duration`);
      if (table.code !== "Ok" || !Array.isArray(table.durations)) throw new Error("Invalid provider matrix");
      const order = optimizeOrder(table.durations);
      if (order.some((value, i) => value !== i)) {
        const candidatePlaces = order.map(i => places[i]);
        const candidate = await getRoute(candidatePlaces);
        // Full route may differ from pairwise matrix due to road maneuvers.
        // Only claim improvement after measuring both full routes.
        if (candidate.duration < original.duration) {
          route = candidate;
          orderedPlaces = candidatePlaces;
        }
      }
    }
    res.json(CalculateRouteResponse.parse({
      distance: route.distance,
      duration: route.duration,
      coordinates: route.geometry.coordinates,
      orderedPlaces,
      originalDistance: original.distance,
      originalDuration: original.duration,
      improved: route.duration < original.duration,
      legs: route.legs.map((leg: any) => ({
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps.map((step: any) => ({
          instruction: instruction(step),
          distance: step.distance,
        })),
      })),
    }));
  } catch (err) {
    if (err instanceof Error && err.message === "NO_ROUTE") {
      res.status(422).json({ error: "Não há rota de carro passando por todas as paradas. Confira os endereços." });
      return;
    }
    req.log.warn("Routing provider unavailable");
    res.status(503).json({ error: "O serviço de rotas está indisponível. Tente novamente em instantes." });
  }
});

export default router;

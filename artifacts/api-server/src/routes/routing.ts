import { Router, type IRouter } from "express";
import { SearchPlacesQueryParams, SearchPlacesResponse, CalculateRouteBody, CalculateRouteResponse } from "@workspace/api-zod";

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
  const { origin, destination } = parsed.data;
  if (origin.lat === destination.lat && origin.lon === destination.lon) {
    res.status(400).json({ error: "Escolha um destino diferente da origem." });
    return;
  }
  try {
    const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const result = await getJson(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`);
    if (result.code !== "Ok" || !result.routes?.length) {
      res.status(422).json({ error: "Não foi encontrada uma rota de carro entre esses locais." });
      return;
    }
    const route = result.routes[0];
    res.json(CalculateRouteResponse.parse({
      distance: route.distance,
      duration: route.duration,
      coordinates: route.geometry.coordinates,
    }));
  } catch {
    req.log.warn("Routing provider unavailable");
    res.status(503).json({ error: "O serviço de rotas está indisponível. Tente novamente em instantes." });
  }
});

export default router;

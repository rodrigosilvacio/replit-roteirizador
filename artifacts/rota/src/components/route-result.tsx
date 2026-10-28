import type { Place, RouteResult } from "@workspace/api-client-react";
import { ExternalLink, TrendingDown } from "lucide-react";

export function fmtDistance(m: number) {
  if (m < 1000) return { v: String(Math.round(m)), u: "m" };
  return { v: (m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: m < 100000 ? 1 : 0 }), u: "km" };
}
export function fmtDuration(s: number) {
  const min = Math.max(1, Math.round(s / 60));
  const h = Math.floor(min / 60), r = min % 60;
  return h ? `${h} h ${String(r).padStart(2, "0")} min` : `${min} min`;
}

/** Labels for points in order: A for origin, 1..n for stops, B for final. */
export function pointLabel(i: number, total: number) {
  if (i === 0) return "A";
  if (i === total - 1) return "B";
  return String(i);
}

export type MapsChunk = { from: number; to: number; url: string };

/** Splits sequential points into Google Maps links with at most 3 intermediate waypoints each; chunk endpoints overlap. */
export function buildMapsChunks(points: Place[]): MapsChunk[] {
  const out: MapsChunk[] = [];
  const ll = (p: Place) => `${p.lat},${p.lon}`;
  for (let s = 0; s < points.length - 1; s += 4) {
    const e = Math.min(s + 4, points.length - 1);
    const mids = points.slice(s + 1, e);
    let url = `https://www.google.com/maps/dir/?api=1&origin=${ll(points[s])}&destination=${ll(points[e])}&travelmode=driving`;
    if (mids.length) url += `&waypoints=${encodeURIComponent(mids.map(ll).join("|"))}`;
    out.push({ from: s, to: e, url });
  }
  return out;
}

type Props = { result: RouteResult; optimized: boolean; roundTrip: boolean };

export function RouteResultCard({ result, optimized, roundTrip }: Props) {
  const pts = result.orderedPlaces;
  const n = pts.length;
  const dist = fmtDistance(result.distance);
  const chunks = buildMapsChunks(pts);
  const hasStops = n > 2;
  const savedDist = result.originalDistance - result.distance;
  const savedTime = result.originalDuration - result.duration;
  const lbl = (i: number) => pointLabel(i, n);

  return (
    <div className="rise space-y-3" data-testid="card-result">
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <div className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">Distância{optimized ? " · otimizada" : ""}</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight" data-testid="text-distance">{dist.v}<span className="ml-1 text-base font-medium opacity-70">{dist.u}</span></p>
        </div>
        <div className="border-l border-primary-foreground/15 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">Tempo estimado</p>
          <p className="mt-1 text-2xl font-extrabold leading-[2.5rem] tracking-tight text-accent" data-testid="text-duration">{fmtDuration(result.duration)}</p>
        </div>
      </div>

      {optimized && hasStops && (
        result.improved ? (
          <div className="rounded-2xl border border-accent/50 bg-accent/10 p-4" data-testid="card-savings">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground"><TrendingDown className="h-3.5 w-3.5 text-accent" /> Ordem reorganizada</p>
            <p className="mt-2 text-sm">
              Economia de <strong data-testid="text-saved-time">{savedTime < 60 ? "menos de 1 min" : fmtDuration(savedTime)}</strong>
              {savedDist > 0 && <> e <strong data-testid="text-saved-distance">{fmtDistance(savedDist).v} {fmtDistance(savedDist).u}</strong></>} em relação à ordem digitada.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="rounded-lg bg-card/70 p-2"><dt className="text-muted-foreground">ordem original</dt><dd className="mt-0.5 line-through decoration-destructive/60" data-testid="text-original-metrics">{fmtDistance(result.originalDistance).v} {fmtDistance(result.originalDistance).u} · {fmtDuration(result.originalDuration)}</dd></div>
              <div className="rounded-lg bg-card p-2"><dt className="text-muted-foreground">ordem escolhida</dt><dd className="mt-0.5 font-semibold text-primary" data-testid="text-chosen-metrics">{dist.v} {dist.u} · {fmtDuration(result.duration)}</dd></div>
            </dl>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-input p-3 text-[13px] text-muted-foreground" data-testid="text-no-gain">
            Não encontramos redução no tempo estimado. Mantivemos a sequência original.
          </p>
        )
      )}

      {hasStops && (
        <div className="rounded-2xl border border-card-border bg-card/80 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Itinerário · {n - 2} parada{n - 2 > 1 ? "s" : ""}</p>
          <ol className="relative mt-3 space-y-2.5" data-testid="list-itinerary">
            <span className="road-dash pointer-events-none absolute bottom-3 left-[13px] top-3 w-[2px] opacity-60" aria-hidden />
            {pts.map((p, i) => {
              const l = lbl(i);
              const kind = i === 0 ? "origin" : i === n - 1 ? "dest" : "stop";
              return (
                <li key={i} className="relative flex items-start gap-3 text-sm" data-testid={`row-itinerary-${i}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold ${kind === "origin" ? "bg-primary text-primary-foreground" : kind === "dest" ? "bg-accent text-accent-foreground" : "border-2 border-primary bg-card text-primary"}`}>{l}</span>
                  <span className="pt-1 leading-snug">
                    {p.label}
                    {kind === "dest" && roundTrip && <span className="ml-1 font-mono text-[10px] uppercase text-muted-foreground">retorno</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {chunks.length === 1 ? (
        <a href={chunks[0].url} target="_blank" rel="noopener noreferrer" data-testid="link-google-maps"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-foreground transition hover:brightness-105 active:scale-[0.98]">
          Abrir no Google Maps <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <div className="rounded-2xl border border-card-border bg-card/80 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Google Maps em {chunks.length} trechos</p>
          <p className="mt-1 text-[12px] text-muted-foreground">O app do celular aceita poucas paradas por vez. Abra cada trecho ao terminar o anterior.</p>
          <div className="mt-3 space-y-2">
            {chunks.map((c, k) => (
              <a key={k} href={c.url} target="_blank" rel="noopener noreferrer" data-testid={`link-google-maps-${k}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-accent px-4 py-3 text-accent-foreground transition hover:brightness-105 active:scale-[0.98]">
                <span className="text-sm font-semibold">Trecho {k + 1}<span className="ml-2 font-mono text-[11px] font-medium opacity-80">{lbl(c.from)} → {lbl(c.to)}</span></span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

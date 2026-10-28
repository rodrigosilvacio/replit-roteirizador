import { useMemo, useRef, useState } from "react";
import { useCalculateRoute } from "@workspace/api-client-react";
import type { Place, RouteResult } from "@workspace/api-client-react";
import { ArrowDown, ArrowUp, ArrowUpDown, Crosshair, Info, Landmark, Loader2, Navigation, Plus, RotateCcw, Sparkles, Trash2, TriangleAlert, Waves } from "lucide-react";
import { PlaceInput } from "@/components/place-input";
import { RouteMap, type MapPoint } from "@/components/route-map";
import { RouteResultCard, pointLabel } from "@/components/route-result";
import { RouteDirections } from "@/components/route-directions";

const MAX_STOPS = 10;
const EXAMPLE_ORIGIN: Place = { label: "Praça da Sé, São Paulo - SP", lat: -23.5503, lon: -46.6339 };
const EXAMPLE_DEST: Place = { label: "Orla do Gonzaga, Santos - SP", lat: -23.9675, lon: -46.3336 };

// Deliberately zig-zagging order across the city
const TOUR_ORIGIN: Place = { label: "Praça da Sé, São Paulo - SP", lat: -23.5503, lon: -46.6339 };
const TOUR_STOPS: Place[] = [
  { label: "Parque Ibirapuera, São Paulo - SP", lat: -23.5874, lon: -46.6576 },
  { label: "Mercado Municipal de São Paulo - SP", lat: -23.5417, lon: -46.6297 },
  { label: "MASP, Avenida Paulista - SP", lat: -23.5614, lon: -46.6559 },
  { label: "Estação da Luz, São Paulo - SP", lat: -23.5347, lon: -46.6355 },
  { label: "Beco do Batman, Vila Madalena - SP", lat: -23.5565, lon: -46.6863 },
];
const TOUR_DEST: Place = { label: "Theatro Municipal, São Paulo - SP", lat: -23.5452, lon: -46.6384 };

type Stop = { id: string; text: string; place: Place | null };
type Done = { r: RouteResult; optimize: boolean; roundTrip: boolean };

let seq = 0;
const newStop = (place: Place | null = null): Stop => ({ id: `s${++seq}`, text: place?.label ?? "", place });

function errMsg(e: unknown) {
  const d = (e as { data?: unknown })?.data;
  if (d && typeof d === "object" && typeof (d as { error?: unknown }).error === "string") return (d as { error: string }).error;
  return "Não foi possível calcular a rota. Verifique se há caminho de carro entre os pontos ou tente novamente — o serviço público de rotas pode estar indisponível.";
}

export default function Home() {
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [roundTrip, setRoundTrip] = useState(false);
  const [result, setResult] = useState<Done | null>(null);
  const [error, setError] = useState<{ msg: string; optimize: boolean } | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [pending, setPending] = useState<null | "original" | "optimize">(null);
  const reqId = useRef(0);
  const calc = useCalculateRoute();

  const invalidate = () => { reqId.current++; setResult(null); setError(null); setPending(null); setGeoBusy(false); };

  const finalDest = roundTrip ? origin : dest;
  const filled = stops.filter((s) => s.text.trim() || s.place);
  const unconfirmed = filled.some((s) => !s.place);
  const ready = !!origin && !!finalDest && !unconfirmed;

  const run = async (o: Place, d: Place, st: Place[], optimize: boolean, rt: boolean) => {
    const id = ++reqId.current;
    setPending(optimize ? "optimize" : "original"); setError(null); setResult(null);
    try {
      const r = await calc.mutateAsync({ data: { origin: o, destination: d, stops: st, optimize } });
      if (id !== reqId.current) return;
      if (!r.coordinates?.length) throw new Error("empty");
      setResult({ r, optimize, roundTrip: rt });
    } catch (e) {
      if (id !== reqId.current) return;
      setError({ msg: errMsg(e), optimize });
    } finally {
      if (id === reqId.current) setPending(null);
    }
  };
  const go = (optimize: boolean) => {
    if (!origin || !finalDest || unconfirmed) return;
    void run(origin, finalDest, filled.map((s) => s.place!), optimize, roundTrip);
  };

  const editStop = (id: string, patch: Partial<Stop>) => { invalidate(); setStops((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s))); };
  const removeStop = (id: string) => { invalidate(); setStops((ss) => ss.filter((s) => s.id !== id)); };
  const moveStop = (i: number, dir: -1 | 1) => {
    invalidate();
    setStops((ss) => { const n = [...ss]; const j = i + dir; if (j < 0 || j >= n.length) return ss; [n[i], n[j]] = [n[j], n[i]]; return n; });
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-testid="button-stop-${dir < 0 ? "up" : "down"}-${stops[i].id}"]`)?.focus());
  };
  const addStop = () => { if (stops.length >= MAX_STOPS) return; invalidate(); const s = newStop(); setStops((ss) => [...ss, s]); requestAnimationFrame(() => document.getElementById(`stop-${s.id}`)?.focus()); };

  const swap = () => {
    if (roundTrip) return;
    invalidate();
    setOriginText(destText); setDestText(originText);
    setOrigin(dest); setDest(origin);
  };
  const reset = () => {
    invalidate();
    setOriginText(""); setDestText(""); setOrigin(null); setDest(null); setGeoMsg(null); setStops([]); setRoundTrip(false);
  };
  const example = () => {
    invalidate(); setGeoMsg(null);
    setOriginText(EXAMPLE_ORIGIN.label); setDestText(EXAMPLE_DEST.label);
    setOrigin(EXAMPLE_ORIGIN); setDest(EXAMPLE_DEST); setStops([]); setRoundTrip(false);
    void run(EXAMPLE_ORIGIN, EXAMPLE_DEST, [], false, false);
  };
  const tour = () => {
    invalidate(); setGeoMsg(null);
    setOriginText(TOUR_ORIGIN.label); setDestText(TOUR_DEST.label);
    setOrigin(TOUR_ORIGIN); setDest(TOUR_DEST); setStops(TOUR_STOPS.map((p) => newStop(p))); setRoundTrip(false);
    void run(TOUR_ORIGIN, TOUR_DEST, TOUR_STOPS, true, false);
  };
  const locate = () => {
    setGeoMsg(null);
    if (!("geolocation" in navigator)) { setGeoMsg("Seu navegador não oferece localização."); return; }
    invalidate();
    setGeoBusy(true);
    const id = reqId.current;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (id !== reqId.current) return;
        setGeoBusy(false);
        const p: Place = { label: "Minha localização atual", lat: pos.coords.latitude, lon: pos.coords.longitude };
        setResult(null); setError(null);
        setOriginText(p.label); setOrigin(p);
      },
      (err) => {
        if (id !== reqId.current) return;
        setGeoBusy(false);
        setGeoMsg(err.code === err.PERMISSION_DENIED ? "Permissão de localização negada. Digite o endereço de partida." : "Não conseguimos obter sua localização agora.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const points: MapPoint[] = useMemo(() => {
    if (result) {
      const op = result.r.orderedPlaces;
      return op.map((p, i) => ({ place: p, label: pointLabel(i, op.length), kind: i === 0 ? "origin" : i === op.length - 1 ? "dest" : "stop" }));
    }
    const out: MapPoint[] = [];
    if (origin) out.push({ place: origin, label: "A", kind: "origin" });
    stops.forEach((s, i) => { if (s.place) out.push({ place: s.place, label: String(i + 1), kind: "stop" }); });
    if (finalDest && !roundTrip) out.push({ place: finalDest, label: "B", kind: "dest" });
    return out;
  }, [result, origin, stops, finalDest, roundTrip]);

  const hint = !origin || !finalDest
    ? "Escolha um endereço da lista em cada campo para liberar o cálculo."
    : unconfirmed ? "Confirme cada parada escolhendo um endereço da lista, ou remova as vazias." : null;
  const canOptimize = ready && filled.length >= 2;

  return (
    <div className="grain min-h-[100dvh] bg-background">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col md:flex-row">
        <aside className="relative z-10 flex w-full flex-col md:w-[440px] md:shrink-0 md:border-r md:border-border">
          <header className="rise flex items-end justify-between px-5 pb-4 pt-6 md:px-7 md:pt-9">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Planejador de trajetos</p>
              <h1 className="mt-1 text-[44px] font-extrabold leading-none tracking-[-0.04em] text-primary">
                Rota<span className="text-accent">.</span>
              </h1>
            </div>
            <p className="max-w-[170px] text-right text-[13px] leading-snug text-muted-foreground">Até dez paradas. Uma ordem que faz sentido.</p>
          </header>

          <section className="rise px-5 md:px-7" style={{ animationDelay: "80ms" }}>
            <div className="relative rounded-2xl border border-card-border bg-card/80 p-4 shadow-[0_10px_30px_-18px_hsl(200_38%_14%/0.4)] backdrop-blur">
              <div className="space-y-3">
                <PlaceInput id="origin" label="Partida" marker="A" value={originText} selected={origin}
                  onTextChange={(t) => { invalidate(); setOriginText(t); setOrigin(null); }}
                  onSelect={(p) => { invalidate(); setOrigin(p); setOriginText(p.label); }} />
                <div className="relative flex items-center justify-end gap-2">
                  <button type="button" onClick={locate} disabled={geoBusy} data-testid="button-geolocate"
                    className="mr-auto ml-10 inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[11px] text-primary transition hover:bg-secondary disabled:opacity-60">
                    {geoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
                    usar minha localização
                  </button>
                  <button type="button" onClick={swap} disabled={roundTrip} aria-label="Inverter partida e destino" data-testid="button-swap"
                    className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-primary transition-transform duration-300 hover:rotate-180 hover:border-accent active:scale-90 disabled:pointer-events-none disabled:opacity-40">
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </div>

                {stops.length > 0 && (
                  <ol className="space-y-3 border-l-2 border-dashed border-accent/60 pl-3" aria-label="Paradas intermediárias" data-testid="list-stops">
                    {stops.map((s, i) => (
                      <li key={s.id} className="flex items-end gap-1.5" data-testid={`row-stop-${s.id}`}>
                        <div className="min-w-0 flex-1">
                          <PlaceInput id={`stop-${s.id}`} label={`Parada ${i + 1}`} marker={String(i + 1)} tone="stop" placeholder="Endereço da parada"
                            value={s.text} selected={s.place}
                            onTextChange={(t) => editStop(s.id, { text: t, place: null })}
                            onSelect={(p) => editStop(s.id, { text: p.label, place: p })} />
                        </div>
                        <div className="flex h-12 shrink-0 items-center gap-0.5">
                          <button type="button" onClick={() => moveStop(i, -1)} disabled={i === 0} aria-label={`Mover parada ${i + 1} para cima`} data-testid={`button-stop-up-${s.id}`}
                            className="grid h-8 w-7 place-items-center rounded-md text-primary transition hover:bg-secondary disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                          <button type="button" onClick={() => moveStop(i, 1)} disabled={i === stops.length - 1} aria-label={`Mover parada ${i + 1} para baixo`} data-testid={`button-stop-down-${s.id}`}
                            className="grid h-8 w-7 place-items-center rounded-md text-primary transition hover:bg-secondary disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                          <button type="button" onClick={() => removeStop(s.id)} aria-label={`Remover parada ${i + 1}`} data-testid={`button-stop-remove-${s.id}`}
                            className="grid h-8 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                <button type="button" onClick={addStop} disabled={stops.length >= MAX_STOPS} data-testid="button-add-stop"
                  className="flex w-full items-center justify-between rounded-xl border border-dashed border-input px-3 py-2 text-sm text-primary transition hover:border-accent hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50">
                  <span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> {stops.length >= MAX_STOPS ? "Limite de paradas atingido" : "Adicionar parada"}</span>
                  <span className="font-mono text-[11px] text-muted-foreground" data-testid="text-stop-count">{stops.length}/{MAX_STOPS}</span>
                </button>

                {roundTrip ? (
                  <div className="rounded-xl border border-primary/30 bg-secondary/60 px-3 py-3 text-sm" data-testid="text-roundtrip-dest">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Destino</p>
                    <p className="mt-1 flex items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent font-mono text-xs font-semibold text-accent-foreground">B</span>
                      {origin ? <>Volta à partida · <span className="truncate text-muted-foreground">{origin.label}</span></> : <span className="text-muted-foreground">Volta à partida (escolha a partida)</span>}</p>
                  </div>
                ) : (
                  <PlaceInput id="destination" label="Destino" marker="B" value={destText} selected={dest}
                    onTextChange={(t) => { invalidate(); setDestText(t); setDest(null); }}
                    onSelect={(p) => { invalidate(); setDest(p); setDestText(p.label); }} />
                )}
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={roundTrip} data-testid="checkbox-roundtrip"
                    onChange={(e) => { invalidate(); setRoundTrip(e.target.checked); }}
                    className="h-4 w-4 accent-[hsl(var(--primary))]" />
                  Voltar ao ponto de partida
                </label>
              </div>
              {geoMsg && <p className="mt-3 text-xs text-destructive" data-testid="text-geo-error">{geoMsg}</p>}

              <div className="mt-4 flex gap-2">
                <button type="button" disabled={!ready || !!pending} onClick={() => go(false)} data-testid="button-calculate"
                  className="relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
                  {pending === "original" ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculando</> : <><Navigation className="h-4 w-4" /> {filled.length ? "Na ordem digitada" : "Traçar rota"}</>}
                  {pending === "original" && <span className="sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />}
                </button>
                <button type="button" onClick={reset} aria-label="Limpar tudo" data-testid="button-reset"
                  className="grid h-12 w-12 place-items-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground active:scale-95">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              {filled.length >= 1 && (
                <button type="button" disabled={!canOptimize || !!pending} onClick={() => go(true)} data-testid="button-optimize"
                  className="relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent text-sm font-semibold text-accent-foreground transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
                  {pending === "optimize" ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando a melhor ordem</> : <><Sparkles className="h-4 w-4" /> Otimizar por tempo</>}
                  {pending === "optimize" && <span className="sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/25 to-transparent" />}
                </button>
              )}
              {hint ? <p className="mt-2 text-[12px] text-muted-foreground">{hint}</p>
                : filled.length === 1 ? <p className="mt-2 text-[12px] text-muted-foreground">Com uma parada só não há ordem a otimizar. Adicione outra.</p> : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              <button type="button" onClick={tour} data-testid="button-example-tour"
                className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-input px-4 py-3 text-left transition hover:border-accent hover:bg-card">
                <Landmark className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
                <span className="text-sm"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Exemplo · 5 paradas</span><br />Centro, Paulista e Ibirapuera fora de ordem</span>
              </button>
              <button type="button" onClick={example} data-testid="button-example"
                className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-input px-4 py-3 text-left transition hover:border-accent hover:bg-card">
                <Waves className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
                <span className="text-sm"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Exemplo</span><br />São Paulo → Santos, descendo a serra</span>
              </button>
            </div>
          </section>

          <section className="px-5 pt-4 md:px-7" aria-live="polite">
            {pending && (
              <div className="space-y-3" data-testid="status-calculating">
                <div className="grid grid-cols-2 gap-3">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>
                {filled.length > 0 && <div className="h-32 animate-pulse rounded-2xl bg-muted" />}
              </div>
            )}
            {error && (
              <div className="rise flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm" data-testid="text-route-error">
                <TriangleAlert className="h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p>{error.msg}</p>
                  {ready && <button type="button" onClick={() => go(error.optimize)} data-testid="button-retry-route" className="mt-2 font-semibold text-primary underline underline-offset-4">Tentar de novo</button>}
                </div>
              </div>
            )}
            {result && <RouteResultCard result={result.r} optimized={result.optimize} roundTrip={result.roundTrip} />}
            <p className="mt-4 flex gap-2 pb-5 text-[12px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              O tempo é estimado sem trânsito em tempo real. Busca e rotas usam serviços públicos de mapas, que às vezes ficam indisponíveis.
            </p>
          </section>
        </aside>

        <main className="relative min-w-0 w-full p-3 pt-0 md:flex-1 md:self-start md:p-4">
          <div className="relative h-[62dvh] min-h-[360px] overflow-hidden rounded-2xl border border-border shadow-[0_20px_50px_-25px_hsl(200_38%_14%/0.5)] md:h-[65dvh]">
            <RouteMap points={points} coordinates={result?.r.coordinates ?? null} />
          </div>
          <RouteDirections result={result?.r ?? null} pending={pending !== null} />
        </main>
      </div>
    </div>
  );
}

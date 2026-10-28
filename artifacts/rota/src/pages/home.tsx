import { useRef, useState } from "react";
import { useCalculateRoute } from "@workspace/api-client-react";
import type { Place, RouteResult } from "@workspace/api-client-react";
import { ArrowUpDown, Crosshair, ExternalLink, Info, Loader2, Navigation, RotateCcw, TriangleAlert, Waves } from "lucide-react";
import { PlaceInput } from "@/components/place-input";
import { RouteMap } from "@/components/route-map";

const EXAMPLE_ORIGIN: Place = { label: "Praça da Sé, São Paulo - SP", lat: -23.5503, lon: -46.6339 };
const EXAMPLE_DEST: Place = { label: "Orla do Gonzaga, Santos - SP", lat: -23.9675, lon: -46.3336 };

function fmtDistance(m: number) {
  if (m < 1000) return { v: String(Math.round(m)), u: "m" };
  return { v: (m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: m < 100000 ? 1 : 0 }), u: "km" };
}
function fmtDuration(s: number) {
  const min = Math.max(1, Math.round(s / 60));
  const h = Math.floor(min / 60), r = min % 60;
  return h ? `${h} h ${String(r).padStart(2, "0")} min` : `${min} min`;
}

export default function Home() {
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [result, setResult] = useState<{ r: RouteResult; o: Place; d: Place } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const reqId = useRef(0);
  const calc = useCalculateRoute();
  const [pending, setPending] = useState(false);

  const invalidate = () => { reqId.current++; setResult(null); setError(null); setPending(false); };

  const run = async (o: Place, d: Place) => {
    const id = ++reqId.current;
    setPending(true); setError(null); setResult(null);
    try {
      const r = await calc.mutateAsync({ data: { origin: o, destination: d } });
      if (id !== reqId.current) return;
      if (!r.coordinates?.length) throw new Error("empty");
      setResult({ r, o, d });
    } catch {
      if (id !== reqId.current) return;
      setError("Não foi possível calcular a rota. Verifique se há caminho de carro entre os pontos ou tente novamente — o serviço público de rotas pode estar indisponível.");
    } finally {
      if (id === reqId.current) setPending(false);
    }
  };

  const swap = () => {
    invalidate();
    setOriginText(destText); setDestText(originText);
    setOrigin(dest); setDest(origin);
  };
  const reset = () => {
    invalidate();
    setOriginText(""); setDestText(""); setOrigin(null); setDest(null); setGeoMsg(null);
  };
  const example = () => {
    invalidate();
    setOriginText(EXAMPLE_ORIGIN.label); setDestText(EXAMPLE_DEST.label);
    setOrigin(EXAMPLE_ORIGIN); setDest(EXAMPLE_DEST);
    void run(EXAMPLE_ORIGIN, EXAMPLE_DEST);
  };
  const locate = () => {
    setGeoMsg(null);
    if (!("geolocation" in navigator)) { setGeoMsg("Seu navegador não oferece localização."); return; }
    setGeoBusy(true);
    const id = ++reqId.current;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        if (id !== reqId.current) return;
        const p: Place = { label: "Minha localização atual", lat: pos.coords.latitude, lon: pos.coords.longitude };
        setResult(null); setError(null);
        setOriginText(p.label); setOrigin(p);
      },
      (err) => {
        setGeoBusy(false);
        setGeoMsg(err.code === err.PERMISSION_DENIED ? "Permissão de localização negada. Digite o endereço de partida." : "Não conseguimos obter sua localização agora.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const canCalc = !!origin && !!dest && !pending;
  const gmaps = result
    ? `https://www.google.com/maps/dir/?api=1&origin=${result.o.lat},${result.o.lon}&destination=${result.d.lat},${result.d.lon}&travelmode=driving`
    : null;
  const dist = result ? fmtDistance(result.r.distance) : null;

  return (
    <div className="grain min-h-[100dvh] bg-background">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col md:flex-row">
        <aside className="relative z-10 flex w-full flex-col md:w-[420px] md:shrink-0 md:border-r md:border-border">
          <header className="rise flex items-end justify-between px-5 pb-4 pt-6 md:px-7 md:pt-9">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Planejador de trajetos</p>
              <h1 className="mt-1 text-[44px] font-extrabold leading-none tracking-[-0.04em] text-primary">
                Rota<span className="text-accent">.</span>
              </h1>
            </div>
            <p className="max-w-[160px] text-right text-[13px] leading-snug text-muted-foreground">Dois endereços. Um caminho claro.</p>
          </header>

          <section className="rise px-5 md:px-7" style={{ animationDelay: "80ms" }}>
            <div className="relative rounded-2xl border border-card-border bg-card/80 p-4 shadow-[0_10px_30px_-18px_hsl(200_38%_14%/0.4)] backdrop-blur">
              <div className="road-dash pointer-events-none absolute bottom-[70px] left-[29px] top-[70px] w-[2px] opacity-70" />
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
                  <button type="button" onClick={swap} aria-label="Inverter partida e destino" data-testid="button-swap"
                    className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-primary transition-transform duration-300 hover:rotate-180 hover:border-accent active:scale-90">
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </div>
                <PlaceInput id="destination" label="Destino" marker="B" value={destText} selected={dest}
                  onTextChange={(t) => { invalidate(); setDestText(t); setDest(null); }}
                  onSelect={(p) => { invalidate(); setDest(p); setDestText(p.label); }} />
              </div>
              {geoMsg && <p className="mt-3 text-xs text-destructive" data-testid="text-geo-error">{geoMsg}</p>}

              <div className="mt-4 flex gap-2">
                <button type="button" disabled={!canCalc} onClick={() => origin && dest && run(origin, dest)} data-testid="button-calculate"
                  className="relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary font-semibold text-primary-foreground transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
                  {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculando</> : <><Navigation className="h-4 w-4" /> Traçar rota</>}
                  {pending && <span className="sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />}
                </button>
                <button type="button" onClick={reset} aria-label="Limpar tudo" data-testid="button-reset"
                  className="grid h-12 w-12 place-items-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground active:scale-95">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              {!origin || !dest ? (
                <p className="mt-2 text-[12px] text-muted-foreground">Escolha um endereço da lista em cada campo para liberar o cálculo.</p>
              ) : null}
            </div>

            <button type="button" onClick={example} data-testid="button-example"
              className="group mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-input px-4 py-3 text-left transition hover:border-accent hover:bg-card">
              <Waves className="h-4 w-4 text-accent transition-transform group-hover:translate-x-0.5" />
              <span className="text-sm"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Exemplo</span><br />São Paulo → Santos, descendo a serra</span>
            </button>
          </section>

          <section className="px-5 pt-4 md:px-7" aria-live="polite">
            {pending && (
              <div className="grid grid-cols-2 gap-3" data-testid="status-calculating">
                {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            )}
            {error && (
              <div className="rise flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm" data-testid="text-route-error">
                <TriangleAlert className="h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p>{error}</p>
                  {origin && dest && <button type="button" onClick={() => run(origin, dest)} data-testid="button-retry-route" className="mt-2 font-semibold text-primary underline underline-offset-4">Tentar de novo</button>}
                </div>
              </div>
            )}
            {result && dist && (
              <div className="rise" data-testid="card-result">
                <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-primary text-primary-foreground">
                  <div className="p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">Distância</p>
                    <p className="mt-1 text-4xl font-extrabold tracking-tight" data-testid="text-distance">{dist.v}<span className="ml-1 text-base font-medium opacity-70">{dist.u}</span></p>
                  </div>
                  <div className="border-l border-primary-foreground/15 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">Tempo estimado</p>
                    <p className="mt-1 text-2xl font-extrabold leading-[2.5rem] tracking-tight text-accent" data-testid="text-duration">{fmtDuration(result.r.duration)}</p>
                  </div>
                </div>
                <a href={gmaps!} target="_blank" rel="noopener noreferrer" data-testid="link-google-maps"
                  className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-foreground transition hover:brightness-105 active:scale-[0.98]">
                  Abrir no Google Maps <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
            <p className="mt-4 flex gap-2 pb-5 text-[12px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              O tempo é estimado sem trânsito em tempo real. Busca e rotas usam serviços públicos de mapas, que às vezes ficam indisponíveis.
            </p>
          </section>
        </aside>

        <main className="relative h-[62dvh] min-h-[360px] w-full p-3 pt-0 md:h-auto md:flex-1 md:p-4">
          <div className="relative h-full overflow-hidden rounded-2xl border border-border shadow-[0_20px_50px_-25px_hsl(200_38%_14%/0.5)] md:min-h-[calc(100dvh-2rem)]">
            <RouteMap origin={origin} destination={dest} coordinates={result?.r.coordinates ?? null} />
          </div>
        </main>
      </div>
    </div>
  );
}

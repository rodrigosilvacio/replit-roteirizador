import type { RouteResult } from "@workspace/api-client-react";
import { fmtDistance, fmtDuration, pointLabel } from "./route-result";

function distance(meters: number) {
  const value = fmtDistance(meters);
  return `${value.v} ${value.u}`;
}

export function RouteDirections({ result, pending }: { result: RouteResult | null; pending: boolean }) {
  return (
    <section className="mt-4 rounded-2xl border border-card-border bg-card p-5" aria-labelledby="directions-heading" aria-live="polite">
      <h2 id="directions-heading" className="text-xl font-bold text-primary">Trajeto do motorista</h2>
      {!result ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {pending ? "Calculando as instruções do trajeto…" : "Calcule uma rota para ver aqui as ruas, conversões e distâncias de cada etapa."}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">Siga os trechos abaixo na ordem apresentada. As distâncias indicam quanto percorrer após cada instrução.</p>
          <div className="mt-4 space-y-3">
            {result.legs.map((leg, index) => (
              <details key={index} open className="rounded-xl border border-border" data-testid={`directions-leg-${index}`}>
                <summary className="cursor-pointer p-4 text-sm font-semibold text-primary">
                  Trecho {index + 1} · {pointLabel(index, result.orderedPlaces.length)} → {pointLabel(index + 1, result.orderedPlaces.length)}
                  <span className="ml-2 font-normal text-muted-foreground">{distance(leg.distance)} · {fmtDuration(leg.duration)}</span>
                  <span className="mt-1 block break-words text-xs font-normal text-muted-foreground">
                    {result.orderedPlaces[index].label} → {result.orderedPlaces[index + 1].label}
                  </span>
                </summary>
                <ol className="divide-y divide-border border-t border-border px-4">
                  {leg.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-start gap-3 py-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs text-primary">{stepIndex + 1}</span>
                      <span className="min-w-0 flex-1 break-words">{step.instruction}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{step.distance > 0 ? distance(step.distance) : "0 m"}</span>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Planejamento sem orientação por voz ou acompanhamento em tempo real. Respeite a sinalização local; para navegar durante a viagem, abra o Google Maps.</p>
        </>
      )}
    </section>
  );
}

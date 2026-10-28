import { useEffect, useRef, useState } from "react";
import { useSearchPlaces, getSearchPlacesQueryKey } from "@workspace/api-client-react";
import type { Place } from "@workspace/api-client-react";
import { Loader2, MapPin, SearchX, WifiOff, X } from "lucide-react";

type Props = {
  id: string;
  label: string;
  marker: "A" | "B";
  value: string;
  selected: Place | null;
  onTextChange: (text: string) => void;
  onSelect: (place: Place) => void;
};

export function PlaceInput({ id, label, marker, value, selected, onTextChange, onSelect }: Props) {
  const [debounced, setDebounced] = useState(value.trim());
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 550);
    return () => clearTimeout(t);
  }, [value]);

  const q = debounced;
  const enabled = q.length >= 3 && !selected && open;
  const { data, isFetching, isError, refetch } = useSearchPlaces(
    { q },
    { query: { queryKey: getSearchPlacesQueryKey({ q }), enabled, retry: 1, staleTime: 60_000 } },
  );

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const typing = value.trim() !== debounced;
  const results = data ?? [];
  const showPanel = open && !selected && value.trim().length > 0;

  const choose = (p: Place) => {
    onSelect(p);
    setOpen(false);
    setActive(-1);
  };

  const isA = marker === "A";

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>{label}</span>
        {selected && <span className="text-[10px] normal-case tracking-normal text-primary" data-testid={`status-selected-${id}`}>endereço confirmado</span>}
      </label>
      <div
        className={`group flex items-center gap-3 rounded-xl border bg-card px-3 transition-all duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_3px_hsl(var(--accent)/0.25)] ${selected ? "border-primary/40" : "border-input"}`}
      >
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold ${isA ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
          {marker}
        </span>
        <input
          id={id}
          data-testid={`input-${id}`}
          value={value}
          autoComplete="off"
          placeholder={isA ? "De onde você sai?" : "Para onde você vai?"}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={`${id}-list`}
          className="h-12 w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
          onChange={(e) => {
            onTextChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showPanel || !results.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(results[active]); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {value && (
          <button
            type="button"
            aria-label={`Limpar ${label.toLowerCase()}`}
            data-testid={`button-clear-${id}`}
            onClick={() => { onTextChange(""); setOpen(false); }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div id={`${id}-list`} role="listbox" className="rise absolute left-0 right-0 top-full z-[1100] mt-2 overflow-hidden rounded-xl border border-popover-border bg-popover shadow-[0_18px_40px_-12px_hsl(200_38%_14%/0.35)]">
          {value.trim().length < 3 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Digite pelo menos 3 letras para buscar.</p>
          ) : typing || isFetching ? (
            <div className="space-y-2 p-3" data-testid={`status-loading-${id}`}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 animate-pulse rounded bg-muted" style={{ width: `${72 - i * 14}%` }} />
                </div>
              ))}
              <p className="flex items-center gap-2 pt-1 font-mono text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> procurando endereços</p>
            </div>
          ) : isError ? (
            <div className="flex items-start gap-3 px-4 py-3 text-sm">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p>Não conseguimos buscar agora. O serviço público de mapas pode estar indisponível.</p>
                <button type="button" data-testid={`button-retry-${id}`} onClick={() => refetch()} className="mt-1 font-semibold text-primary underline underline-offset-4">Tentar de novo</button>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-start gap-3 px-4 py-3 text-sm text-muted-foreground" data-testid={`status-empty-${id}`}>
              <SearchX className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Nenhum endereço encontrado. Tente incluir cidade ou bairro.</p>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((p, i) => (
                <li key={`${p.lat},${p.lon},${i}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    data-testid={`option-${id}-${i}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(p)}
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors ${i === active ? "bg-secondary" : ""}`}
                  >
                    <MapPin className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${i === active ? "translate-x-0.5 text-accent" : "text-muted-foreground"}`} />
                    <span className="line-clamp-2">{p.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

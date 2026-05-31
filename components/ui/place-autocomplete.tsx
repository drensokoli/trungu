"use client";

import { MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Place search backed by OpenStreetMap's Photon geocoder (keyless, CORS-enabled).
 * Free-text is allowed too; the field stores a human-readable place string.
 */
export type PlaceAutocompleteProps = {
  value?: string | null;
  onChange?: (place: string) => void;
  onBlur?: () => void;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

type PhotonFeature = {
  properties: {
    name?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_id?: number;
    osm_type?: string;
  };
};

function labelFor(f: PhotonFeature): string {
  const p = f.properties;
  const locality = p.city || p.town || p.village || p.county;
  const parts = [p.name, locality, p.state, p.country].filter(
    (v, i, arr) => v && arr.indexOf(v) === i,
  );
  return parts.join(", ");
}

export function PlaceAutocomplete({
  value,
  onChange,
  onBlur,
  id,
  name,
  placeholder = "Search a city or place",
  className,
  disabled,
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState<string>(value ?? "");
  const [results, setResults] = useState<{ label: string; key: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipNextFetch = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Sync inward if the form value changes externally.
  useEffect(() => {
    setQuery((prev) => (prev === (value ?? "") ? prev : (value ?? "")));
  }, [value]);

  // Debounced fetch from Photon.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { features?: PhotonFeature[] };
        const seen = new Set<string>();
        const items: { label: string; key: string }[] = [];
        for (const f of data.features ?? []) {
          const label = labelFor(f);
          if (!label || seen.has(label)) continue;
          seen.add(label);
          items.push({
            label,
            key: `${f.properties.osm_type ?? ""}${f.properties.osm_id ?? label}`,
          });
        }
        setResults(items);
        setActive(-1);
      } catch {
        /* aborted or network error — ignore */
      }
    }, 280);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function select(label: string) {
    skipNextFetch.current = true;
    setQuery(label);
    onChange?.(label);
    setResults([]);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      select(results[active].label);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id={id}
          name={name}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange?.(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className={cn(
            "flex h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted/70 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
      </div>
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {results.map((r, i) => (
            <li key={r.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(r.label)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors",
                  i === active ? "bg-surface-2" : "hover:bg-surface-2",
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="truncate">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

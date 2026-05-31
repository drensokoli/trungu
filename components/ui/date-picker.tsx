"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Date field that supports BOTH manual typing (dd/mm/yyyy, auto-slashed) and a
 * calendar popover via the icon. Emits ISO "YYYY-MM-DD" (or "") so storage +
 * validation stay unchanged.
 */
export type DatePickerProps = {
  value?: string | null; // ISO "YYYY-MM-DD" or ""
  onChange?: (iso: string) => void;
  id?: string;
  disabled?: boolean;
};

type Ymd = { y: number; m: number; d: number }; // m is 0-based

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseIso(iso?: string | null): Ymd | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isoToDisplay(iso?: string | null): string {
  const p = parseIso(iso);
  if (!p) return "";
  return `${String(p.d).padStart(2, "0")}/${String(p.m + 1).padStart(2, "0")}/${p.y}`;
}

function isValidYmd(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}

/** dd/mm/yyyy display string -> ISO, or "" when incomplete/invalid. */
function displayToIso(display: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  if (!m) return "";
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!isValidYmd(y, mo, d)) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Mask raw input into dd/mm/yyyy; suppress trailing slashes while deleting. */
function mask(raw: string, deleting: boolean): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length >= 2) {
    if (digits.length > 2 || !deleting) out += "/";
    out += digits.slice(2, 4);
  }
  if (digits.length >= 4) {
    if (digits.length > 4 || !deleting) out += "/";
    out += digits.slice(4, 8);
  }
  return out;
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DatePicker({ value, onChange, id, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string>(() => isoToDisplay(value));
  const focusedRef = useRef(false);

  // Sync from external value, but never clobber what the user is typing.
  useEffect(() => {
    if (!focusedRef.current) setText(isoToDisplay(value));
  }, [value]);

  const selected = useMemo(() => parseIso(value), [value]);
  const today = useMemo(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  }, []);
  const [view, setView] = useState(() => selected ?? today);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = today.y; y >= today.y - 120; y--) arr.push(y);
    return arr;
  }, [today.y]);

  const grid = useMemo(() => buildGrid(view.y, view.m), [view.y, view.m]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const deleting = e.target.value.length < text.length;
    const masked = mask(e.target.value, deleting);
    setText(masked);
    onChange?.(displayToIso(masked));
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const total = v.y * 12 + v.m + delta;
      return { ...v, y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    });
  }

  function pick(d: number) {
    const iso = toIso(view.y, view.m, d);
    setText(isoToDisplay(iso));
    onChange?.(iso);
    setOpen(false);
  }

  function onOpenChange(next: boolean) {
    if (next) setView(selected ?? today);
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className="relative">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/yyyy"
            value={text}
            disabled={disabled}
            onChange={handleChange}
            onFocus={() => (focusedRef.current = true)}
            onBlur={() => {
              focusedRef.current = false;
              setText(isoToDisplay(value));
            }}
            className="flex h-9 w-full rounded-md border border-border bg-surface pl-3 pr-9 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted/70 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Open calendar"
              disabled={disabled}
              className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>

      <PopoverContent align="start" className="w-72 p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <select
            aria-label="Month"
            value={view.m}
            onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
            className="h-7 flex-1 rounded-md border border-border bg-surface px-1.5 text-sm text-foreground focus-visible:border-accent focus-visible:outline-none"
          >
            {MONTHS.map((nm, i) => (
              <option key={nm} value={i}>
                {nm}
              </option>
            ))}
          </select>
          <select
            aria-label="Year"
            value={view.y}
            onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}
            className="h-7 w-20 rounded-md border border-border bg-surface px-1.5 text-sm text-foreground focus-visible:border-accent focus-visible:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="flex h-7 items-center justify-center text-xs font-medium text-muted"
            >
              {w}
            </div>
          ))}
          {grid.map((d, i) => {
            if (d === null) return <div key={`b${i}`} className="h-8" />;
            const isSelected =
              selected &&
              selected.y === view.y &&
              selected.m === view.m &&
              selected.d === d;
            const isToday =
              today.y === view.y && today.m === view.m && today.d === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => pick(d)}
                className={cn(
                  "flex h-8 items-center justify-center rounded-md text-sm transition-colors",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-surface-2",
                  !isSelected && isToday && "ring-1 ring-inset ring-accent/40",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

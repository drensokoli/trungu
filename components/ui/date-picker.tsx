"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  parseFlex,
  formatFlex,
  type DatePrecision,
} from "@/lib/flex-date";

/**
 * Flexible date field. Supports partial precision (year only, month+year, or a
 * full day) and approximate dates ("around 1940"). Emits a flex-date token
 * (e.g. "1990", "1990-05", "1990-05-12", "~1990", or "") — see lib/flex-date.
 *
 * The text input accepts free typing (yyyy, mm/yyyy, dd/mm/yyyy, optionally
 * prefixed with "~", "c.", "circa", "around", "about"); the calendar popover
 * offers a precision toggle, an "approximate" switch, and pickers per precision.
 */
export type DatePickerProps = {
  value?: string | null; // flex token or ""
  onChange?: (token: string) => void;
  id?: string;
  disabled?: boolean;
};

type View = { y: number; m: number; d: number }; // m is 0-based

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Approximate-date prefixes a user might type (longest first so partial ones
// like "c." don't shadow "circa").
const APPROX_PREFIXES = [
  "approximately", "approx.", "approx", "circa", "around", "about",
  "ca.", "c.", "~",
];

const pad = (n: number) => String(n).padStart(2, "0");

function buildToken(
  y: number,
  m0: number,
  d: number,
  prec: DatePrecision,
  approx: boolean,
): string {
  let body: string;
  if (prec === "YEAR") body = `${y}`;
  else if (prec === "MONTH") body = `${y}-${pad(m0 + 1)}`;
  else body = `${y}-${pad(m0 + 1)}-${pad(d)}`;
  return approx ? `~${body}` : body;
}

/** Parse free-typed text into a flex token, or "" when incomplete/invalid. */
function displayToToken(raw: string): string {
  let s = raw.trim();
  if (!s) return "";
  let approx = false;
  const lower = s.toLowerCase();
  for (const p of APPROX_PREFIXES) {
    if (lower.startsWith(p)) {
      approx = true;
      s = s.slice(p.length).trim();
      break;
    }
  }
  const groups = s
    .split("/")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  let body = "";
  if (groups.length === 1 && /^\d{4}$/.test(groups[0])) {
    body = groups[0];
  } else if (
    groups.length === 2 &&
    /^\d{1,2}$/.test(groups[0]) &&
    /^\d{4}$/.test(groups[1])
  ) {
    body = `${groups[1]}-${pad(Number(groups[0]))}`;
  } else if (
    groups.length === 3 &&
    /^\d{1,2}$/.test(groups[0]) &&
    /^\d{1,2}$/.test(groups[1]) &&
    /^\d{4}$/.test(groups[2])
  ) {
    body = `${groups[2]}-${pad(Number(groups[1]))}-${pad(Number(groups[0]))}`;
  } else {
    return "";
  }
  const token = approx ? `~${body}` : body;
  return parseFlex(token) ? token : "";
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
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string>(() => formatFlex(value));
  const focusedRef = useRef(false);

  // Sync from external value, but never clobber what the user is typing.
  useEffect(() => {
    if (!focusedRef.current) setText(formatFlex(value));
  }, [value]);

  const parsed = useMemo(() => parseFlex(value), [value]);
  const today = useMemo(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  }, []);

  // Popover working state (precision + approx + the calendar's view position).
  const [prec, setPrec] = useState<DatePrecision>(parsed?.precision ?? "DAY");
  const [approx, setApprox] = useState<boolean>(parsed?.approx ?? false);
  const [view, setView] = useState<View>(() =>
    parsed
      ? { y: parsed.y, m: (parsed.m ?? 1) - 1, d: parsed.d ?? 1 }
      : today,
  );

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = today.y; y >= today.y - 130; y--) arr.push(y);
    return arr;
  }, [today.y]);

  const grid = useMemo(() => buildGrid(view.y, view.m), [view.y, view.m]);

  const placeholder =
    prec === "YEAR"
      ? t("date.placeholder.year")
      : prec === "MONTH"
        ? t("date.placeholder.month")
        : t("date.placeholder.day");

  function emit(next: string) {
    onChange?.(next);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setText(raw);
    emit(displayToToken(raw));
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const total = v.y * 12 + v.m + delta;
      return { ...v, y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    });
  }

  function changePrecision(next: DatePrecision) {
    setPrec(next);
    // Re-emit at the new precision if we already have a value to anchor to.
    if (value) emit(buildToken(view.y, view.m, view.d, next, approx));
  }

  function toggleApprox(next: boolean) {
    setApprox(next);
    if (value) emit(buildToken(view.y, view.m, view.d, prec, next));
  }

  function pickYear(y: number) {
    setView((v) => ({ ...v, y }));
    emit(buildToken(y, view.m, view.d, "YEAR", approx));
    setOpen(false);
  }

  function pickMonth(m: number) {
    setView((v) => ({ ...v, m }));
    emit(buildToken(view.y, m, view.d, "MONTH", approx));
    setOpen(false);
  }

  function pickDay(d: number) {
    setView((v) => ({ ...v, d }));
    emit(buildToken(view.y, view.m, d, "DAY", approx));
    setOpen(false);
  }

  function clearValue() {
    emit("");
    setText("");
    setOpen(false);
  }

  function onOpenChange(next: boolean) {
    if (next) {
      // Snapshot the current value into the working state.
      setPrec(parsed?.precision ?? "DAY");
      setApprox(parsed?.approx ?? false);
      setView(
        parsed
          ? { y: parsed.y, m: (parsed.m ?? 1) - 1, d: parsed.d ?? 1 }
          : today,
      );
    }
    setOpen(next);
  }

  const precTabs: { key: DatePrecision; label: string }[] = [
    { key: "YEAR", label: t("date.precision.year") },
    { key: "MONTH", label: t("date.precision.month") },
    { key: "DAY", label: t("date.precision.day") },
  ];

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className="relative">
          <input
            id={id}
            type="text"
            autoComplete="off"
            placeholder={placeholder}
            value={text}
            disabled={disabled}
            onChange={handleChange}
            onFocus={() => (focusedRef.current = true)}
            onBlur={() => {
              focusedRef.current = false;
              setText(formatFlex(value));
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
        {/* Precision toggle */}
        <div className="mb-2 flex rounded-md border border-border bg-surface-2 p-0.5">
          {precTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changePrecision(tab.key)}
              className={cn(
                "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                prec === tab.key
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Approximate toggle */}
        <div className="mb-2 flex items-center justify-between rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              {t("date.approximate")}
            </span>
            <span className="text-[10px] text-muted">
              {t("date.approximateHint")}
            </span>
          </div>
          <Switch checked={approx} onCheckedChange={toggleApprox} />
        </div>

        {/* DAY precision: full calendar */}
        {prec === "DAY" && (
          <>
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
                onChange={(e) =>
                  setView((v) => ({ ...v, m: Number(e.target.value) }))
                }
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
                onChange={(e) =>
                  setView((v) => ({ ...v, y: Number(e.target.value) }))
                }
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
                  parsed &&
                  parsed.precision === "DAY" &&
                  parsed.y === view.y &&
                  parsed.m === view.m + 1 &&
                  parsed.d === d;
                const isToday =
                  today.y === view.y && today.m === view.m && today.d === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pickDay(d)}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md text-sm transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-surface-2",
                      !isSelected &&
                        isToday &&
                        "ring-1 ring-inset ring-accent/40",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* MONTH precision: year stepper + month grid */}
        {prec === "MONTH" && (
          <>
            <div className="mb-2 flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous year"
                onClick={() => setView((v) => ({ ...v, y: v.y - 1 }))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                aria-label="Year"
                value={view.y}
                onChange={(e) =>
                  setView((v) => ({ ...v, y: Number(e.target.value) }))
                }
                className="h-7 flex-1 rounded-md border border-border bg-surface px-1.5 text-center text-sm text-foreground focus-visible:border-accent focus-visible:outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Next year"
                onClick={() => setView((v) => ({ ...v, y: v.y + 1 }))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((nm, i) => {
                const isSelected =
                  parsed &&
                  parsed.precision === "MONTH" &&
                  parsed.y === view.y &&
                  parsed.m === i + 1;
                return (
                  <button
                    key={nm}
                    type="button"
                    onClick={() => pickMonth(i)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md text-sm transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-surface-2",
                    )}
                  >
                    {nm}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* YEAR precision: scrollable year grid */}
        {prec === "YEAR" && (
          <div className="grid max-h-56 grid-cols-4 gap-1 overflow-y-auto pr-1">
            {years.map((y) => {
              const isSelected =
                parsed && parsed.precision === "YEAR" && parsed.y === y;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => pickYear(y)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-md text-sm transition-colors",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-surface-2",
                  )}
                >
                  {y}
                </button>
              );
            })}
          </div>
        )}

        {value && (
          <button
            type="button"
            onClick={clearValue}
            className="mt-2 w-full rounded-md py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {t("date.clear")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

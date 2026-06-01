import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { flexYear, formatFlex } from "@/lib/flex-date";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extract a 4-digit year from a Date or flexible-date token; "" if absent. */
export function yearOf(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") return flexYear(date);
  return Number.isNaN(date.getTime()) ? "" : String(date.getUTCFullYear());
}

/** Build a display name from first/last. */
export function fullName(firstName: string, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}

/** Capitalize the first letter of each word (for name inputs). */
export function capitalizeName(value: string): string {
  return value.replace(/(^|\s)(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

/**
 * Format a Date or flexible-date token for display. Tokens honor precision and
 * approximation (e.g. "c. 1990", "05/1990"); a bare Date renders as dd/mm/yyyy.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") return formatFlex(date);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

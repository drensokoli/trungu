/**
 * Flexible dates: a person's birth/death may be known only to the year, to the
 * month, or to the full day — and may be approximate ("around 1940"). We carry
 * all of that in ONE compact token string so the form, validation and DTO
 * pipeline stay single-field:
 *
 *   ""                empty / unknown
 *   "1990"            year precision
 *   "1990-05"         month precision
 *   "1990-05-12"      day precision
 *   "~1990"           approximate (the leading "~" works with any precision)
 *
 * The database stores the underlying `DateTime?` plus a precision enum and an
 * `approx` flag; these helpers convert between that storage shape and the token.
 */

export type DatePrecision = "DAY" | "MONTH" | "YEAR";

export type FlexParts = {
  date: Date | null; // UTC date at the start of the period (year->Jan 1, month->1st)
  precision: DatePrecision;
  approx: boolean;
};

export type ParsedFlex = {
  y: number;
  m: number | null; // 1-based
  d: number | null;
  precision: DatePrecision;
  approx: boolean;
};

// Optional "~", a 4-digit year, then optional -MM and -DD with valid ranges.
const TOKEN_RE =
  /^(~)?(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/;

/** True when `s` is a syntactically valid flex-date token (empty is NOT valid). */
export function isFlexToken(s: string): boolean {
  return TOKEN_RE.test(s);
}

/** Parse a token into its parts, or null when empty/invalid. */
export function parseFlex(token: string | null | undefined): ParsedFlex | null {
  if (!token) return null;
  const m = TOKEN_RE.exec(token.trim());
  if (!m) return null;
  const y = Number(m[2]);
  const mo = m[3] ? Number(m[3]) : null;
  const d = m[4] ? Number(m[4]) : null;
  const precision: DatePrecision = d ? "DAY" : mo ? "MONTH" : "YEAR";
  // Reject impossible day-of-month (e.g. 31 Feb) at DAY precision.
  if (precision === "DAY" && mo && d) {
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() !== mo - 1 ||
      dt.getUTCDate() !== d
    ) {
      return null;
    }
  }
  return { y, m: mo, d, precision, approx: Boolean(m[1]) };
}

/** Convert a token into Prisma-ready storage parts (Date + precision + approx). */
export function flexToParts(token: string | null | undefined): FlexParts {
  const p = parseFlex(token);
  if (!p) return { date: null, precision: "DAY", approx: false };
  const date = new Date(
    Date.UTC(p.y, (p.m ?? 1) - 1, p.d ?? 1, 0, 0, 0, 0),
  );
  return { date, precision: p.precision, approx: p.approx };
}

/** Rebuild a token from stored parts (Date + precision + approx). */
export function partsToFlex(
  date: Date | string | null | undefined,
  precision: DatePrecision | string | null | undefined,
  approx: boolean | null | undefined,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const prec = (precision ?? "DAY") as DatePrecision;
  let body: string;
  if (prec === "YEAR") body = `${y}`;
  else if (prec === "MONTH") body = `${y}-${mo}`;
  else body = `${y}-${mo}-${day}`;
  return approx ? `~${body}` : body;
}

/** Bare 4-digit year for a token (no approx marker), or "" if absent. */
export function flexYear(token: string | null | undefined): string {
  const p = parseFlex(token);
  return p ? String(p.y) : "";
}

/** Year for compact card display, prefixed with "c." when approximate. */
export function flexYearLabel(token: string | null | undefined): string {
  const p = parseFlex(token);
  if (!p) return "";
  return p.approx ? `c. ${p.y}` : String(p.y);
}

/**
 * Human-readable date honoring precision and approximation:
 *   DAY -> dd/mm/yyyy, MONTH -> mm/yyyy, YEAR -> yyyy, "c." prefix if approx.
 */
export function formatFlex(token: string | null | undefined): string {
  const p = parseFlex(token);
  if (!p) return "";
  const yyyy = String(p.y);
  let body: string;
  if (p.precision === "DAY") {
    body = `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${yyyy}`;
  } else if (p.precision === "MONTH") {
    body = `${String(p.m).padStart(2, "0")}/${yyyy}`;
  } else {
    body = yyyy;
  }
  return p.approx ? `c. ${body}` : body;
}

/** Chronological sort key (approx marker stripped); null sinks to the end. */
export function flexSortKey(token: string | null | undefined): string | null {
  if (!token) return null;
  const t = token.startsWith("~") ? token.slice(1) : token;
  return TOKEN_RE.test(token) ? t : null;
}

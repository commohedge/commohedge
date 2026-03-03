/**
 * Futures curve: build (DTE, price) points, linear interpolation, cache.
 * Used for search by maturity (DTE or calendar date).
 */

import type { FuturesContract } from "./barchart";
import { getCached, setCache } from "./scrapeCache";

const MONTH_ABBREV: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export interface FuturesCurvePoint {
  dte: number;
  dateIso: string;
  price: number;
  contract: string;
  month: string;
}

/**
 * Parse "Cash" or "Apr '26" / "Jan '27" into a date (1st of month for listed months).
 * refDate = reference date for "today" and for 2-digit year interpretation.
 */
export function parseMonthToDate(month: string, refDate: Date): Date | null {
  const trimmed = (month || "").trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "cash") return new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  let match = trimmed.match(/^([A-Za-z]{3})\s*'(\d{2})$/);
  if (match) {
    const m = MONTH_ABBREV[match[1]];
    if (m !== undefined) {
      const yy = parseInt(match[2], 10);
      const year = yy >= 0 && yy <= 99 ? 2000 + yy : yy;
      return new Date(year, m, 1);
    }
  }
  match = trimmed.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (match) {
    const m = MONTH_ABBREV[match[1]];
    if (m !== undefined) {
      const year = parseInt(match[2], 10);
      return new Date(year, m, 1);
    }
  }
  return null;
}

/**
 * Jours entre deux dates (date de référence = today).
 */
export function daysToExpiry(expiryDate: Date, refDate: Date): number {
  const a = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const b = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Build list of points (dte, dateIso, price, contract, month) from contracts.
 * Points are sorted by ascending dte. "last" may be "67.06s" — we parse the number.
 */
export function buildCurvePoints(
  futures: FuturesContract[],
  refDate: Date
): FuturesCurvePoint[] {
  const points: FuturesCurvePoint[] = [];
  for (const f of futures) {
    const date = parseMonthToDate(f.month, refDate);
    if (date == null) continue;
    const dte = daysToExpiry(date, refDate);
    const rawLast = (f.last || "").replace(/[^0-9.,-]/g, "").replace(",", ".");
    const price = parseFloat(rawLast);
    if (Number.isNaN(price)) continue;
    points.push({
      dte,
      dateIso: date.toISOString().slice(0, 10),
      price,
      contract: f.contract,
      month: f.month,
    });
  }
  points.sort((a, b) => a.dte - b.dte);
  return points;
}

/**
 * Interpolation linéaire (et extrapolation par le premier/dernier segment).
 * Retourne le prix estimé pour le DTE donné, ou null si la courbe a moins de 2 points.
 */
export function interpolatePrice(
  points: FuturesCurvePoint[],
  dte: number
): number | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0].price;
  if (dte <= points[0].dte) return points[0].price;
  if (dte >= points[points.length - 1].dte) return points[points.length - 1].price;
  let i = 0;
  while (i + 1 < points.length && points[i + 1].dte < dte) i++;
  const a = points[i];
  const b = points[i + 1];
  if (b.dte === a.dte) return a.price;
  const t = (dte - a.dte) / (b.dte - a.dte);
  return a.price + t * (b.price - a.price);
}

const CURVE_CACHE_KEY_PREFIX = "futures_curve:";

/**
 * Get curve from cache or build from provided futures.
 * If futures are provided, the curve is cached for the symbol.
 */
export function getOrBuildCurve(
  symbol: string,
  futures: FuturesContract[],
  refDate: Date
): FuturesCurvePoint[] {
  const cacheKey = CURVE_CACHE_KEY_PREFIX + symbol;
  if (futures.length === 0) {
    const cached = getCached<FuturesCurvePoint[]>(cacheKey);
    return cached ?? [];
  }
  const points = buildCurvePoints(futures, refDate);
  if (points.length > 0) setCache(cacheKey, points);
  return points;
}

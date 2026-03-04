import { useState, useCallback } from 'react';
import {
  fetchCurrencies as fetchTppCurrencies,
  fetchFutures as fetchTppFutures,
  fetchVolSurface as fetchTppVolSurface,
  fetchVolSurfaceStrikes as fetchTppVolSurfaceStrikes,
  type CurrencyData as TppCurrencyData,
  type SurfacePoint as TppSurfacePoint,
  type CommodityCategory as TppCommodityCategory,
  type FuturesContract as TppFuturesContract,
} from '@/lib/ticker-peek-pro/barchart';
import { interpolateSurface } from '@/lib/ticker-peek-pro/volSurfaceInterpolation';
import { getOrBuildCurve, interpolatePrice, type FuturesCurvePoint } from '@/lib/ticker-peek-pro/futuresCurve';

export interface UseTickerPeekProReturn {
  // State
  tppCurrencies: TppCurrencyData[];
  tppCurrenciesByCategory: Record<string, TppCurrencyData[]>;
  tppLoadingCurrencies: boolean;
  tppLoadingFutures: boolean;
  tppLoadingSurface: boolean;
  tppSurfacePoints: TppSurfacePoint[];
  tppFutures: TppFuturesContract[];
  
  // Actions
  loadAllTppCurrencies: () => Promise<void>;
  loadTppData: (symbol: string) => Promise<{
    spotPrice: number | null;
    futuresCount: number;
    surfacePointsCount: number;
  }>;
  
  // Helpers
  interpolateTppIV: (absoluteStrike: number, dte: number, type: 'call' | 'put') => number | null;
  interpolateTppSpot: (symbol: string, dte: number) => number | null;
  getCurvePoints: (symbol: string, refDate?: Date) => FuturesCurvePoint[];
}

export function useTickerPeekPro(): UseTickerPeekProReturn {
  const [tppCurrencies, setTppCurrencies] = useState<TppCurrencyData[]>([]);
  const [tppCurrenciesByCategory, setTppCurrenciesByCategory] = useState<Record<string, TppCurrencyData[]>>({});
  const [tppLoadingCurrencies, setTppLoadingCurrencies] = useState(false);
  const [tppLoadingFutures, setTppLoadingFutures] = useState(false);
  const [tppLoadingSurface, setTppLoadingSurface] = useState(false);
  const [tppSurfacePoints, setTppSurfacePoints] = useState<TppSurfacePoint[]>([]);
  const [tppFutures, setTppFutures] = useState<TppFuturesContract[]>([]);

  // Load all commodities from all categories
  const loadAllTppCurrencies = useCallback(async () => {
    setTppLoadingCurrencies(true);
    const categories: TppCommodityCategory[] = ['energies', 'metals', 'grains', 'livestock'];
    const categorized: Record<string, TppCurrencyData[]> = {};
    const results = await Promise.allSettled(
      categories.map(cat => fetchTppCurrencies(cat))
    );
    categories.forEach((cat, idx) => {
      const result = results[idx];
      if (result.status === 'fulfilled' && result.value.success && result.value.data) {
        const unique = result.value.data.reduce<TppCurrencyData[]>((acc, c) => {
          if (!acc.find(x => x.symbol === c.symbol)) acc.push(c);
          return acc;
        }, []);
        categorized[cat] = unique;
      }
    });
    setTppCurrenciesByCategory(categorized);
    setTppCurrencies(Object.values(categorized).flat());
    setTppLoadingCurrencies(false);
  }, []);

  // Load futures and IV surface for a symbol
  const loadTppData = useCallback(async (symbol: string): Promise<{
    spotPrice: number | null;
    futuresCount: number;
    surfacePointsCount: number;
  }> => {
    let spotPrice: number | null = null;
    let futuresCount = 0;
    let surfacePointsCount = 0;

    // 1. Load futures for curve
    setTppLoadingFutures(true);
    setTppFutures([]);
    try {
      const futuresResult = await fetchTppFutures(symbol);
      if (futuresResult.success && futuresResult.data && futuresResult.data.length > 0) {
        setTppFutures(futuresResult.data);
        futuresCount = futuresResult.data.length;
        const refDate = new Date();
        const curvePoints = getOrBuildCurve(symbol, futuresResult.data, refDate);
        if (curvePoints.length >= 2) {
          const dte = 0; // Cash/spot
          const interpolated = interpolatePrice(curvePoints, dte);
          spotPrice = interpolated != null ? interpolated : parseFloat(
            (futuresResult.data.find(f => f.month.toLowerCase().includes('cash')) || futuresResult.data[0]).last.replace(/,/g, '')
          );
        } else {
          const cashContract = futuresResult.data.find(f =>
            f.month.toLowerCase().includes('cash') || f.contract.toLowerCase().includes('cash')
          ) || futuresResult.data[0];
          const cashPrice = parseFloat(cashContract.last.replace(/,/g, ''));
          if (!isNaN(cashPrice) && cashPrice > 0) {
            spotPrice = cashPrice;
          }
        }
      }
    } catch (error) {
      console.error('Error loading TPP futures:', error);
    } finally {
      setTppLoadingFutures(false);
    }

    // 2. Load IV surface for volatility interpolation
    setTppLoadingSurface(true);
    setTppSurfacePoints([]);
    try {
      const strikesResult = await fetchTppVolSurfaceStrikes(symbol, symbol, 50);
      if (strikesResult.success && strikesResult.strikes && strikesResult.strikes.length > 0) {
        const allStrikes = strikesResult.strikes;
        const surfaceResult = await fetchTppVolSurface(
          symbol, symbol, 50, false, allStrikes[0], allStrikes[allStrikes.length - 1]
        );
        if (surfaceResult.success && surfaceResult.surfacePoints && surfaceResult.surfacePoints.length > 0) {
          setTppSurfacePoints(surfaceResult.surfacePoints);
          surfacePointsCount = surfaceResult.surfacePoints.length;
        }
      }
    } catch (error) {
      console.error('Error loading TPP IV surface:', error);
    } finally {
      setTppLoadingSurface(false);
    }

    return { spotPrice, futuresCount, surfacePointsCount };
  }, []);

  // Bilinear IV interpolation - returns DECIMAL (e.g., 0.30 for 30%)
  const interpolateTppIV = useCallback((absoluteStrike: number, dte: number, type: 'call' | 'put'): number | null => {
    if (tppSurfacePoints.length === 0) return null;
    const filtered = tppSurfacePoints.filter(p => p.type === type);
    if (filtered.length === 0) return null;

    const strikes = [...new Set(filtered.map(p => p.strike))].sort((a, b) => a - b);
    const dtes = [...new Set(filtered.map(p => p.dte))].sort((a, b) => a - b);
    if (strikes.length < 2 || dtes.length < 2) return null;

    // TPP surface can return IV as percentage (e.g. 25) or decimal (0.25); normalize to decimal
    const parseIv = (v: unknown): number | null => {
      if (v == null) return null;
      const n = typeof v === 'string' ? parseFloat(String(v).replace(',', '.')) : Number(v);
      return Number.isNaN(n) || n <= 0 ? null : n;
    };
    const toDecimalIv = (raw: number) => (raw > 1 ? raw / 100 : raw);
    let z: (number | null)[][] = dtes.map(d =>
      strikes.map(s => {
        const point = filtered.find(p => p.dte === d && p.strike === s);
        const raw = parseIv(point?.iv);
        if (raw == null) return null;
        return toDecimalIv(raw);
      })
    );
    z = interpolateSurface(z, strikes, dtes);

    let si = strikes.findIndex(s => s >= absoluteStrike);
    let di = dtes.findIndex(d => d >= dte);
    if (si <= 0) si = 1;
    if (si >= strikes.length) si = strikes.length - 1;
    if (di <= 0) di = 1;
    if (di >= dtes.length) di = dtes.length - 1;

    const s0 = strikes[si - 1], s1 = strikes[si];
    const d0 = dtes[di - 1], d1 = dtes[di];
    const z00 = z[di - 1]?.[si - 1], z01 = z[di - 1]?.[si];
    const z10 = z[di]?.[si - 1], z11 = z[di]?.[si];
    const vals = [z00, z01, z10, z11].filter(v => v !== null) as number[];
    if (vals.length === 0) return null;
    if (vals.length < 4) return vals.reduce((a, b) => a + b, 0) / vals.length;

    const ts = s1 !== s0 ? (absoluteStrike - s0) / (s1 - s0) : 0.5;
    const td = d1 !== d0 ? (dte - d0) / (d1 - d0) : 0.5;
    return z00! * (1 - ts) * (1 - td) + z01! * ts * (1 - td) + z10! * (1 - ts) * td + z11! * ts * td;
  }, [tppSurfacePoints]);

  // Interpolate spot price from futures curve
  const interpolateTppSpot = useCallback((symbol: string, dte: number): number | null => {
    if (tppFutures.length < 2) return null;
    const refDate = new Date();
    const curvePoints = getOrBuildCurve(symbol, tppFutures, refDate);
    if (curvePoints.length < 2) return null;
    return interpolatePrice(curvePoints, dte);
  }, [tppFutures]);

  // Get curve points for a symbol
  const getCurvePoints = useCallback((symbol: string, refDate?: Date): FuturesCurvePoint[] => {
    if (tppFutures.length < 2) return [];
    return getOrBuildCurve(symbol, tppFutures, refDate || new Date());
  }, [tppFutures]);

  return {
    tppCurrencies,
    tppCurrenciesByCategory,
    tppLoadingCurrencies,
    tppLoadingFutures,
    tppLoadingSurface,
    tppSurfacePoints,
    tppFutures,
    loadAllTppCurrencies,
    loadTppData,
    interpolateTppIV,
    interpolateTppSpot,
    getCurvePoints,
  };
}

export type {
  TppCurrencyData,
  TppSurfacePoint,
  TppCommodityCategory,
  TppFuturesContract,
};

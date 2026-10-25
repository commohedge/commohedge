/**
 * Shared World Bank CMO cache in Supabase (single row id=monthly).
 * Public read via anon key; written only by sync-world-bank-cmo edge function.
 */
import { supabase } from "@/lib/supabase";
import type { WorldBankCommodity, WorldBankData } from "@/services/worldBankApi";

type DbRow = {
  id: string;
  payload: unknown;
  commodity_count: number;
  source_url: string | null;
  file_path: string | null;
  period_label: string | null;
  fetched_at: string;
  updated_at?: string;
};

function isCommodityArray(raw: unknown): raw is WorldBankCommodity[] {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  return raw.some(
    (c) =>
      c &&
      typeof c === "object" &&
      typeof (c as WorldBankCommodity).symbol === "string" &&
      Array.isArray((c as WorldBankCommodity).data),
  );
}

/**
 * Read the shared monthly Pink Sheet snapshot.
 * Returns null if missing, empty, or table unavailable.
 */
export async function readWorldBankCmoFromDb(): Promise<WorldBankData | null> {
  try {
    const { data, error } = await supabase
      .from("world_bank_cmo_cache")
      .select(
        "id, payload, commodity_count, source_url, file_path, period_label, fetched_at, updated_at",
      )
      .eq("id", "monthly")
      .maybeSingle();

    if (error) {
      console.warn("[world-bank-db] read:", error.message);
      return null;
    }
    if (!data) return null;

    const row = data as DbRow;
    if (!isCommodityArray(row.payload)) {
      console.warn("[world-bank-db] empty or invalid payload");
      return null;
    }

    const fileName =
      row.period_label
        ? `CMO-Historical-Data-Monthly.xlsx (${row.period_label})`
        : row.file_path || "CMO-Historical-Data-Monthly.xlsx";

    console.log(
      `[world-bank-db] HIT ${row.payload.length} commodities (fetched ${row.fetched_at})`,
    );

    return {
      commodities: row.payload,
      lastUpdated: new Date(row.fetched_at),
      fileName,
      isDefault: false,
      sourceUrl: row.source_url ?? undefined,
      periodLabel: row.period_label ?? undefined,
    };
  } catch (e) {
    console.warn("[world-bank-db] read failed:", e);
    return null;
  }
}

/** Public Storage URL for the latest overwritten XLSX (if bucket is public). */
export function getWorldBankCmoPublicFileUrl(): string | null {
  try {
    const { data } = supabase.storage
      .from("world-bank")
      .getPublicUrl("CMO-Historical-Data-Monthly.xlsx");
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

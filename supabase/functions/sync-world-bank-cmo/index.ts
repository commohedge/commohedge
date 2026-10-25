/**
 * Sync World Bank CMO Historical Data Monthly → Storage + world_bank_cmo_cache.
 *
 * Auth: Authorization Bearer must match CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY.
 * Body/query: { force?: boolean } — skip calendar / already-synced checks.
 *
 * Schedule: daily 1–12 of month (pg_cron); function waits until ≥ 3rd business day
 * and skips if period_label already equals current YYYY-MM (unless force).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { parsePinkSheetArrayBuffer } from "./parsePinkSheet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const DEFAULT_SOURCE_URL =
  "https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx";

const STORAGE_BUCKET = "world-bank";
const STORAGE_OBJECT = "CMO-Historical-Data-Monthly.xlsx";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = req.headers.get("x-cron-secret") || "";

  if (cronSecret && (bearer === cronSecret || headerSecret === cronSecret)) {
    return true;
  }
  if (serviceKey && bearer === serviceKey) return true;
  return false;
}

/** nth weekday of month (UTC). n=1 → first Mon–Fri. */
function nthBusinessDayUtc(year: number, monthIndex: number, n: number): Date {
  let count = 0;
  const d = new Date(Date.UTC(year, monthIndex, 1));
  while (d.getUTCMonth() === monthIndex) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) {
      count++;
      if (count === n) return new Date(d);
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return new Date(Date.UTC(year, monthIndex, 28));
}

function periodLabelUtc(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function shouldSyncNow(
  now: Date,
  force: boolean,
  existingPeriod: string | null,
): { ok: boolean; reason: string } {
  if (force) return { ok: true, reason: "force" };

  const label = periodLabelUtc(now);
  if (existingPeriod === label) {
    return { ok: false, reason: `already-synced-for-${label}` };
  }

  const day = now.getUTCDate();
  if (day > 12) {
    return { ok: false, reason: "after-calendar-window-day-12" };
  }

  const third = nthBusinessDayUtc(now.getUTCFullYear(), now.getUTCMonth(), 3);
  // Compare calendar dates in UTC
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const thirdUtc = Date.UTC(
    third.getUTCFullYear(),
    third.getUTCMonth(),
    third.getUTCDate(),
  );
  if (todayUtc < thirdUtc) {
    return {
      ok: false,
      reason: `before-3rd-business-day (${third.toISOString().slice(0, 10)})`,
    };
  }

  return { ok: true, reason: "in-window" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!isAuthorized(req)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const url = new URL(req.url);
    let force = url.searchParams.get("force") === "1" ||
      url.searchParams.get("force") === "true";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.force === true || body?.force === 1) force = true;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existing } = await admin
      .from("world_bank_cmo_cache")
      .select("period_label, file_etag, commodity_count, fetched_at")
      .eq("id", "monthly")
      .maybeSingle();

    const now = new Date();
    const gate = shouldSyncNow(now, force, existing?.period_label ?? null);
    if (!gate.ok) {
      return json({
        success: true,
        skipped: true,
        reason: gate.reason,
        period_label: periodLabelUtc(now),
        existing_period: existing?.period_label ?? null,
        last_fetched_at: existing?.fetched_at ?? null,
      });
    }

    const sourceUrl =
      Deno.env.get("WORLD_BANK_CMO_URL")?.trim() || DEFAULT_SOURCE_URL;

    console.log(`[sync-world-bank-cmo] downloading ${sourceUrl}`);
    const dl = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "CommoHedgeWorldBankSync/1.0 (+https://www.commohedge.com)",
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*",
      },
      redirect: "follow",
    });

    if (!dl.ok) {
      return json(
        {
          success: false,
          error: `Download failed: HTTP ${dl.status}`,
          source_url: sourceUrl,
          hint:
            "World Bank doc URL may have rotated — set secret WORLD_BANK_CMO_URL",
        },
        502,
      );
    }

    const etag = dl.headers.get("etag");
    const arrayBuffer = await dl.arrayBuffer();
    const fileBytes = arrayBuffer.byteLength;

    if (fileBytes < 10_000) {
      return json(
        {
          success: false,
          error: `Downloaded payload too small (${fileBytes} bytes) — likely HTML error page`,
          source_url: sourceUrl,
        },
        502,
      );
    }

    if (
      !force &&
      etag &&
      existing?.file_etag &&
      etag === existing.file_etag &&
      (existing.commodity_count ?? 0) > 0
    ) {
      // Same file; still stamp period so we don't retry all month
      const label = periodLabelUtc(now);
      await admin.from("world_bank_cmo_cache").upsert({
        id: "monthly",
        period_label: label,
        fetched_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
      return json({
        success: true,
        skipped: true,
        reason: "etag-unchanged",
        etag,
        period_label: label,
      });
    }

    console.log(`[sync-world-bank-cmo] parsing ${fileBytes} bytes`);
    const commodities = parsePinkSheetArrayBuffer(arrayBuffer);
    if (!commodities.length) {
      return json({ success: false, error: "Parser returned 0 commodities" }, 500);
    }

    const { error: uploadErr } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_OBJECT, arrayBuffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadErr) {
      console.error("[sync-world-bank-cmo] storage upload:", uploadErr);
      return json(
        { success: false, error: `Storage upload failed: ${uploadErr.message}` },
        500,
      );
    }

    const label = periodLabelUtc(now);
    const row = {
      id: "monthly",
      payload: commodities,
      commodity_count: commodities.length,
      source_url: sourceUrl,
      file_path: STORAGE_OBJECT,
      file_etag: etag,
      file_bytes: fileBytes,
      period_label: label,
      fetched_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { error: upsertErr } = await admin
      .from("world_bank_cmo_cache")
      .upsert(row, { onConflict: "id" });

    if (upsertErr) {
      console.error("[sync-world-bank-cmo] upsert:", upsertErr);
      return json(
        { success: false, error: `DB upsert failed: ${upsertErr.message}` },
        500,
      );
    }

    console.log(
      `[sync-world-bank-cmo] OK ${commodities.length} commodities period=${label}`,
    );

    return json({
      success: true,
      skipped: false,
      reason: gate.reason,
      commodity_count: commodities.length,
      period_label: label,
      file_bytes: fileBytes,
      file_path: `${STORAGE_BUCKET}/${STORAGE_OBJECT}`,
      source_url: sourceUrl,
      categories: [...new Set(commodities.map((c) => c.category))],
    });
  } catch (error) {
    console.error("[sync-world-bank-cmo]", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

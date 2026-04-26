import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestAccessPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  country?: string;
  industry?: string;
  activity?: string;
  role?: string;
  companySize?: string;
  products?: string[];
  hedgingHorizon?: string;
  message?: string;
};

function toText(p: RequestAccessPayload) {
  const lines = [
    "New Request Access submission",
    "",
    `Full name: ${p.fullName || "—"}`,
    `Email: ${p.email || "—"}`,
    `Phone: ${p.phone || "—"}`,
    "",
    `Company: ${p.company || "—"}`,
    `Website: ${p.website || "—"}`,
    `Country: ${p.country || "—"}`,
    `Role / title: ${p.role || "—"}`,
    `Company size: ${p.companySize || "—"}`,
    "",
    `Industry: ${p.industry || "—"}`,
    `Activity: ${p.activity || "—"}`,
    `Products interested: ${p.products?.length ? p.products.join(", ") : "—"}`,
    `Hedging horizon: ${p.hedgingHorizon || "—"}`,
    "",
    "Message:",
    p.message || "—",
  ];
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as RequestAccessPayload;

    const fullName = (payload.fullName || "").trim();
    const email = (payload.email || "").trim();
    const company = (payload.company || "").trim();
    if (!fullName || !email || !company) {
      return new Response(JSON.stringify({ error: "Missing required fields: fullName, email, company" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase Edge Functions can't send email by themselves; we use an email provider.
    // Recommended: Resend (simple API + good deliverability).
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
    const REQUEST_ACCESS_TO = Deno.env.get("REQUEST_ACCESS_TO") || "commohedge@gmail.com";
    const REQUEST_ACCESS_FROM = Deno.env.get("REQUEST_ACCESS_FROM") || "CommoHedge <onboarding@resend.dev>";

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY is not configured on this Edge Function.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = `Request access — ${company}`;
    const text = toText(payload);

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: REQUEST_ACCESS_FROM,
        to: [REQUEST_ACCESS_TO],
        subject,
        text,
        reply_to: email,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("Resend error:", sendRes.status, errText);
      return new Response(JSON.stringify({ error: "Email provider error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await sendRes.json().catch(() => null);
    return new Response(JSON.stringify({ ok: true, id: data?.id || null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("request-access error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


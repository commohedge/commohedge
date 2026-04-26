/// <reference lib="deno.unstable" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Action = "list" | "update_role" | "invite";

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const allow = (Deno.env.get("ADMIN_EMAILS") || "bilalfaress00@gmail.com,commohedge@gmail.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Missing Supabase env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return json({ error: "Missing Authorization bearer token" }, { status: 401 });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authed = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr) return json({ error: userErr.message }, { status: 401 });
    const requester = userData.user;

    const isAdmin = isAdminEmail(requester.email ?? null) || requester.user_metadata?.role === "Admin";
    if (!isAdmin) return json({ error: "Forbidden" }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const action = (payload?.action || "list") as Action;

    if (action === "list") {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) return json({ error: error.message }, { status: 500 });

      const users = (data.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        role: (u.user_metadata as any)?.role ?? (u.app_metadata as any)?.role ?? "Member",
        name: (u.user_metadata as any)?.name ?? "",
        banned_until: (u as any).banned_until ?? null,
      }));

      return json({ users });
    }

    if (action === "update_role") {
      const userId = String(payload?.userId || "");
      const role = String(payload?.role || "").trim();
      if (!userId || !role) return json({ error: "userId and role are required" }, { status: 400 });

      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { role },
        app_metadata: { role },
      });
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ user: { id: data.user?.id, role } });
    }

    if (action === "invite") {
      const email = String(payload?.email || "").trim();
      const role = String(payload?.role || "Member").trim();
      if (!email) return json({ error: "email is required" }, { status: 400 });

      const redirectTo = Deno.env.get("INVITE_REDIRECT_TO") || undefined;
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { role },
        redirectTo,
      });
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ invited: true, user: { id: data.user?.id, email: data.user?.email, role } });
    }

    return json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, { status: 500 });
  }
});


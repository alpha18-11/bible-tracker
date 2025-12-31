import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ================= CORS ================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ================= CSV HELPER ================= */

function arrayToCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(",")];

  for (const row of data) {
    rows.push(
      headers
        .map((h) => {
          const v = row[h];
          if (v === null || v === undefined) return "";
          const s = String(v);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(",")
    );
  }

  return rows.join("\n");
}

/* ================= MAIN ================= */

serve(async (req) => {
  /* ---- OPTIONS (CORS preflight) ---- */
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    /* ---- ENV ---- */
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    /* ---- CLIENTS ---- */
    const supabaseAuth = createClient(supabaseUrl, anonKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    /* ---- AUTH ---- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    /* ---- ADMIN CHECK ---- */
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    /* ---- FETCH DATA ---- */
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: readingProgress } = await supabaseAdmin
      .from("reading_progress")
      .select("*")
      .order("read_at", { ascending: false });

    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("*");

    /* ---- CSV BUILD ---- */
    const profilesCSV = arrayToCSV(profiles ?? [], [
      "id",
      "user_id",
      "full_name",
      "email",
      "approval_status",
      "created_at",
    ]);

    const progressCSV = arrayToCSV(readingProgress ?? [], [
      "id",
      "user_id",
      "day",
      "read_at",
    ]);

    const rolesCSV = arrayToCSV(userRoles ?? [], [
      "id",
      "user_id",
      "role",
    ]);

    const combinedCSV =
      "=== PROFILES ===\n" +
      profilesCSV +
      "\n\n=== READING_PROGRESS ===\n" +
      progressCSV +
      "\n\n=== USER_ROLES ===\n" +
      rolesCSV;

    /* ---- RESPONSE ---- */
    return new Response(combinedCSV, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bethesda_export_${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Export failed",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

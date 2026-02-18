import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocodePostalCode(postalCode: string): Promise<{ lat: number; lng: number } | null> {
  const formatted = postalCode.replace(/\s+/g, " ").trim().toUpperCase();
  const query = encodeURIComponent(`${formatted}, Ontario, Canada`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=ca`,
      { headers: { "User-Agent": "PSWDirect/1.0 (admin geocode)" } }
    );
    if (!res.ok) return null;
    const data: NominatimResult[] = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Optional: geocode a single PSW by id (used on approval)
    let singlePswId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        singlePswId = body?.psw_id ?? null;
      } catch {
        // no body is fine
      }
    }

    let query = supabase
      .from("psw_profiles")
      .select("id, home_postal_code")
      .eq("vetting_status", "approved")
      .not("home_postal_code", "is", null)
      .or("home_lat.is.null,home_lng.is.null");

    if (singlePswId) {
      query = query.eq("id", singlePswId);
    } else {
      // Exclude test PSWs
      query = query.or("is_test.is.null,is_test.eq.false");
    }

    const { data: rows, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    let failed = 0;

    for (const row of rows || []) {
      const coords = await geocodePostalCode(row.home_postal_code!);
      if (coords) {
        const { error: upErr } = await supabase
          .from("psw_profiles")
          .update({ home_lat: coords.lat, home_lng: coords.lng })
          .eq("id", row.id);
        if (!upErr) updated++;
        else failed++;
      } else {
        failed++;
      }
      // Rate limit: 1 request per second per Nominatim policy
      await sleep(1100);
    }

    return new Response(
      JSON.stringify({ total: (rows || []).length, updated, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

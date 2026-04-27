import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id, check_in_time } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Resolve client email server-side — PSWs never see this column.
    const { data: b } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_name, scheduled_date, psw_first_name")
      .eq("id", booking_id)
      .maybeSingle();

    if (!b || !b.client_email) {
      return new Response(JSON.stringify({ skipped: "no_email" }), { status: 200, headers: corsHeaders });
    }

    // Enqueue templated email via existing notification queue
    await supabase.from("notification_queue").insert({
      template_key: "psw-arrived",
      to_email: b.client_email,
      payload: {
        client_name: b.client_name,
        booking_code: b.booking_code,
        booking_id: b.booking_code,
        job_date: b.scheduled_date,
        job_time: check_in_time || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        psw_first_name: (b.psw_first_name || "").split(" ")[0],
      },
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});

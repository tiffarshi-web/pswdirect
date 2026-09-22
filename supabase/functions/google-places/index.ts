// google-places — server-side address lookup for the browser.
//
// Google no longer authorises Places calls from the managed browser key, so all
// address typeahead / details / text-geocoding runs here through the connector
// gateway. Provider credentials never reach the client.
//
// Only three fixed actions are accepted; no arbitrary upstream URLs, bounded
// input length, and a light per-IP burst limit.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  googleMapsConfigured,
  placesAutocomplete,
  placeDetails,
  placesTextSearch,
} from "../_shared/googleGeocode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Light burst limit: 60 lookups per IP per rolling minute.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, number[]>();
const rateLimited = (ip: string) => {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!googleMapsConfigured()) {
    return json({ error: "Address lookup is not configured" }, 503);
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (rateLimited(ip)) return json({ error: "Too many address lookups, please slow down" }, 429);

  let payload: {
    action?: string;
    input?: string;
    placeId?: string;
    query?: string;
    sessionToken?: string;
    region?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const region = (payload.region || "ca").toLowerCase().slice(0, 2);
  const sessionToken =
    typeof payload.sessionToken === "string" && payload.sessionToken.length <= 100
      ? payload.sessionToken
      : undefined;

  try {
    switch (payload.action) {
      case "autocomplete": {
        const suggestions = await placesAutocomplete(String(payload.input ?? ""), sessionToken, region);
        return json({ suggestions });
      }
      case "details": {
        const place = await placeDetails(String(payload.placeId ?? ""), sessionToken);
        return json({ place });
      }
      case "geocode": {
        const place = await placesTextSearch(String(payload.query ?? ""), region);
        return json({ place });
      }
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("google-places failed:", String((e as Error)?.message || e));
    return json({ error: "Address lookup failed" }, 500);
  }
});

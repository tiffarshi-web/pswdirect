// Shared resilient geocoding helper for Canadian addresses.
// Multi-stage fallback: full address → address+ON+CA → postal (spaced) → postal (compact)
//   → postal FSA → city+ON+CA → known-city table.
// Records precision/source/fallback level for every result.
// Never throws — returns null when all stages fail so callers can persist a failure state.

export type GeocodePrecision =
  | "rooftop"
  | "street"
  | "postal_code"
  | "city"
  | "manual"
  | "unknown";

export interface GeocodeResult {
  lat: number;
  lng: number;
  source: string;              // human-readable stage name
  fallback_level: number;      // 1..6
  precision: GeocodePrecision;
  confidence: number;          // 0..1
  attempts: number;
  normalized_query: string;
  error_code: string | null;
  error_message: string | null;
}

export interface GeocodeFailure {
  lat: null;
  lng: null;
  source: null;
  fallback_level: 0;
  precision: "unknown";
  confidence: null;
  attempts: number;
  normalized_query: string;
  error_code: string;
  error_message: string;
}

export interface ResilientGeocodeInput {
  address?: string | null;      // free-form street address (may contain unit/side-door)
  city?: string | null;         // structured city if known
  postalCode?: string | null;   // Canadian postal code, any format
  province?: string | null;     // default "ON"
}

// ── Known Ontario city centroids (Level 6 fallback). Keys are lowercase, punctuation-free. ──
export const KNOWN_ONTARIO_CITIES: Record<string, { lat: number; lng: number }> = {
  toronto: { lat: 43.6532, lng: -79.3832 },
  scarborough: { lat: 43.7731, lng: -79.2578 },
  "north york": { lat: 43.7615, lng: -79.4111 },
  etobicoke: { lat: 43.6205, lng: -79.5132 },
  mississauga: { lat: 43.5890, lng: -79.6441 },
  brampton: { lat: 43.7315, lng: -79.7624 },
  vaughan: { lat: 43.8361, lng: -79.4983 },
  markham: { lat: 43.8561, lng: -79.3370 },
  "richmond hill": { lat: 43.8828, lng: -79.4403 },
  oakville: { lat: 43.4675, lng: -79.6877 },
  burlington: { lat: 43.3255, lng: -79.7990 },
  ajax: { lat: 43.8509, lng: -79.0204 },
  pickering: { lat: 43.8354, lng: -79.0868 },
  oshawa: { lat: 43.8971, lng: -78.8658 },
  whitby: { lat: 43.8975, lng: -78.9429 },
  barrie: { lat: 44.3894, lng: -79.6903 },
  hamilton: { lat: 43.2557, lng: -79.8711 },
  kitchener: { lat: 43.4516, lng: -80.4925 },
  waterloo: { lat: 43.4643, lng: -80.5204 },
  cambridge: { lat: 43.3616, lng: -80.3144 },
  london: { lat: 42.9849, lng: -81.2453 },
  windsor: { lat: 42.3149, lng: -83.0364 },
  "st catharines": { lat: 43.1594, lng: -79.2469 },
  "saint catharines": { lat: 43.1594, lng: -79.2469 },
  "niagara falls": { lat: 43.0896, lng: -79.0849 },
  guelph: { lat: 43.5448, lng: -80.2482 },
  kingston: { lat: 44.2312, lng: -76.4860 },
  peterborough: { lat: 44.3091, lng: -78.3197 },
  ottawa: { lat: 45.4215, lng: -75.6972 },
  newmarket: { lat: 44.0592, lng: -79.4613 },
  aurora: { lat: 44.0065, lng: -79.4504 },
  milton: { lat: 43.5183, lng: -79.8774 },
  innisfil: { lat: 44.3023, lng: -79.5833 },
  orillia: { lat: 44.6083, lng: -79.4208 },
  bradford: { lat: 44.1145, lng: -79.5625 },
  alliston: { lat: 44.1530, lng: -79.8665 },
  cobourg: { lat: 43.9594, lng: -78.1677 },
  belleville: { lat: 44.1628, lng: -77.3832 },
  welland: { lat: 42.9922, lng: -79.2483 },
  "stoney creek": { lat: 43.2173, lng: -79.7652 },
  georgetown: { lat: 43.6526, lng: -79.9178 },
  dundas: { lat: 43.2667, lng: -79.9553 },
  woodstock: { lat: 43.1306, lng: -80.7565 },
  courtice: { lat: 43.8768, lng: -78.8065 },
  brantford: { lat: 43.1394, lng: -80.2644 },
  sarnia: { lat: 42.9745, lng: -82.4066 },
  "thunder bay": { lat: 48.3809, lng: -89.2477 },
  sudbury: { lat: 46.4917, lng: -80.9930 },
  "sault ste marie": { lat: 46.5136, lng: -84.3358 },
  "sault ste. marie": { lat: 46.5136, lng: -84.3358 },
  midland: { lat: 44.7494, lng: -79.8873 },
  collingwood: { lat: 44.5001, lng: -80.2170 },
  bowmanville: { lat: 43.9126, lng: -78.6882 },
  orangeville: { lat: 43.9197, lng: -80.0943 },
  stouffville: { lat: 43.9700, lng: -79.2454 },
  keswick: { lat: 44.2296, lng: -79.4679 },
  "wasaga beach": { lat: 44.5204, lng: -80.0167 },
  penetanguishene: { lat: 44.7676, lng: -79.9379 },
  gravenhurst: { lat: 44.9188, lng: -79.3736 },
  bracebridge: { lat: 45.0376, lng: -79.3124 },
  huntsville: { lat: 45.3258, lng: -79.2160 },
  "north bay": { lat: 46.3091, lng: -79.4608 },
  timmins: { lat: 48.4758, lng: -81.3305 },
  cornwall: { lat: 45.0213, lng: -74.7307 },
  stratford: { lat: 43.3700, lng: -80.9823 },
  "owen sound": { lat: 44.5691, lng: -80.9406 },
  "port hope": { lat: 43.9516, lng: -78.2913 },
  lindsay: { lat: 44.3491, lng: -78.7394 },
  caledon: { lat: 43.8621, lng: -79.8755 },
  clarington: { lat: 43.9352, lng: -78.6084 },
  uxbridge: { lat: 44.1085, lng: -79.1188 },
};

const PLACEHOLDER_RE = /^(n\/?a|unknown|test|none|null|-+)$/i;
const CANADIAN_POSTAL_RE = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

function isPlaceholder(v: string | null | undefined): boolean {
  if (!v) return true;
  const t = v.trim();
  return t.length === 0 || PLACEHOLDER_RE.test(t);
}

export function normalizePostalCode(raw: string | null | undefined): { compact: string; spaced: string; fsa: string } | null {
  if (!raw) return null;
  const compact = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (compact.length < 3) return null;
  const spaced = compact.length === 6 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact;
  const fsa = compact.slice(0, 3);
  if (!/^[A-Z]\d[A-Z]$/.test(fsa)) return null;
  return { compact, spaced, fsa };
}

/**
 * Extract a likely city from a free-form address string.
 * Handles both comma-separated ("162 Caledon st, Sault Ste Marie, ON")
 * and space-only tail forms ("831 Sarah Blvd Midland").
 */
export function extractCity(addr: string | null | undefined, structuredCity?: string | null): string | null {
  if (structuredCity && !isPlaceholder(structuredCity)) {
    return structuredCity.trim();
  }
  if (!addr) return null;
  const normalized = addr.replace(/\s+/g, " ").trim();
  // Try comma-delimited last (skipping province/postal/unit).
  const parts = normalized.split(",").map((s) => s.trim()).filter(Boolean);
  const provinceRe = /^(ON|Ontario|Canada|CA)$/i;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (provinceRe.test(p)) continue;
    if (CANADIAN_POSTAL_RE.test(p)) continue;
    if (/^(unit|suite|apt|apartment|#)\b/i.test(p)) continue;
    if (/^\d/.test(p)) continue; // starts with a number → likely street
    return p.replace(/\s+/g, " ").trim();
  }
  // Space-only form: match tail tokens against known city table (longest-match wins).
  const lower = normalized.toLowerCase();
  let best: string | null = null;
  let bestLen = 0;
  for (const cityKey of Object.keys(KNOWN_ONTARIO_CITIES)) {
    if (lower.includes(cityKey) && cityKey.length > bestLen) {
      best = cityKey.replace(/\b\w/g, (c) => c.toUpperCase());
      bestLen = cityKey.length;
    }
  }
  return best;
}

/**
 * Strip unit / apartment / side-door / suite noise from a street query.
 * Preserves the civic number and street name.
 */
export function stripUnitNoise(addr: string): string {
  return addr
    .replace(/,?\s*(unit|suite|apt\.?|apartment|#)\s*[A-Za-z0-9-]+/gi, "")
    .replace(/,?\s*(side\s*door|back\s*door|front\s*door|rear\s*entrance)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Transient HTTP statuses / error codes that warrant a retry.
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

interface NominatimHit {
  lat: string;
  lon: string;
  importance?: number;
  type?: string;
  class?: string;
}

interface NominatimResponse {
  ok: boolean;
  transient: boolean;
  hits: NominatimHit[];
  errorCode: string | null;
  errorMessage: string | null;
}

async function callNominatim(url: string, timeoutMs = 6000): Promise<NominatimResponse> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": "PSWDirect/1.0", "Accept-Language": "en-CA" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const transient = TRANSIENT_STATUSES.has(res.status);
      return {
        ok: false,
        transient,
        hits: [],
        errorCode: res.status === 429 ? "RATE_LIMITED" : `HTTP_${res.status}`,
        errorMessage: `Nominatim HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as NominatimHit[];
    return { ok: true, transient: false, hits: Array.isArray(data) ? data : [], errorCode: null, errorMessage: null };
  } catch (e) {
    return {
      ok: false,
      transient: true,
      hits: [],
      errorCode: "API_TIMEOUT",
      errorMessage: String((e as Error)?.message || e),
    };
  }
}

async function tryStage(url: string, maxRetries = 1): Promise<{ hit: NominatimHit | null; errorCode: string | null; errorMessage: string | null; attempts: number }> {
  let attempts = 0;
  let errorCode: string | null = null;
  let errorMessage: string | null = null;
  for (let i = 0; i <= maxRetries; i++) {
    attempts++;
    const r = await callNominatim(url);
    if (r.ok && r.hits.length > 0) return { hit: r.hits[0], errorCode: null, errorMessage: null, attempts };
    if (r.ok && r.hits.length === 0) {
      // ZERO_RESULTS is not transient — don't burn retries.
      return { hit: null, errorCode: "ZERO_RESULTS", errorMessage: "No matches", attempts };
    }
    errorCode = r.errorCode;
    errorMessage = r.errorMessage;
    if (!r.transient) break;
    // Exponential backoff with jitter.
    const delay = 400 * Math.pow(2, i) + Math.floor(Math.random() * 200);
    await new Promise((res) => setTimeout(res, delay));
  }
  return { hit: null, errorCode, errorMessage, attempts };
}

function precisionFromHit(hit: NominatimHit, level: number): GeocodePrecision {
  const type = (hit.type || "").toLowerCase();
  if (level >= 5) return "city";
  if (level >= 3) return "postal_code";
  if (type === "house" || type === "building") return "rooftop";
  return "street";
}

/**
 * Run the full resilient geocoding pipeline. Never throws.
 * Returns GeocodeResult on any usable coordinate; GeocodeFailure if every stage failed.
 */
export async function resilientGeocode(input: ResilientGeocodeInput): Promise<GeocodeResult | GeocodeFailure> {
  const province = (input.province && !isPlaceholder(input.province) ? input.province : "ON").trim();
  const country = "Canada";
  const rawStreet = input.address && !isPlaceholder(input.address) ? input.address.trim() : "";
  const cleanedStreet = rawStreet ? stripUnitNoise(rawStreet) : "";
  const city = extractCity(rawStreet, input.city);
  const postal = normalizePostalCode(input.postalCode);

  let totalAttempts = 0;
  let lastErrorCode: string | null = null;
  let lastErrorMessage: string | null = null;

  const stages: Array<{ level: number; source: string; url: string; query: string; confidence: number; precision: GeocodePrecision }> = [];

  // Level 1 — full address (unit stripped) + city + province + country
  if (cleanedStreet.length >= 5) {
    const q = [cleanedStreet, city, province, country].filter(Boolean).join(", ");
    stages.push({
      level: 1,
      source: "full_address",
      url: `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ca&limit=1&q=${encodeURIComponent(q)}`,
      query: q,
      confidence: 0.7,
      precision: "street",
    });
    // Level 2 — street + city + province (drop country, drop unit noise)
    if (city) {
      const q2 = [cleanedStreet, city, province].filter(Boolean).join(", ");
      stages.push({
        level: 2,
        source: "street_city_province",
        url: `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ca&limit=1&q=${encodeURIComponent(q2)}`,
        query: q2,
        confidence: 0.6,
        precision: "street",
      });
    }
  }

  // Level 3 — postal (spaced) + city + province
  if (postal) {
    const q3 = [postal.spaced, city, province, country].filter(Boolean).join(", ");
    stages.push({
      level: 3,
      source: "postal_full",
      url: `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ca&limit=1&q=${encodeURIComponent(q3)}`,
      query: q3,
      confidence: 0.5,
      precision: "postal_code",
    });
    // Level 4 — postal code centroid via structured endpoint
    stages.push({
      level: 4,
      source: "postal_centroid",
      url: `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postal.spaced)}&country=CA&format=json&limit=1`,
      query: postal.spaced,
      confidence: 0.35,
      precision: "postal_code",
    });
    // Level 4b — postal (compact) as final Nominatim attempt
    stages.push({
      level: 4,
      source: "postal_compact",
      url: `https://nominatim.openstreetmap.org/search?postalcode=${postal.compact}&country=CA&format=json&limit=1`,
      query: postal.compact,
      confidence: 0.3,
      precision: "postal_code",
    });
  }

  // Level 5 — city + province via Nominatim
  if (city) {
    const q5 = [city, province, country].filter(Boolean).join(", ");
    stages.push({
      level: 5,
      source: "city_province",
      url: `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ca&limit=1&q=${encodeURIComponent(q5)}`,
      query: q5,
      confidence: 0.2,
      precision: "city",
    });
  }

  for (const stage of stages) {
    const { hit, errorCode, errorMessage, attempts } = await tryStage(stage.url, 1);
    totalAttempts += attempts;
    if (errorCode) { lastErrorCode = errorCode; lastErrorMessage = errorMessage; }
    if (!hit) continue;
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (isNaN(lat) || isNaN(lng)) continue;
    if (lat < 41 || lat > 84 || lng < -142 || lng > -52) continue; // reject non-Canada
    const importance = typeof hit.importance === "number" ? hit.importance : stage.confidence;
    return {
      lat,
      lng,
      source: stage.source,
      fallback_level: stage.level,
      precision: precisionFromHit(hit, stage.level),
      confidence: Math.max(importance, stage.confidence),
      attempts: totalAttempts,
      normalized_query: stage.query,
      error_code: null,
      error_message: null,
    };
  }

  // Level 6 — known-city table (offline, always succeeds if we can identify a city)
  if (city) {
    const key = city.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
    const known = KNOWN_ONTARIO_CITIES[key];
    if (known) {
      totalAttempts += 1;
      return {
        lat: known.lat,
        lng: known.lng,
        source: "known_city_table",
        fallback_level: 6,
        precision: "city",
        confidence: 0.15,
        attempts: totalAttempts,
        normalized_query: `${city}, ${province}, ${country}`,
        error_code: null,
        error_message: null,
      };
    }
  }

  return {
    lat: null,
    lng: null,
    source: null,
    fallback_level: 0,
    precision: "unknown",
    confidence: null,
    attempts: totalAttempts,
    normalized_query: [rawStreet, city, postal?.spaced, province].filter(Boolean).join(", "),
    error_code: lastErrorCode || "ALL_STAGES_FAILED",
    error_message: lastErrorMessage || "All geocoding fallback stages failed",
  };
}

export function isGeocodeSuccess(r: GeocodeResult | GeocodeFailure): r is GeocodeResult {
  return r.lat !== null && r.lng !== null;
}

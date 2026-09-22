// Server-side Google geocoding + Places helpers.
// All calls go through the Lovable connector gateway — the provider key is
// injected by the gateway, never handled here. Never throws: callers treat a
// null result as "try the next fallback".

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const creds = () => {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!lovableKey || !connectionKey) return null;
  return { lovableKey, connectionKey };
};

export const googleMapsConfigured = () => creds() !== null;

const headers = (extra: Record<string, string> = {}) => {
  const c = creds()!;
  return {
    Authorization: `Bearer ${c.lovableKey}`,
    "X-Connection-Api-Key": c.connectionKey,
    "Content-Type": "application/json",
    ...extra,
  };
};

async function gatewayFetch(path: string, init: RequestInit, timeoutMs = 7000): Promise<Response | null> {
  if (!creds()) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${GATEWAY_URL}${path}`, { ...init, signal: ctrl.signal });
  } catch (e) {
    console.error("Google gateway request failed:", String((e as Error)?.message || e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type GooglePrecision = "rooftop" | "street" | "postal_code" | "city" | "unknown";

export interface GoogleGeocodeHit {
  lat: number;
  lng: number;
  formatted: string;
  precision: GooglePrecision;
  partialMatch: boolean;
}

const precisionFromLocationType = (locationType: string | undefined, types: string[]): GooglePrecision => {
  if (locationType === "ROOFTOP") return "rooftop";
  if (types.includes("postal_code")) return "postal_code";
  if (types.includes("locality") || types.includes("administrative_area_level_2")) return "city";
  if (locationType === "RANGE_INTERPOLATED" || locationType === "GEOMETRIC_CENTER") return "street";
  return "unknown";
};

/**
 * Geocode a free-form Canadian address with the Google Geocoding API.
 * Returns null when Google has no usable answer (caller falls back).
 */
export async function googleGeocodeAddress(
  query: string,
  opts: { components?: string } = {},
): Promise<GoogleGeocodeHit | null> {
  const trimmed = (query || "").trim();
  if (trimmed.length < 4) return null;
  const components = opts.components ?? "country:CA";
  const res = await gatewayFetch(
    `/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&components=${encodeURIComponent(components)}&region=ca`,
    { method: "GET", headers: headers() },
  );
  if (!res) return null;
  if (!res.ok) {
    console.error(`Google geocode HTTP ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json().catch(() => null) as
    | { status?: string; results?: Array<Record<string, unknown>>; error_message?: string }
    | null;
  if (!data || data.status !== "OK" || !data.results?.length) {
    if (data?.status && data.status !== "ZERO_RESULTS") {
      console.error(`Google geocode status ${data.status}: ${data.error_message ?? ""}`);
    }
    return null;
  }
  const top = data.results[0] as {
    geometry?: { location?: { lat?: number; lng?: number }; location_type?: string };
    formatted_address?: string;
    types?: string[];
    partial_match?: boolean;
  };
  const lat = Number(top.geometry?.location?.lat);
  const lng = Number(top.geometry?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    formatted: top.formatted_address ?? trimmed,
    precision: precisionFromLocationType(top.geometry?.location_type, top.types ?? []),
    partialMatch: !!top.partial_match,
  };
}

/** Postal-code centroid via Google (far better Canadian coverage than OSM). */
export async function googleGeocodePostal(postalCode: string): Promise<GoogleGeocodeHit | null> {
  const pc = (postalCode || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (pc.length < 3) return null;
  const spaced = pc.length >= 6 ? `${pc.slice(0, 3)} ${pc.slice(3, 6)}` : pc;
  return await googleGeocodeAddress(spaced, { components: `country:CA|postal_code:${spaced}` });
}

// ── Places (New) ─────────────────────────────────────────────────────────────

export interface PlaceSuggestionDTO {
  placeId: string;
  primary: string;
  secondary: string;
  text: string;
}

export async function placesAutocomplete(
  input: string,
  sessionToken?: string,
  region = "ca",
): Promise<PlaceSuggestionDTO[]> {
  const trimmed = (input || "").trim().slice(0, 200);
  if (trimmed.length < 3) return [];
  const res = await gatewayFetch("/places/v1/places:autocomplete", {
    method: "POST",
    headers: headers({
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
    }),
    body: JSON.stringify({
      input: trimmed,
      includedRegionCodes: [region],
      ...(sessionToken ? { sessionToken } : {}),
    }),
  });
  if (!res) return [];
  if (!res.ok) {
    console.error(`Places autocomplete HTTP ${res.status}: ${await res.text()}`);
    return [];
  }
  const data = await res.json().catch(() => null) as
    | { suggestions?: Array<{ placePrediction?: Record<string, unknown> }> }
    | null;
  return (data?.suggestions ?? [])
    .map((s) => s.placePrediction as
      | {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
        }
      | undefined)
    .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
    .map((p) => ({
      placeId: p.placeId!,
      primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
      text: p.text?.text ?? "",
    }));
}

export interface PlaceAddressDTO {
  streetNumber: string;
  streetName: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  displayName: string;
}

interface AddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

const componentOf = (components: AddressComponent[], type: string, short = false) => {
  const hit = components.find((c) => (c.types ?? []).includes(type));
  if (!hit) return "";
  return (short ? hit.shortText : hit.longText) ?? "";
};

const toAddress = (place: {
  addressComponents?: AddressComponent[];
  formattedAddress?: string;
  displayName?: { text?: string } | string;
  location?: { latitude?: number; longitude?: number };
}): PlaceAddressDTO | null => {
  const c = place.addressComponents ?? [];
  const lat = Number(place.location?.latitude);
  const lng = Number(place.location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  const display =
    typeof place.displayName === "string" ? place.displayName : place.displayName?.text ?? "";
  return {
    streetNumber: componentOf(c, "street_number"),
    streetName: componentOf(c, "route"),
    city:
      componentOf(c, "locality") ||
      componentOf(c, "postal_town") ||
      componentOf(c, "administrative_area_level_3") ||
      componentOf(c, "administrative_area_level_2"),
    province: componentOf(c, "administrative_area_level_1", true),
    postalCode: componentOf(c, "postal_code").toUpperCase(),
    lat,
    lng,
    displayName: place.formattedAddress ?? display,
  };
};

const DETAILS_MASK = "id,addressComponents,formattedAddress,location,displayName";

export async function placeDetails(placeId: string, sessionToken?: string): Promise<PlaceAddressDTO | null> {
  const id = (placeId || "").trim();
  if (!id || id.length > 300 || /[?#/]/.test(id)) return null;
  const qs = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
  const res = await gatewayFetch(`/places/v1/places/${encodeURIComponent(id)}${qs}`, {
    method: "GET",
    headers: headers({ "X-Goog-FieldMask": DETAILS_MASK }),
  });
  if (!res) return null;
  if (!res.ok) {
    console.error(`Place details HTTP ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json().catch(() => null);
  return data ? toAddress(data) : null;
}

export async function placesTextSearch(query: string, region = "ca"): Promise<PlaceAddressDTO | null> {
  const trimmed = (query || "").trim().slice(0, 300);
  if (trimmed.length < 4) return null;
  const res = await gatewayFetch("/places/v1/places:searchText", {
    method: "POST",
    headers: headers({
      "X-Goog-FieldMask":
        "places.id,places.addressComponents,places.formattedAddress,places.location,places.displayName",
    }),
    body: JSON.stringify({ textQuery: trimmed, regionCode: region.toUpperCase(), pageSize: 1 }),
  });
  if (!res) return null;
  if (!res.ok) {
    console.error(`Places text search HTTP ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json().catch(() => null) as { places?: unknown[] } | null;
  const first = data?.places?.[0];
  return first ? toAddress(first as Parameters<typeof toAddress>[0]) : null;
}

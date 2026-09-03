// Geocode sanity validation.
// Nominatim frequently matches a generic street name ("33 Main Street") in the wrong
// part of Ontario. This helper cross-checks a candidate coordinate against the
// booking's postal-code centroid and rejects matches that are impossibly far away.

import { normalizePostalCode, KNOWN_ONTARIO_CITIES, extractCity } from "./resilientGeocode.ts";

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function nominatimPoint(url: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "PSWDirect/1.0", "Accept-Language": "en-CA" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Free FSA centroid lookup (Zippopotam) — Nominatim has poor Canadian postal coverage. */
async function fsaPoint(fsa: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://api.zippopotam.us/CA/${encodeURIComponent(fsa)}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    const lat = parseFloat(place?.latitude);
    const lng = parseFloat(place?.longitude);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Postal-code (or city) reference point used to validate a street-level match. */
export async function referencePoint(
  postalCode: string | null | undefined,
  address?: string | null,
  city?: string | null,
): Promise<{ lat: number; lng: number; source: "postal" | "city" } | null> {
  const postal = normalizePostalCode(postalCode);
  if (postal) {
    const p =
      (await nominatimPoint(
        `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postal.spaced)}&country=CA&format=json&limit=1`,
      )) ||
      (await nominatimPoint(
        `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postal.fsa)}&country=CA&format=json&limit=1`,
      )) ||
      (await fsaPoint(postal.fsa));
    if (p) return { ...p, source: "postal" };
  }
  const c = extractCity(address, city);
  if (c) {
    const known = KNOWN_ONTARIO_CITIES[c.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim()];
    if (known) return { lat: known.lat, lng: known.lng, source: "city" };
  }
  return null;
}

export interface SanityOutcome {
  ok: boolean;
  distanceKm: number | null;
  reference: { lat: number; lng: number; source: "postal" | "city" } | null;
}

/**
 * Returns ok:false when the candidate is further than `maxKm` from the postal/city
 * reference point — i.e. Nominatim matched the wrong town.
 */
export async function validateGeocode(
  lat: number,
  lng: number,
  opts: { postalCode?: string | null; address?: string | null; city?: string | null; maxKm?: number },
): Promise<SanityOutcome> {
  const maxKm = opts.maxKm ?? 35;
  const ref = await referencePoint(opts.postalCode, opts.address, opts.city);
  if (!ref) return { ok: true, distanceKm: null, reference: null };
  const distanceKm = haversineKm(lat, lng, ref.lat, ref.lng);
  return { ok: distanceKm <= maxKm, distanceKm, reference: ref };
}

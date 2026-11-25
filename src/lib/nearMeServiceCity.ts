import { SEO_CITIES } from "./seoCityData";
import { ONTARIO_CUSTOMER_CITIES } from "./ontarioCustomerCities";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^(city|town|township|municipality|village) of\s+/, "")
    .replace(/[^a-z0-9]+/g, " ").trim();

const INDEX = new Map<string, string>();
for (const c of [...SEO_CITIES, ...ONTARIO_CUSTOMER_CITIES]) {
  if (!INDEX.has(norm(c.label))) INDEX.set(norm(c.label), c.label);
}
INDEX.set("old toronto", "Toronto");

/**
 * Maps a reverse-geocoded place to a known Ontario service city label (city-level only).
 * Returns null when the province is not Ontario or the place is not in the catalog —
 * callers must never fall back to a default city.
 */
export function matchOntarioServiceCity(candidates: (string | undefined | null)[], province?: string | null): string | null {
  if (!province || norm(province) !== "ontario") return null;
  for (const c of candidates) {
    if (!c) continue;
    const hit = INDEX.get(norm(c));
    if (hit) return hit;
  }
  return null;
}

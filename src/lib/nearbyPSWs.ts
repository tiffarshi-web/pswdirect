// Public caregiver helpers.
// - Caregiver cards come ONLY from get_public_psws_by_city, which returns
//   caregivers who explicitly opted in to public display and are approved,
//   active, non-test, non-archived, not banned, with a current police check.
// - Coverage uses get_city_coverage_public: yes/no + languages only, no identities.
// No distance, home location, gender, experience or document status is public.

import { supabase } from "@/integrations/supabase/client";
import { SEO_CITY_CENTERS } from "@/lib/seoCityData";

/** First word of the stored first name only, capitalized; never a surname. */
export const publicFirstName = (raw: string): string => {
  const w = raw.trim().split(/\s+/)[0] ?? "";
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : "";
};

export interface NearbyPSW {
  first_name: string;
  last_name: string; // initial only, e.g. "M."
  home_city: string | null; // coarse service city
  years_experience: string | null; // always null on public surfaces
  languages: string[] | null;
  gender: string | null; // always null on public surfaces
  profile_photo_url: string | null; // only with separate photo consent
  certifications: string | null; // always null on public surfaces
  public_summary: string | null; // only when office-approved
  distanceKm: number; // always 0; distance is never public
}

export const CITY_CENTERS = SEO_CITY_CENTERS;

export interface PublicPswRow {
  first_name: string | null;
  last_initial: string | null;
  service_city: string | null;
  languages: string[] | null;
  profile_photo_url: string | null;
  public_summary: string | null;
}

/** Maps consent-filtered rows to card data; drops rows without a display name. */
export const mapPublicPswRows = (rows: PublicPswRow[] | null | undefined): NearbyPSW[] =>
  (rows ?? [])
    .filter((r) => typeof r?.first_name === "string" && publicFirstName(r.first_name).length > 0)
    .map((r) => ({
      first_name: publicFirstName(r.first_name!),
      last_name: "",
      home_city: r.service_city ?? null,
      years_experience: null,
      languages: Array.isArray(r.languages) ? r.languages : null,
      gender: null,
      profile_photo_url: r.profile_photo_url ?? null,
      certifications: null,
      public_summary: r.public_summary ?? null,
      distanceKm: 0,
    }));

/** Consent-filtered caregiver cards for a city. Returns [] on any error. */
export const getPublicPSWsByCity = async (city: string): Promise<NearbyPSW[]> => {
  const { data, error } = await (supabase as any).rpc("get_public_psws_by_city", { p_city: city });
  if (error) return [];
  return mapPublicPswRows(data as PublicPswRow[]);
};

/** Backwards-compatible name; radius is ignored (matching is by service city). */
export const getNearbyPSWsByCity = async (city: string, _radiusKm?: number): Promise<NearbyPSW[]> =>
  getPublicPSWsByCity(city);

export interface CoverageInventory {
  hasCoverage: boolean;
  languages: string[];
}

/** Aggregate-only coverage evidence. Returns null when the lookup fails. */
export const getCoverageInventory = async (lat: number, lng: number, radiusKm: number): Promise<CoverageInventory | null> => {
  const { data, error } = await (supabase as any).rpc("get_city_coverage_public", {
    p_lat: lat, p_lng: lng, p_radius_km: radiusKm,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return {
    hasCoverage: row.has_coverage === true,
    languages: Array.isArray(row.languages) ? row.languages : [],
  };
};

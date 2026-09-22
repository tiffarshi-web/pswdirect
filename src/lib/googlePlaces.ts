// Address lookup helpers — all Google Places calls run on the server
// (`google-places` backend function) through the connector gateway.
// The browser never calls Google Places directly: the managed browser key is
// only authorised for map rendering.

import { supabase } from "@/integrations/supabase/client";

export interface PlaceSuggestion {
  placeId: string;
  primary: string;
  secondary: string;
  text: string;
}

export interface PlaceAddress {
  streetNumber: string;
  streetName: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  displayName: string;
}

type PlacesPayload = Record<string, unknown>;

const callPlaces = async <T>(body: PlacesPayload): Promise<T | null> => {
  const { data, error } = await supabase.functions.invoke("google-places", { body });
  if (error) {
    console.error("Address lookup failed:", error.message);
    return null;
  }
  return (data ?? null) as T | null;
};

/** Session token keeps autocomplete + details billed as one session. */
export const newSessionToken = async (): Promise<string> =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const fetchAddressSuggestions = async (
  input: string,
  sessionToken?: unknown,
  region = "ca",
): Promise<PlaceSuggestion[]> => {
  const trimmed = input.trim();
  if (trimmed.length < 3) return [];
  const res = await callPlaces<{ suggestions?: PlaceSuggestion[] }>({
    action: "autocomplete",
    input: trimmed,
    sessionToken: typeof sessionToken === "string" ? sessionToken : undefined,
    region,
  });
  return res?.suggestions ?? [];
};

export const fetchPlaceAddress = async (
  placeId: string,
  sessionToken?: unknown,
): Promise<PlaceAddress | null> => {
  const res = await callPlaces<{ place?: PlaceAddress | null }>({
    action: "details",
    placeId,
    sessionToken: typeof sessionToken === "string" ? sessionToken : undefined,
  });
  return res?.place ?? null;
};

/** Free-text geocode via Google Places text search (server-side). */
export const geocodeViaPlaces = async (
  query: string,
  region = "ca",
): Promise<PlaceAddress | null> => {
  const trimmed = query.trim();
  if (trimmed.length < 4) return null;
  const res = await callPlaces<{ place?: PlaceAddress | null }>({
    action: "geocode",
    query: trimmed,
    region,
  });
  return res?.place ?? null;
};

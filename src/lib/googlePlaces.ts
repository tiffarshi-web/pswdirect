// Google Places (New) browser helpers — the single source of address lookup
// and geocoding in the client. No OpenStreetMap / Nominatim anywhere.
//
// Uses the referrer-restricted browser key through the Maps JavaScript API,
// which is authorised for Places (New). Server-side geocoding stays in the
// edge functions.

import { loadGoogleMaps } from "@/components/maps/GoogleMapCompat";

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

type PlacesLib = google.maps.PlacesLibrary;

let placesLib: PlacesLib | null = null;

const getPlaces = async (): Promise<PlacesLib> => {
  if (placesLib) return placesLib;
  await loadGoogleMaps();
  placesLib = (await google.maps.importLibrary("places")) as PlacesLib;
  return placesLib;
};

/** Session token keeps autocomplete + details billed as one session. */
export const newSessionToken = async () => {
  const { AutocompleteSessionToken } = await getPlaces();
  return new AutocompleteSessionToken();
};

export const fetchAddressSuggestions = async (
  input: string,
  sessionToken?: unknown,
  region = "ca",
): Promise<PlaceSuggestion[]> => {
  const trimmed = input.trim();
  if (trimmed.length < 3) return [];
  const { AutocompleteSuggestion } = await getPlaces();
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: trimmed,
    includedRegionCodes: [region],
    sessionToken: sessionToken as google.maps.places.AutocompleteSessionToken | undefined,
  });
  return suggestions
    .map((s) => s.placePrediction)
    .filter((p): p is google.maps.places.PlacePrediction => !!p)
    .map((p) => ({
      placeId: p.placeId,
      primary: p.mainText?.toString() ?? p.text.toString(),
      secondary: p.secondaryText?.toString() ?? "",
      text: p.text.toString(),
    }));
};

const componentOf = (
  components: google.maps.places.AddressComponent[] | null | undefined,
  type: string,
  short = false,
): string => {
  const hit = components?.find((c) => c.types.includes(type));
  if (!hit) return "";
  return (short ? hit.shortText : hit.longText) ?? "";
};

const toAddress = (place: google.maps.places.Place): PlaceAddress => {
  const c = place.addressComponents;
  const city =
    componentOf(c, "locality") ||
    componentOf(c, "postal_town") ||
    componentOf(c, "administrative_area_level_3") ||
    componentOf(c, "administrative_area_level_2");
  return {
    streetNumber: componentOf(c, "street_number"),
    streetName: componentOf(c, "route"),
    city,
    province: componentOf(c, "administrative_area_level_1", true),
    postalCode: componentOf(c, "postal_code").toUpperCase(),
    lat: place.location?.lat() ?? 0,
    lng: place.location?.lng() ?? 0,
    displayName: place.formattedAddress ?? place.displayName ?? "",
  };
};

const DETAIL_FIELDS = ["addressComponents", "formattedAddress", "location", "displayName"];

export const fetchPlaceAddress = async (
  placeId: string,
  sessionToken?: unknown,
): Promise<PlaceAddress | null> => {
  const { Place } = await getPlaces();
  const place = new Place({ id: placeId });
  await place.fetchFields({
    fields: DETAIL_FIELDS,
    ...(sessionToken ? { sessionToken } : {}),
  } as google.maps.places.FetchFieldsRequest);
  const resolved = toAddress(place);
  return resolved.lat && resolved.lng ? resolved : null;
};

/** Free-text geocode via Places text search (browser-key authorised). */
export const geocodeViaPlaces = async (
  query: string,
  region = "ca",
): Promise<PlaceAddress | null> => {
  const trimmed = query.trim();
  if (trimmed.length < 4) return null;
  const { Place } = await getPlaces();
  const { places } = await Place.searchByText({
    textQuery: trimmed,
    fields: DETAIL_FIELDS,
    region,
    maxResultCount: 1,
  });
  if (!places?.length) return null;
  const resolved = toAddress(places[0]);
  return resolved.lat && resolved.lng ? resolved : null;
};

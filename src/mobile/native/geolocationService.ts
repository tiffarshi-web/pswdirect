import { Geolocation } from "@capacitor/geolocation";
import { isNativeApp } from "./platform";

export type LocationPermissionState = "granted" | "denied" | "limited" | "prompt" | "unavailable";

export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
}

export type LocationResult =
  | { status: "ok"; fix: LocationFix }
  | { status: "denied" | "limited" | "unavailable" | "timeout"; message: string };

export const LOCATION_RATIONALE =
  "PSW Direct uses your location only when you check in or out of a shift, to confirm you are at the visit address. It is never tracked in the background.";

const MESSAGES: Record<Exclude<LocationResult["status"], "ok">, string> = {
  denied:
    "Location is turned off for PSW Direct. Turn it on in your phone settings to check in or out of a shift.",
  limited:
    "Your phone is only sharing an approximate location. Allow precise location so your check-in can be confirmed.",
  unavailable: "Location is not available on this device right now. Try again in a moment.",
  timeout: "We could not get a location fix. Move outdoors or near a window and try again.",
};

export async function currentPermission(): Promise<LocationPermissionState> {
  try {
    if (!isNativeApp()) {
      if (typeof navigator === "undefined" || !navigator.geolocation) return "unavailable";
      if (!navigator.permissions?.query) return "prompt";
      const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      return status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt";
    }
    const status = await Geolocation.checkPermissions();
    return normalize(status.location, status.coarseLocation);
  } catch {
    return "unavailable";
  }
}

function normalize(fine?: string, coarse?: string): LocationPermissionState {
  if (fine === "granted") return "granted";
  if (coarse === "granted") return "limited";
  if (fine === "denied") return "denied";
  return "prompt";
}

/** Only call this after the caller has shown LOCATION_RATIONALE in the UI. */
export async function requestPermission(): Promise<LocationPermissionState> {
  try {
    if (!isNativeApp()) return currentPermission();
    const status = await Geolocation.requestPermissions({ permissions: ["location"] });
    return normalize(status.location, status.coarseLocation);
  } catch {
    return "unavailable";
  }
}

export async function getShiftLocation(timeoutMs = 15000): Promise<LocationResult> {
  const permission = await currentPermission();
  if (permission === "denied") return { status: "denied", message: MESSAGES.denied };
  if (permission === "unavailable") return { status: "unavailable", message: MESSAGES.unavailable };

  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 0,
    });
    return {
      status: "ok",
      fix: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("denied") || message.includes("permission")) {
      return { status: "denied", message: MESSAGES.denied };
    }
    if (message.includes("timeout")) return { status: "timeout", message: MESSAGES.timeout };
    return { status: "unavailable", message: MESSAGES.unavailable };
  }
}

/** Straight-line metres between two points; used only for display to the worker. */
export function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function describeDistance(metres: number): string {
  if (metres < 1000) return `${metres} m from the visit address`;
  return `${(metres / 1000).toFixed(1)} km from the visit address`;
}

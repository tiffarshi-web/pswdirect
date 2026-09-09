import { Browser } from "@capacitor/browser";
import { isNativeApp, nativePlatform } from "./platform";

export interface DirectionsTarget {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

export type DirectionsResult = { opened: true; url: string } | { opened: false; reason: string };

/**
 * Builds a URL the installed map application can handle. No Maps API key is
 * needed or embedded for this — it is a plain external navigation hand-off.
 */
export function buildDirectionsUrl(target: DirectionsTarget, platform = nativePlatform()): string | null {
  const hasCoords =
    typeof target.latitude === "number" &&
    typeof target.longitude === "number" &&
    Number.isFinite(target.latitude) &&
    Number.isFinite(target.longitude);

  if (hasCoords) {
    const coords = `${target.latitude},${target.longitude}`;
    if (platform === "ios") return `maps://?daddr=${coords}&dirflg=d`;
    if (platform === "android") return `geo:${coords}?q=${encodeURIComponent(coords)}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`;
  }

  const address = target.address?.trim();
  if (!address) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export async function openDirections(target: DirectionsTarget): Promise<DirectionsResult> {
  const url = buildDirectionsUrl(target);
  if (!url) {
    return { opened: false, reason: "This visit has no saved location yet. Contact the office for directions." };
  }

  try {
    if (isNativeApp()) {
      await Browser.open({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return { opened: true, url };
  } catch {
    // Some devices have no map application installed at all.
    const fallback = buildDirectionsUrl(target, "web");
    if (fallback && fallback !== url) {
      try {
        await Browser.open({ url: fallback });
        return { opened: true, url: fallback };
      } catch {
        /* fall through */
      }
    }
    return { opened: false, reason: "No map application is available on this device." };
  }
}

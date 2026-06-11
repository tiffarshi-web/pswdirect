/// <reference types="google.maps" />
// Google Maps renderer for the admin map.
// Same prop contract as LeafletAdminMap — interchangeable behind UnifiedAdminMap.
// Loads the Maps JS API on demand with the browser key from the Google Maps connector.
// IMPORTANT: managed browser key is referrer-restricted to *.lovable.app.
// On custom domains (pswdirect.ca) a user-owned API key + referrer allowlist is required.

import { useEffect, useRef, useState, useCallback } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Loader2 } from "lucide-react";
import { PSWPopupContent, OrderPopupContent } from "./MapPopups";
import type { AdminMapRendererProps, OrderBucket, OrderRow, PSWRow } from "./types";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

// Marker colour by entity type — matches Leaflet palette as closely as possible.
const ORDER_COLOR: Record<OrderBucket, string> = {
  open: "#ef4444",       // red
  pending: "#f97316",    // orange
  assigned: "#3b82f6",   // blue
  active: "#16a34a",     // green
  unserved: "#111827",   // near-black
  completed: "#9ca3af",  // grey
};
const PSW_AVAILABLE_COLOR = "#22c55e";
const PSW_ON_SHIFT_COLOR = "#8b5cf6";

// --- Maps JS loader ---------------------------------------------------------
let mapsLoadPromise: Promise<typeof google> | null = null;
const loadGoogleMaps = (): Promise<typeof google> => {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (mapsLoadPromise) return mapsLoadPromise;
  if (!BROWSER_KEY) {
    return Promise.reject(new Error("Google Maps browser key is not configured"));
  }

  mapsLoadPromise = new Promise((resolve, reject) => {
    const cbName = `__lovableInitGoogleMaps_${Date.now()}`;
    (window as any)[cbName] = () => {
      resolve((window as any).google);
      delete (window as any)[cbName];
    };
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: "async",
      callback: cbName,
      libraries: "marker",
    });
    if (CHANNEL) params.set("channel", CHANNEL);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps JS API"));
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
};

// --- SVG marker icon factory (no AdvancedMarkerElement; no mapId needed) ---
const svgMarker = (g: typeof google, color: string): google.maps.Symbol => ({
  path: "M12 0c-4.4 0-8 3.6-8 8 0 6 8 16 8 16s8-10 8-16c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z",
  fillColor: color,
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 1.5,
  scale: 1.4,
  anchor: new g.maps.Point(12, 24),
});

interface MountedMarker {
  marker: google.maps.Marker;
  circle?: google.maps.Circle;
  popupRoot?: Root;
  popupContainer?: HTMLDivElement;
}

export const GoogleAdminMap = (props: AdminMapRendererProps) => {
  const { center, flyTarget, psws, orders, showRadii, visibleRadii, radiusKm,
    onToggleRadius, onCopy, onAssign } = props;

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const pswMarkersRef = useRef<Map<string, MountedMarker>>(new Map());
  const orderMarkersRef = useRef<Map<string, MountedMarker>>(new Map());
  const pswClustererRef = useRef<MarkerClusterer | null>(null);
  const orderClustererRef = useRef<MarkerClusterer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Stable refs for callbacks so popup React roots don't churn.
  const cbRef = useRef({ onToggleRadius, onCopy, onAssign, visibleRadii });
  cbRef.current = { onToggleRadius, onCopy, onAssign, visibleRadii };

  // Boot the map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapDivRef.current) return;
        mapRef.current = new g.maps.Map(mapDivRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: center.zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        infoRef.current = new g.maps.InfoWindow();
        pswClustererRef.current = new MarkerClusterer({ map: mapRef.current });
        orderClustererRef.current = new MarkerClusterer({ map: mapRef.current });
        setReady(true);
      })
      .catch((e) => {
        console.error("[GoogleAdminMap] load error", e);
        setError(e?.message ?? "Failed to load Google Maps");
      });
    return () => {
      cancelled = true;
      // Tear down React popup roots
      pswMarkersRef.current.forEach((m) => m.popupRoot?.unmount());
      orderMarkersRef.current.forEach((m) => m.popupRoot?.unmount());
      pswMarkersRef.current.clear();
      orderMarkersRef.current.clear();
    };
    // Boot only — viewport updates handled in separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new target.
  useEffect(() => {
    if (!ready || !mapRef.current || !flyTarget) return;
    mapRef.current.panTo({ lat: flyTarget.lat, lng: flyTarget.lng });
    mapRef.current.setZoom(flyTarget.zoom);
  }, [flyTarget, ready]);

  const openPopup = useCallback(
    (anchor: google.maps.Marker, content: React.ReactNode) => {
      const g = (window as any).google as typeof google;
      if (!g || !infoRef.current || !mapRef.current) return;
      const container = document.createElement("div");
      const root = createRoot(container);
      root.render(<>{content}</>);
      infoRef.current.setContent(container);
      infoRef.current.open({ map: mapRef.current, anchor });
      // Unmount when closed to avoid leaking React roots.
      const listener = g.maps.event.addListener(infoRef.current, "closeclick", () => {
        root.unmount();
        g.maps.event.removeListener(listener);
      });
    },
    []
  );

  // Sync PSW markers.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google as typeof google;
    const map = mapRef.current;
    const live = pswMarkersRef.current;
    const seen = new Set<string>();

    psws.forEach((p: PSWRow) => {
      seen.add(p.id);
      const wantCircle = showRadii || visibleRadii.has(p.id);
      const color = p.status === "on_shift" ? PSW_ON_SHIFT_COLOR : PSW_AVAILABLE_COLOR;
      let entry = live.get(p.id);
      if (!entry) {
        const marker = new g.maps.Marker({
          position: { lat: p.coords.lat, lng: p.coords.lng },
          icon: svgMarker(g, color),
          title: `${p.firstName} ${p.lastName}`,
        });
        marker.addListener("click", () => {
          openPopup(
            marker,
            <PSWPopupContent
              p={p}
              radiusVisible={cbRef.current.visibleRadii.has(p.id)}
              onToggleRadius={cbRef.current.onToggleRadius}
              onCopy={cbRef.current.onCopy}
            />
          );
        });
        entry = { marker };
        live.set(p.id, entry);
      } else {
        entry.marker.setPosition({ lat: p.coords.lat, lng: p.coords.lng });
        entry.marker.setIcon(svgMarker(g, color));
      }

      if (wantCircle) {
        if (!entry.circle) {
          entry.circle = new g.maps.Circle({
            map,
            center: { lat: p.coords.lat, lng: p.coords.lng },
            radius: radiusKm * 1000,
            strokeColor: "#22c55e",
            strokeOpacity: 0.8,
            strokeWeight: 1,
            fillColor: "#22c55e",
            fillOpacity: 0.06,
          });
        } else {
          entry.circle.setCenter({ lat: p.coords.lat, lng: p.coords.lng });
          entry.circle.setRadius(radiusKm * 1000);
        }
      } else if (entry.circle) {
        entry.circle.setMap(null);
        entry.circle = undefined;
      }
    });

    // Remove stale markers.
    Array.from(live.keys()).forEach((id) => {
      if (!seen.has(id)) {
        const e = live.get(id)!;
        e.marker.setMap(null);
        e.circle?.setMap(null);
        live.delete(id);
      }
    });

    // Re-sync clusterer with current marker set.
    const clusterer = pswClustererRef.current;
    if (clusterer) {
      clusterer.clearMarkers();
      clusterer.addMarkers(Array.from(live.values()).map((e) => e.marker));
    }
  }, [psws, ready, showRadii, visibleRadii, radiusKm, openPopup]);

  // Sync order markers.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google as typeof google;
    const map = mapRef.current;
    const live = orderMarkersRef.current;
    const seen = new Set<string>();

    orders.forEach((o: OrderRow) => {
      seen.add(o.id);
      const color = ORDER_COLOR[o.bucket];
      let entry = live.get(o.id);
      if (!entry) {
        const marker = new g.maps.Marker({
          position: { lat: o.coords.lat, lng: o.coords.lng },
          icon: svgMarker(g, color),
          title: o.bookingCode,
        });
        marker.addListener("click", () => {
          openPopup(
            marker,
            <OrderPopupContent o={o} onCopy={cbRef.current.onCopy} onAssign={cbRef.current.onAssign} />
          );
        });
        entry = { marker };
        live.set(o.id, entry);
      } else {
        entry.marker.setPosition({ lat: o.coords.lat, lng: o.coords.lng });
        entry.marker.setIcon(svgMarker(g, color));
      }
    });

    Array.from(live.keys()).forEach((id) => {
      if (!seen.has(id)) {
        const e = live.get(id)!;
        e.marker.setMap(null);
        live.delete(id);
      }
    });

    const clusterer = orderClustererRef.current;
    if (clusterer) {
      clusterer.clearMarkers();
      clusterer.addMarkers(Array.from(live.values()).map((e) => e.marker));
    }
  }, [orders, ready, openPopup]);

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-destructive p-6 text-center">
        Google Maps failed to load: {error}. Falling back is available by switching the Admin Map Provider to Leaflet.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-[1]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapDivRef} className="h-full w-full" />
    </div>
  );
};

export default GoogleAdminMap;

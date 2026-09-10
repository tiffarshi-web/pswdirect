import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";

type LatLngTuple = [number, number];
type LatLng = LatLngTuple | { lat: number; lng: number };
export type LatLngBoundsExpression = LatLng[];
export const latLngBounds = (points: LatLngBoundsExpression) => points;
export const mapIcon = (iconUrl: string) => ({ iconUrl });

const API_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
let mapsPromise: Promise<typeof google.maps> | null = null;

const AUTH_MESSAGE =
  "Map unavailable here. Maps are keyed to the live site — open the published app to view them.";

let authFailed = false;
const authListeners = new Set<() => void>();

// Google calls this when the key is rejected for the current address
// (e.g. inside the editor preview frame). Without it, Google paints its own
// grey "Oops! Something went wrong" panel over our UI.
(window as unknown as Record<string, unknown>).gm_authFailure = () => {
  authFailed = true;
  authListeners.forEach((listener) => listener());
};

export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    if (!API_KEY) return reject(new Error("Google Maps browser key is not configured"));
    const callback = `__pswGoogleMapsReady${Date.now()}`;
    (window as unknown as Record<string, unknown>)[callback] = () => {
      delete (window as unknown as Record<string, unknown>)[callback];
      resolve(window.google.maps);
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&callback=${callback}&loading=async&v=weekly${CHANNEL ? `&channel=${encodeURIComponent(CHANNEL)}` : ""}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

const toLiteral = (value: LatLng): google.maps.LatLngLiteral =>
  Array.isArray(value) ? { lat: value[0], lng: value[1] } : value;

const MapContext = createContext<google.maps.Map | null>(null);

export const useMap = () => {
  const map = useContext(MapContext);
  if (!map) throw new Error("useMap must be used inside MapContainer");
  return {
    getZoom: () => map.getZoom() ?? 10,
    setView: (position: LatLng, zoom?: number) => {
      map.setCenter(toLiteral(position));
      if (zoom !== undefined) map.setZoom(zoom);
    },
    flyTo: (position: LatLng, zoom?: number, _options?: unknown) => {
      map.panTo(toLiteral(position));
      if (zoom !== undefined) map.setZoom(zoom);
    },
    fitBounds: (points: unknown, options?: { padding?: [number, number]; maxZoom?: number }) => {
      const bounds = new google.maps.LatLngBounds();
      let values: unknown[] = Array.isArray(points) ? points : [];
      if (!Array.isArray(points) && points && typeof points === "object" && "getSouthWest" in points && "getNorthEast" in points) {
        const leafletBounds = points as { getSouthWest: () => { lat: number; lng: number }; getNorthEast: () => { lat: number; lng: number } };
        values = [leafletBounds.getSouthWest(), leafletBounds.getNorthEast()];
      }
      values.forEach((point) => {
        if (Array.isArray(point) || (point && typeof point === "object" && "lat" in point)) {
          bounds.extend(toLiteral(point as LatLng));
        }
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, options?.padding?.[0] ?? 40);
        if (options?.maxZoom) {
          google.maps.event.addListenerOnce(map, "idle", () => {
            if ((map.getZoom() ?? 0) > options.maxZoom!) map.setZoom(options.maxZoom);
          });
        }
      }
    },
    on: (event: string, handler: () => void) => {
      const googleEvent = event === "zoomend" ? "zoom_changed" : event;
      google.maps.event.addListener(map, googleEvent, handler);
    },
    off: (event: string, handler: () => void) => {
      const googleEvent = event === "zoomend" ? "zoom_changed" : event;
      google.maps.event.clearListeners(map, googleEvent);
      void handler;
    },
  };
};

interface MapContainerProps {
  center: LatLng;
  zoom: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  scrollWheelZoom?: boolean;
  dragging?: boolean;
  zoomControl?: boolean;
  attributionControl?: boolean;
}

export function MapContainer({ center, zoom, children, className, style, scrollWheelZoom = true, dragging = true, zoomControl = true }: MapContainerProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(authFailed ? AUTH_MESSAGE : null);

  useEffect(() => {
    const onAuthFailure = () => setError(AUTH_MESSAGE);
    authListeners.add(onAuthFailure);
    return () => { authListeners.delete(onAuthFailure); };
  }, []);

  useEffect(() => {
    let active = true;
    loadGoogleMaps()
      .then((maps) => {
        if (!active || !elementRef.current) return;
        setMap(new maps.Map(elementRef.current, {
          center: toLiteral(center), zoom, clickableIcons: false,
          scrollwheel: scrollWheelZoom, draggable: dragging, zoomControl,
          mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        }));
      })
      .catch((reason: Error) => active && setError(reason.message));
    return () => { active = false; };
  }, []);

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <div ref={elementRef} style={{ position: "absolute", inset: 0, visibility: error ? "hidden" : "visible" }} />
      {error && <div className="absolute inset-0 grid place-items-center bg-muted p-4 text-center text-sm text-muted-foreground">{error}</div>}
      {map && !error && <MapContext.Provider value={map}>{children}</MapContext.Provider>}
    </div>
  );
}

export const TileLayer = (_props: { url?: string; attribution?: string }) => null;
export const Popup = ({ children }: { children?: ReactNode }) => <>{children}</>;

const popupChild = (children: ReactNode) => Children.toArray(children).find((child) => isValidElement(child) && child.type === Popup) as ReactElement<{ children?: ReactNode }> | undefined;

// Marker pins are drawn locally as SVG data URIs. The old remote
// leaflet-color-markers PNGs are unreliable inside Google's marker renderer, so
// every pin fell back to Google's default red. Colour names below are the same
// names call sites already use, so caregivers, orders and home stay distinct.
const PIN_HEX: Record<string, string> = {
  blue: "#2563eb",
  green: "#16a34a",
  red: "#dc2626",
  orange: "#f97316",
  violet: "#7c3aed",
  purple: "#7c3aed",
  grey: "#6b7280",
  gray: "#6b7280",
  gold: "#eab308",
  yellow: "#eab308",
  black: "#111827",
};

const pinDataUri = (hex: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${hex}" stroke="#ffffff" stroke-width="1.5"/><circle cx="12.5" cy="12.5" r="4.5" fill="#ffffff"/></svg>`,
  )}`;

/** Accepts a colour name ("green") or any legacy marker URL. */
export const pinIcon = (colorOrUrl: string) => ({ iconUrl: toPinUrl(colorOrUrl) });

function toPinUrl(value: string): string {
  const direct = PIN_HEX[value.toLowerCase()];
  if (direct) return pinDataUri(direct);
  const named = value.match(/marker-icon(?:-2x)?-([a-z]+)\.png/i);
  if (named) return pinDataUri(PIN_HEX[named[1].toLowerCase()] ?? PIN_HEX.blue);
  if (/marker-icon(?:-2x)?\.png/i.test(value)) return pinDataUri(PIN_HEX.blue);
  return value;
}

const resolveIconUrl = (icon: unknown): string | undefined => {
  if (typeof icon === "string") return toPinUrl(icon);
  if (typeof icon !== "object" || !icon) return undefined;
  if ("iconUrl" in icon) return toPinUrl(String((icon as { iconUrl: unknown }).iconUrl));
  // Compatibility for any remaining callers that pass a Leaflet Icon.
  if ("options" in icon) {
    const options = (icon as { options?: { iconUrl?: unknown } }).options;
    if (options?.iconUrl) return toPinUrl(String(options.iconUrl));
  }
  return undefined;
};


/**
 * Overlays are created ONCE per mount and then mutated in place. Call sites pass
 * inline arrays/objects and fresh <Popup> elements on every render, so rebuilding
 * the overlay on identity change would tear down (and close) an open info window
 * whenever the parent re-renders — e.g. a 60s refresh or a radius toggle.
 */
export function Marker({ position, icon, children }: { position: LatLng; icon?: unknown; children?: ReactNode }) {
  const map = useContext(MapContext)!;
  const markerRef = useRef<google.maps.Marker | null>(null);
  const rootRef = useRef<Root | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    const marker = new google.maps.Marker({ map });
    markerRef.current = marker;
    return () => {
      infoRef.current?.close();
      marker.setMap(null);
      markerRef.current = null;
      const root = rootRef.current;
      rootRef.current = null;
      infoRef.current = null;
      setTimeout(() => root?.unmount(), 0);
    };
  }, [map]);

  const { lat, lng } = toLiteral(position);
  const iconUrl = resolveIconUrl(icon);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setPosition({ lat, lng });
    marker.setIcon(
      iconUrl
        ? {
            url: iconUrl,
            scaledSize: new google.maps.Size(25, 41),
            anchor: new google.maps.Point(12.5, 41),
          }
        : null,
    );

  }, [lat, lng, iconUrl]);

  const popup = popupChild(children);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !popup) return;
    if (!rootRef.current) {
      const node = document.createElement("div");
      rootRef.current = createRoot(node);
      infoRef.current = new google.maps.InfoWindow({ content: node });
      marker.addListener("click", () => infoRef.current?.open({ map, anchor: marker }));
    }
    // Re-render popup content in place so an open window stays open.
    rootRef.current.render(popup.props.children);
  }, [map, popup]);

  return null;
}

export function CircleMarker({ center, radius = 8, pathOptions, children }: { center: LatLng; radius?: number; pathOptions?: Record<string, unknown>; children?: ReactNode }) {
  const map = useContext(MapContext)!;
  const markerRef = useRef<google.maps.Marker | null>(null);
  const rootRef = useRef<Root | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    const marker = new google.maps.Marker({ map });
    markerRef.current = marker;
    return () => {
      infoRef.current?.close();
      marker.setMap(null);
      markerRef.current = null;
      const root = rootRef.current;
      rootRef.current = null;
      infoRef.current = null;
      setTimeout(() => root?.unmount(), 0);
    };
  }, [map]);

  const { lat, lng } = toLiteral(center);
  const opts = (pathOptions ?? {}) as { color?: string; fillColor?: string; fillOpacity?: number; weight?: number };
  const fillColor = opts.fillColor ?? opts.color ?? "#2563eb";
  const strokeColor = opts.color ?? "#2563eb";
  const fillOpacity = opts.fillOpacity ?? 0.85;
  const weight = opts.weight ?? 2;
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setPosition({ lat, lng });
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: radius,
      fillColor,
      fillOpacity,
      strokeColor,
      strokeWeight: weight,
    });
  }, [lat, lng, radius, fillColor, fillOpacity, strokeColor, weight]);

  const popup = popupChild(children);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !popup) return;
    if (!rootRef.current) {
      const node = document.createElement("div");
      rootRef.current = createRoot(node);
      infoRef.current = new google.maps.InfoWindow({ content: node });
      marker.addListener("click", () => infoRef.current?.open({ map, anchor: marker }));
    }
    rootRef.current.render(popup.props.children);
  }, [map, popup]);

  return null;
}

export function Circle({ center, radius, pathOptions, children }: { center: LatLng; radius: number; pathOptions?: Record<string, unknown>; children?: ReactNode }) {
  const map = useContext(MapContext)!;
  const circleRef = useRef<google.maps.Circle | null>(null);
  const rootRef = useRef<Root | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    const circle = new google.maps.Circle({ map });
    circleRef.current = circle;
    return () => {
      infoRef.current?.close();
      circle.setMap(null);
      circleRef.current = null;
      const root = rootRef.current;
      rootRef.current = null;
      infoRef.current = null;
      setTimeout(() => root?.unmount(), 0);
    };
  }, [map]);

  const { lat, lng } = toLiteral(center);
  const optionsKey = JSON.stringify(pathOptions ?? {});
  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.setOptions({ center: { lat, lng }, radius, ...(JSON.parse(optionsKey) as google.maps.CircleOptions) });
  }, [lat, lng, radius, optionsKey]);

  const popup = popupChild(children);
  useEffect(() => {
    const circle = circleRef.current;
    if (!circle || !popup) return;
    if (!rootRef.current) {
      const node = document.createElement("div");
      rootRef.current = createRoot(node);
      infoRef.current = new google.maps.InfoWindow({ content: node, position: { lat, lng } });
      circle.addListener("click", () => infoRef.current?.open({ map }));
    }
    infoRef.current?.setPosition({ lat, lng });
    rootRef.current.render(popup.props.children);
  }, [map, popup, lat, lng]);

  return null;
}

export function Polyline({ positions, pathOptions, color, weight, opacity, dashArray }: { positions: LatLng[]; pathOptions?: Record<string, unknown>; color?: string; weight?: number; opacity?: number; dashArray?: string }) {
  const map = useContext(MapContext)!;
  useEffect(() => {
    const line = new google.maps.Polyline({
      map,
      path: positions.map(toLiteral),
      strokeColor: color,
      strokeWeight: weight,
      strokeOpacity: opacity,
      ...(dashArray ? { icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: dashArray }] } : {}),
      ...(pathOptions ?? {}),
    });
    return () => line.setMap(null);
  }, [map, positions, pathOptions, color, weight, opacity, dashArray]);
  return null;
}

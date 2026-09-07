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

function loadGoogleMaps() {
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
  const [error, setError] = useState<string | null>(null);

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
      <div ref={elementRef} style={{ position: "absolute", inset: 0 }} />
      {error && <div className="absolute inset-0 grid place-items-center bg-muted p-4 text-center text-sm text-muted-foreground">{error}</div>}
      {map && <MapContext.Provider value={map}>{children}</MapContext.Provider>}
    </div>
  );
}

export const TileLayer = (_props: { url?: string; attribution?: string }) => null;
export const Popup = ({ children }: { children?: ReactNode }) => <>{children}</>;

const popupChild = (children: ReactNode) => Children.toArray(children).find((child) => isValidElement(child) && child.type === Popup) as ReactElement<{ children?: ReactNode }> | undefined;

export function Marker({ position, icon, children }: { position: LatLng; icon?: unknown; children?: ReactNode }) {
  const map = useContext(MapContext)!;
  useEffect(() => {
    const iconUrl = typeof icon === "object" && icon && "iconUrl" in icon ? String((icon as { iconUrl: unknown }).iconUrl) : undefined;
    const marker = new google.maps.Marker({ map, position: toLiteral(position), icon: iconUrl ? { url: iconUrl, scaledSize: new google.maps.Size(25, 41) } : undefined });
    let root: Root | undefined;
    let info: google.maps.InfoWindow | undefined;
    const popup = popupChild(children);
    if (popup) {
      const node = document.createElement("div");
      root = createRoot(node);
      root.render(popup.props.children);
      info = new google.maps.InfoWindow({ content: node });
      marker.addListener("click", () => info!.open({ map, anchor: marker }));
    }
    return () => { info?.close(); marker.setMap(null); setTimeout(() => root?.unmount(), 0); };
  }, [map, position, icon, children]);
  return null;
}

export function CircleMarker({ center, radius = 8, pathOptions, children }: { center: LatLng; radius?: number; pathOptions?: Record<string, unknown>; children?: ReactNode }) {
  const map = useContext(MapContext)!;
  useEffect(() => {
    const opts = (pathOptions ?? {}) as { color?: string; fillColor?: string; fillOpacity?: number; weight?: number };
    const marker = new google.maps.Marker({
      map,
      position: toLiteral(center),
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: radius,
        fillColor: opts.fillColor ?? opts.color ?? "#2563eb",
        fillOpacity: opts.fillOpacity ?? 0.85,
        strokeColor: opts.color ?? "#2563eb",
        strokeWeight: opts.weight ?? 2,
      },
    });
    let root: Root | undefined;
    let info: google.maps.InfoWindow | undefined;
    const popup = popupChild(children);
    if (popup) {
      const node = document.createElement("div");
      root = createRoot(node);
      root.render(popup.props.children);
      info = new google.maps.InfoWindow({ content: node });
      marker.addListener("click", () => info!.open({ map, anchor: marker }));
    }
    return () => { info?.close(); marker.setMap(null); setTimeout(() => root?.unmount(), 0); };
  }, [map, center, radius, pathOptions, children]);
  return null;
}

export function Circle({ center, radius, pathOptions, children }: { center: LatLng; radius: number; pathOptions?: Record<string, unknown>; children?: ReactNode }) {
  const map = useContext(MapContext)!;
  useEffect(() => {
    const circle = new google.maps.Circle({ map, center: toLiteral(center), radius, ...(pathOptions ?? {}) });
    let root: Root | undefined;
    let info: google.maps.InfoWindow | undefined;
    const popup = popupChild(children);
    if (popup) {
      const node = document.createElement("div");
      root = createRoot(node); root.render(popup.props.children);
      info = new google.maps.InfoWindow({ content: node, position: toLiteral(center) });
      circle.addListener("click", () => info!.open({ map }));
    }
    return () => { info?.close(); circle.setMap(null); setTimeout(() => root?.unmount(), 0); };
  }, [map, center, radius, pathOptions, children]);
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

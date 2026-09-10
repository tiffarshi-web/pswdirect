// Leaflet renderer for the admin map.
// Extracted unchanged from UnifiedAdminMap.tsx — same markers, popups, radii.
// Pure presentational; all data + callbacks flow in via props.

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, mapIcon } from "@/components/maps/GoogleMapCompat";
import { PSWPopupContent, OrderPopupContent } from "./MapPopups";
import type { AdminMapRendererProps, MapViewTarget, OrderBucket, PSWRow } from "./types";
import { orderMarkerColor, pswMarkerColor, type MarkerColor } from "./markerColors";

const makeIcon = (color: MarkerColor) => mapIcon(color);


// Colours come from the shared marker colour map so legend, popups and markers
// can never drift apart: green = unaccepted job, blue = accepted/assigned job,
// worker markers use orange / violet / grey.
const ICON_CACHE = {} as Record<MarkerColor, ReturnType<typeof mapIcon>>;
const iconFor = (color: MarkerColor) => (ICON_CACHE[color] ||= makeIcon(color));

const orderIcon = (b: OrderBucket) => iconFor(orderMarkerColor(b));
const pswIcon = (s: PSWRow["status"]) => iconFor(pswMarkerColor(s));

const FlyTo = ({ target }: { target: MapViewTarget | null }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.7 });
  }, [target, map]);
  return null;
};

export const LeafletAdminMap = ({
  center,
  flyTarget,
  psws,
  orders,
  showRadii,
  visibleRadii,
  radiusKm,
  onToggleRadius,
  onCopy,
  onAssign,
}: AdminMapRendererProps) => {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={center.zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo target={flyTarget} />

      {psws.map((p) => (
        <div key={`psw-${p.id}`}>
          {(showRadii || visibleRadii.has(p.id)) && (
            <Circle
              center={[p.coords.lat, p.coords.lng]}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.06, weight: 1 }}
            />
          )}
          <Marker
            position={[p.coords.lat, p.coords.lng]}
            icon={pswIcon(p.status)}
          >
            <Popup>
              <PSWPopupContent
                p={p}
                radiusVisible={visibleRadii.has(p.id)}
                onToggleRadius={onToggleRadius}
                onCopy={onCopy}
              />
            </Popup>
          </Marker>
        </div>
      ))}

      {orders.map((o) => (
        <Marker key={`ord-${o.id}`} position={[o.coords.lat, o.coords.lng]} icon={orderIcon(o.bucket)}>
          <Popup>
            <OrderPopupContent o={o} onCopy={onCopy} onAssign={onAssign} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default LeafletAdminMap;

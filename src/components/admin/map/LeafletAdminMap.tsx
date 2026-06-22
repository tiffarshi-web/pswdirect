// Leaflet renderer for the admin map.
// Extracted unchanged from UnifiedAdminMap.tsx — same markers, popups, radii.
// Pure presentational; all data + callbacks flow in via props.

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { PSWPopupContent, OrderPopupContent } from "./MapPopups";
import type { AdminMapRendererProps, MapViewTarget, OrderBucket } from "./types";
import "leaflet/dist/leaflet.css";

// Leaflet icon defaults (vite/webpack workaround)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const makeIcon = (color: string) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const ICONS = {
  pswApproved: makeIcon("green"),
  pswOnShift: makeIcon("violet"),
  orderOpen: makeIcon("red"),
  orderPending: makeIcon("orange"),
  orderAssigned: makeIcon("blue"),
  orderActive: makeIcon("green"),
  orderInProgress: makeIcon("purple"),
  orderUnserved: makeIcon("yellow"),
  orderCompleted: makeIcon("grey"),
};

const orderIcon = (b: OrderBucket) =>
  b === "active" ? ICONS.orderActive
  : b === "in_progress" ? ICONS.orderInProgress
  : b === "assigned" ? ICONS.orderAssigned
  : b === "pending" ? ICONS.orderPending
  : b === "unserved" ? ICONS.orderUnserved
  : b === "completed" ? ICONS.orderCompleted
  : ICONS.orderOpen;

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
              pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.06, weight: 1 }}
            />
          )}
          <Marker
            position={[p.coords.lat, p.coords.lng]}
            icon={p.status === "on_shift" ? ICONS.pswOnShift : ICONS.pswApproved}
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

// Silence unused-import linter if renderToStaticMarkup ever gets dropped.
void renderToStaticMarkup;

export default LeafletAdminMap;

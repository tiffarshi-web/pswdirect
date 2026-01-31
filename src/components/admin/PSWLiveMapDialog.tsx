// Admin dialog showing PSW live location with breadcrumb trail
// Shows current position and last 10 location points as a path

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation, Clock, Route, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocationLogs } from "@/hooks/useLocationLogs";
import { formatDistanceToNow, format } from "date-fns";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom PSW marker (blue - current position)
const pswCurrentIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Breadcrumb marker (grey - past positions)
const breadcrumbIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -27],
  shadowSize: [33, 33],
});

// Client home marker (green)
const homeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface PSWLiveMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  pswName?: string;
  clientName?: string;
  clientAddress?: string;
  clientCoords?: { lat: number; lng: number } | null;
}

// Component to fit map bounds to all markers
const MapBoundsUpdater = ({ 
  positions, 
  clientCoords 
}: { 
  positions: [number, number][]; 
  clientCoords?: { lat: number; lng: number } | null;
}) => {
  const map = useMap();

  useEffect(() => {
    const allPoints: [number, number][] = [...positions];
    if (clientCoords) {
      allPoints.push([clientCoords.lat, clientCoords.lng]);
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, clientCoords, map]);

  return null;
};

export const PSWLiveMapDialog = ({
  open,
  onOpenChange,
  bookingId,
  pswName = "PSW",
  clientName,
  clientAddress,
  clientCoords,
}: PSWLiveMapDialogProps) => {
  const { logs, latestLog, isLoading, error, refetch } = useLocationLogs({
    bookingId,
    limit: 10, // Get last 10 positions for breadcrumb trail
    refreshIntervalMs: 30000, // Refresh every 30 seconds for admin
    enabled: open,
  });

  // Get positions for polyline (breadcrumb trail)
  const trailPositions: [number, number][] = logs
    .map((log) => [log.latitude, log.longitude] as [number, number])
    .reverse(); // Oldest to newest for the line

  const defaultCenter: [number, number] = latestLog
    ? [latestLog.latitude, latestLog.longitude]
    : clientCoords
    ? [clientCoords.lat, clientCoords.lng]
    : [43.6532, -79.3832]; // Toronto fallback

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Live Location: {pswName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {latestLog && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Last update: {formatDistanceToNow(new Date(latestLog.created_at), { addSuffix: true })}
              </Badge>
            )}
            {logs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Route className="w-3 h-3 mr-1" />
                {logs.length} location point{logs.length !== 1 ? "s" : ""}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              className="ml-auto text-xs"
            >
              Refresh
            </Button>
          </div>

          {/* Map */}
          {isLoading ? (
            <Skeleton className="h-[400px] w-full rounded-lg" />
          ) : error ? (
            <div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : !latestLog && !clientCoords ? (
            <div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No location data available yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Location will appear once the PSW starts sharing
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[400px] rounded-lg overflow-hidden border">
              <MapContainer
                center={defaultCenter}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapBoundsUpdater positions={trailPositions} clientCoords={clientCoords} />

                {/* Breadcrumb Trail Polyline */}
                {trailPositions.length > 1 && (
                  <Polyline
                    positions={trailPositions}
                    color="#3b82f6"
                    weight={3}
                    opacity={0.7}
                    dashArray="5, 10"
                  />
                )}

                {/* Past Position Markers (breadcrumbs) */}
                {logs.slice(1).map((log, index) => (
                  <Marker
                    key={log.id}
                    position={[log.latitude, log.longitude]}
                    icon={breadcrumbIcon}
                  >
                    <Popup>
                      <div className="text-center text-sm">
                        <strong>Position #{logs.length - index - 1}</strong>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "h:mm a")}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Current PSW Position (Blue) */}
                {latestLog && (
                  <Marker
                    position={[latestLog.latitude, latestLog.longitude]}
                    icon={pswCurrentIcon}
                  >
                    <Popup>
                      <div className="text-center">
                        <strong>{pswName}</strong>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          Current Position
                        </span>
                        <br />
                        <span className="text-xs">
                          {format(new Date(latestLog.created_at), "h:mm:ss a")}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Client Home Location (Green) */}
                {clientCoords && (
                  <Marker
                    position={[clientCoords.lat, clientCoords.lng]}
                    icon={homeIcon}
                  >
                    <Popup>
                      <div className="text-center">
                        <strong>{clientName || "Client"}'s Location</strong>
                        {clientAddress && (
                          <>
                            <br />
                            <span className="text-xs">{clientAddress}</span>
                          </>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Current Position</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span>Previous Positions</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Client Location</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-4 border-t-2 border-dashed border-blue-500" />
              <span>Movement Trail</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PSWLiveMapDialog;

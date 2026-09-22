// Client-facing map showing PSW's current location during active care
// Rendered with Google Maps via the shared map component

import { useEffect, useState } from "react";
import { MapContainer,  Marker, Popup, useMap, pinIcon, latLngBounds, type LatLngBoundsExpression } from "@/components/maps/GoogleMapCompat";
import { MapPin, Navigation, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocationLogs } from "@/hooks/useLocationLogs";
import { useGeocodedAddress } from "@/hooks/useGeocodedAddress";
import { formatDistanceToNow } from "date-fns";

// Custom PSW marker (blue)
const pswIcon = pinIcon("blue");

// Custom home marker (green)
const homeIcon = pinIcon("green");

interface PSWLocationMapProps {
  bookingId: string;
  pswName?: string;
  clientAddress?: string;
  clientCoords?: { lat: number; lng: number } | null;
}

// Component to handle map recentering
const MapUpdater = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);

  return null;
};

export const PSWLocationMap = ({
  bookingId,
  pswName = "Your PSW",
  clientAddress,
  clientCoords: propClientCoords,
}: PSWLocationMapProps) => {
  const { latestLog, isLoading, error } = useLocationLogs({
    bookingId,
    limit: 1,
    refreshIntervalMs: 60000, // Refresh every 60 seconds
  });

  // Geocode client address if coordinates not provided
  const { coords: geocodedCoords, isLoading: isGeocoding } = useGeocodedAddress({
    address: clientAddress,
    enabled: !propClientCoords && !!clientAddress,
  });

  // Use provided coords or geocoded coords
  const clientCoords = propClientCoords || geocodedCoords;

  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // Update map center when PSW location changes
  useEffect(() => {
    if (latestLog) {
      setMapCenter([latestLog.latitude, latestLog.longitude]);
    } else if (clientCoords) {
      setMapCenter([clientCoords.lat, clientCoords.lng]);
    }
  }, [latestLog, clientCoords]);

  // Loading state (includes geocoding)
  if (isLoading || isGeocoding) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            PSW Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full rounded-lg bg-muted flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error or no location available
  if (error || (!latestLog && !clientCoords)) {
    return (
      <Card className="shadow-card border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-4 h-4 text-muted-foreground" />
            PSW Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {error || "Location data not yet available"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The map will update once your PSW shares their location
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const defaultCenter: [number, number] = mapCenter || [43.6532, -79.3832]; // Toronto fallback

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            {pswName}'s Location
          </CardTitle>
          {latestLog && (
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {formatDistanceToNow(new Date(latestLog.created_at), { addSuffix: true })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[200px] rounded-b-lg overflow-hidden">
          <MapContainer
            center={defaultCenter}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
          >
            <MapUpdater center={mapCenter} />

            {/* PSW Location Marker (Blue) */}
            {latestLog && (
              <Marker
                position={[latestLog.latitude, latestLog.longitude]}
                icon={pswIcon}
              >
                <Popup>
                  <div className="text-center">
                    <strong>{pswName}</strong>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      Last updated: {formatDistanceToNow(new Date(latestLog.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Client Home Marker (Green) */}
            {clientCoords && (
              <Marker
                position={[clientCoords.lat, clientCoords.lng]}
                icon={homeIcon}
              >
                <Popup>
                  <div className="text-center">
                    <strong>Service Location</strong>
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

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground bg-muted/50">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>{pswName}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Your Location</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PSWLocationMap;

// Active Shifts Map View - Shows PSW and Client locations on a Leaflet map
// Green pin = PSW current location, Blue pin = Client address
// Includes distance calculation and admin override for GPS issues

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  CheckCircle, 
  Phone,
  RefreshCw,
  Shield,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { getShifts, checkInToShift, type ShiftRecord } from "@/lib/shiftStore";
import { getCoordinatesFromPostalCode, calculateDistanceInMeters } from "@/lib/postalCodeUtils";
import { format } from "date-fns";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom PSW marker (green)
const pswIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom Client marker (blue)
const clientIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Map bounds updater component
const MapBoundsUpdater = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

interface ActiveShiftWithLocation extends ShiftRecord {
  pswCoords?: { lat: number; lng: number };
  clientCoords?: { lat: number; lng: number };
  distance?: number;
}

export const ActiveShiftsMapView = () => {
  const [shifts, setShifts] = useState<ActiveShiftWithLocation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  const loadActiveShifts = () => {
    const allShifts = getShifts();
    const activeShifts = allShifts.filter(
      (s) => s.status === "checked-in" || s.status === "claimed"
    );

    // Add location data
    const enrichedShifts: ActiveShiftWithLocation[] = activeShifts.map((shift) => {
      const clientCoords = getCoordinatesFromPostalCode(shift.postalCode);
      const pswCoords = shift.checkInLocation;

      let distance: number | undefined;
      if (pswCoords && clientCoords) {
        distance = calculateDistanceInMeters(
          pswCoords.lat,
          pswCoords.lng,
          clientCoords.lat,
          clientCoords.lng
        );
      }

      return {
        ...shift,
        pswCoords,
        clientCoords: clientCoords || undefined,
        distance,
      };
    });

    setShifts(enrichedShifts);
  };

  useEffect(() => {
    loadActiveShifts();
    // Refresh every 30 seconds
    const interval = setInterval(loadActiveShifts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadActiveShifts();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success("Map refreshed");
  };

  const handleAdminOverride = (shift: ActiveShiftWithLocation) => {
    if (shift.status === "claimed") {
      // Force check-in with mock location
      const clientCoords = shift.clientCoords || { lat: 43.6532, lng: -79.3832 };
      const updated = checkInToShift(shift.id, clientCoords);
      if (updated) {
        loadActiveShifts();
        toast.success(`Admin override: ${shift.pswName} checked in successfully`);
      }
    }
  };

  // Calculate map bounds
  const mapBounds = useMemo(() => {
    const coords: [number, number][] = [];
    shifts.forEach((shift) => {
      if (shift.pswCoords) coords.push([shift.pswCoords.lat, shift.pswCoords.lng]);
      if (shift.clientCoords) coords.push([shift.clientCoords.lat, shift.clientCoords.lng]);
    });
    if (coords.length >= 2) {
      return L.latLngBounds(coords);
    }
    // Default to Toronto if no coords
    return L.latLngBounds([[43.58, -79.5], [43.85, -79.2]]);
  }, [shifts]);

  const activeShiftsCount = shifts.filter((s) => s.status === "checked-in").length;
  const claimedShiftsCount = shifts.filter((s) => s.status === "claimed").length;

  const formatDistance = (meters?: number) => {
    if (!meters) return "Unknown";
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            {activeShiftsCount} Active
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Clock className="w-3 h-3 mr-2" />
            {claimedShiftsCount} Pending Check-in
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Map */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Live Shift Locations
          </CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-2 mr-4">
              <span className="w-3 h-3 bg-green-500 rounded-full" /> PSW Location
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full" /> Client Address
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] w-full">
            <MapContainer
              center={[43.6532, -79.3832]}
              zoom={11}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapBoundsUpdater bounds={mapBounds} />

              {shifts.map((shift) => (
                <div key={shift.id}>
                  {/* PSW Marker */}
                  {shift.pswCoords && (
                    <Marker
                      position={[shift.pswCoords.lat, shift.pswCoords.lng]}
                      icon={pswIcon}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold text-green-700">{shift.pswName}</p>
                          <p className="text-muted-foreground">PSW Location</p>
                          {shift.checkedInAt && (
                            <p className="text-xs">
                              Checked in: {format(new Date(shift.checkedInAt), "h:mm a")}
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Client Marker */}
                  {shift.clientCoords && (
                    <Marker
                      position={[shift.clientCoords.lat, shift.clientCoords.lng]}
                      icon={clientIcon}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold text-blue-700">{shift.clientName}</p>
                          <p className="text-muted-foreground">{shift.patientAddress}</p>
                          <p className="text-xs">{shift.postalCode}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Line between PSW and Client */}
                  {shift.pswCoords && shift.clientCoords && (
                    <Polyline
                      positions={[
                        [shift.pswCoords.lat, shift.pswCoords.lng],
                        [shift.clientCoords.lat, shift.clientCoords.lng],
                      ]}
                      color={shift.status === "checked-in" ? "#22c55e" : "#f59e0b"}
                      weight={2}
                      dashArray="5, 10"
                    />
                  )}
                </div>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Shift List */}
      <div className="grid gap-4 md:grid-cols-2">
        {shifts.length === 0 ? (
          <Card className="col-span-2 shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              No active or pending shifts at the moment
            </CardContent>
          </Card>
        ) : (
          shifts.map((shift) => (
            <Card
              key={shift.id}
              className={`shadow-card cursor-pointer transition-all ${
                selectedShift === shift.id ? "ring-2 ring-primary" : ""
              } ${shift.status === "claimed" ? "border-amber-300" : ""}`}
              onClick={() => setSelectedShift(shift.id === selectedShift ? null : shift.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {shift.status === "checked-in" ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Checked In
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Check-in
                        </Badge>
                      )}
                      {shift.distance && (
                        <Badge variant="outline" className="text-xs">
                          <Navigation className="w-3 h-3 mr-1" />
                          {formatDistance(shift.distance)}
                        </Badge>
                      )}
                    </div>

                    <p className="font-semibold text-foreground">{shift.pswName}</p>
                    <p className="text-sm text-muted-foreground">
                      → {shift.clientFirstName} ({shift.patientAddress})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {shift.scheduledStart} - {shift.scheduledEnd}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {shift.clientPhone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `tel:${shift.clientPhone}`;
                        }}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Admin Override for claimed shifts */}
                {shift.status === "claimed" && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>GPS check-in pending</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdminOverride(shift);
                        }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Override
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Use this if PSW is on-site but GPS is not working correctly
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

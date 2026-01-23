// Active Shifts Map View - Shows PSW and Client locations on a Leaflet map
// Green pin = Live/Active, Yellow pin = Starting within 7 days, Red pin = Starting in 7+ days
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
  Clock,
  Calendar,
  User,
  CircleDot
} from "lucide-react";
import { toast } from "sonner";
import { getShifts, checkInToShift, type ShiftRecord } from "@/lib/shiftStore";
import { getCoordinatesFromPostalCode, calculateDistanceInMeters } from "@/lib/postalCodeUtils";
import { format, differenceInDays, parseISO, isToday, isTomorrow } from "date-fns";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker - Green (Live/Active)
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom marker - Yellow (Starting within 7 days)
const yellowIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom marker - Red (Starting in 7+ days)
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom Client marker (blue) - for PSW current location on active shifts
const blueIcon = new L.Icon({
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

// Shift category types for coloring
type ShiftCategory = "live" | "soon" | "later";

interface ActiveShiftWithLocation extends ShiftRecord {
  pswCoords?: { lat: number; lng: number };
  clientCoords?: { lat: number; lng: number };
  distance?: number;
  daysRemaining?: number;
  category?: ShiftCategory;
}

// Calculate days remaining until shift and determine category
const getShiftCategoryAndDays = (scheduledDate: string): { category: ShiftCategory; daysRemaining: number } => {
  try {
    const shiftDate = parseISO(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    shiftDate.setHours(0, 0, 0, 0);
    
    const daysRemaining = differenceInDays(shiftDate, today);
    
    if (daysRemaining <= 0) {
      return { category: "live", daysRemaining: 0 };
    } else if (daysRemaining <= 7) {
      return { category: "soon", daysRemaining };
    } else {
      return { category: "later", daysRemaining };
    }
  } catch {
    return { category: "later", daysRemaining: 999 };
  }
};

// Get marker icon based on shift category
const getMarkerIcon = (category: ShiftCategory) => {
  switch (category) {
    case "live":
      return greenIcon;
    case "soon":
      return yellowIcon;
    case "later":
      return redIcon;
    default:
      return greenIcon;
  }
};

// Format days remaining for display
const formatDaysRemaining = (days: number): string => {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
};

export const ActiveShiftsMapView = () => {
  const [shifts, setShifts] = useState<ActiveShiftWithLocation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  const loadActiveShifts = () => {
    const allShifts = getShifts();
    // Include active, claimed, and available/upcoming shifts
    const relevantShifts = allShifts.filter(
      (s) => s.status === "checked-in" || s.status === "claimed" || s.status === "available"
    );

    // Add location data and categorize
    const enrichedShifts: ActiveShiftWithLocation[] = relevantShifts.map((shift) => {
      const clientCoords = getCoordinatesFromPostalCode(shift.postalCode);
      const pswCoords = shift.checkInLocation;
      
      // Calculate category and days remaining
      const { category, daysRemaining } = getShiftCategoryAndDays(shift.scheduledDate);

      let distance: number | undefined;
      if (pswCoords && clientCoords) {
        distance = calculateDistanceInMeters(
          pswCoords.lat,
          pswCoords.lng,
          clientCoords.lat,
          clientCoords.lng
        );
      }

      // Override category for active shifts
      const finalCategory: ShiftCategory = 
        shift.status === "checked-in" ? "live" : 
        shift.status === "claimed" ? "soon" : 
        category;

      return {
        ...shift,
        pswCoords,
        clientCoords: clientCoords || undefined,
        distance,
        daysRemaining,
        category: finalCategory,
      };
    });

    // Sort: live first, then by days remaining
    enrichedShifts.sort((a, b) => {
      if (a.category === "live" && b.category !== "live") return -1;
      if (b.category === "live" && a.category !== "live") return 1;
      return (a.daysRemaining || 0) - (b.daysRemaining || 0);
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

  const liveCount = shifts.filter((s) => s.category === "live" || s.status === "checked-in").length;
  const soonCount = shifts.filter((s) => s.category === "soon" && s.status !== "checked-in").length;
  const laterCount = shifts.filter((s) => s.category === "later").length;

  const formatDistance = (meters?: number) => {
    if (!meters) return "Unknown";
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="px-3 py-1 bg-green-500/10 text-green-700 border-green-300">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            {liveCount} Live Now
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-yellow-500/10 text-yellow-700 border-yellow-300">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2" />
            {soonCount} Within 7 Days
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-red-500/10 text-red-700 border-red-300">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
            {laterCount} 7+ Days
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
            Shift Locations Overview
          </CardTitle>
          <CardDescription>
            View all active and upcoming shift locations with full client details
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 relative">
          <div className="h-[450px] w-full">
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
                  {/* PSW Marker - only for checked-in shifts */}
                  {shift.pswCoords && shift.status === "checked-in" && (
                    <Marker
                      position={[shift.pswCoords.lat, shift.pswCoords.lng]}
                      icon={blueIcon}
                    >
                      <Popup>
                        <div className="text-sm min-w-[180px]">
                          <p className="font-semibold text-blue-700">{shift.pswName}</p>
                          <p className="text-muted-foreground text-xs">PSW Current Location</p>
                          {shift.checkedInAt && (
                            <p className="text-xs mt-1">
                              Checked in: {format(new Date(shift.checkedInAt), "h:mm a")}
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Client Location Marker - colored by category */}
                  {shift.clientCoords && (
                    <Marker
                      position={[shift.clientCoords.lat, shift.clientCoords.lng]}
                      icon={getMarkerIcon(shift.category || "later")}
                    >
                      <Popup>
                        <div className="text-sm min-w-[220px] space-y-2">
                          {/* Client Name & Phone - Full details for Admin */}
                          <div className="border-b border-border pb-2">
                            <div className="flex items-center gap-1 mb-1">
                              <User className="w-3 h-3 text-primary" />
                              <p className="font-semibold text-foreground">{shift.clientName}</p>
                            </div>
                            {shift.clientPhone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <a 
                                  href={`tel:${shift.clientPhone}`} 
                                  className="text-primary hover:underline text-xs"
                                >
                                  {shift.clientPhone}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Scheduled Start Date */}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs">
                              {format(parseISO(shift.scheduledDate), "EEEE, MMM d, yyyy")}
                            </span>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs">
                              {shift.scheduledStart} - {shift.scheduledEnd}
                            </span>
                          </div>

                          {/* Days Remaining */}
                          <div className="flex items-center gap-1 pt-1 border-t border-border">
                            <CircleDot className={`w-3 h-3 ${
                              shift.category === "live" ? "text-green-500" :
                              shift.category === "soon" ? "text-yellow-500" : "text-red-500"
                            }`} />
                            <span className={`text-xs font-medium ${
                              shift.category === "live" ? "text-green-600" :
                              shift.category === "soon" ? "text-yellow-600" : "text-red-600"
                            }`}>
                              {shift.status === "checked-in" ? "Live Now" : 
                               formatDaysRemaining(shift.daysRemaining || 0)}
                            </span>
                          </div>

                          {/* Address */}
                          <div className="text-xs text-muted-foreground pt-1">
                            <p>{shift.patientAddress}</p>
                            <p>{shift.postalCode}</p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Line between PSW and Client for active shifts */}
                  {shift.pswCoords && shift.clientCoords && shift.status === "checked-in" && (
                    <Polyline
                      positions={[
                        [shift.pswCoords.lat, shift.pswCoords.lng],
                        [shift.clientCoords.lat, shift.clientCoords.lng],
                      ]}
                      color="#22c55e"
                      weight={2}
                      dashArray="5, 10"
                    />
                  )}
                </div>
              ))}
            </MapContainer>
          </div>
          
          {/* Map Legend - Bottom Right Corner */}
          <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg z-[1000]">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Legend
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-xs text-muted-foreground">Live Now</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-xs text-muted-foreground">Starting within 7 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-xs text-muted-foreground">Starting in 7+ days</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-xs text-muted-foreground">PSW Location</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift List - Read Only, No Submit Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shifts.length === 0 ? (
          <Card className="col-span-full shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              No shifts found in the system
            </CardContent>
          </Card>
        ) : (
          shifts.map((shift) => (
            <Card
              key={shift.id}
              className={`shadow-card transition-all ${
                selectedShift === shift.id ? "ring-2 ring-primary" : ""
              } ${
                shift.category === "live" ? "border-green-300 bg-green-50/30 dark:bg-green-950/10" :
                shift.category === "soon" ? "border-yellow-300 bg-yellow-50/30 dark:bg-yellow-950/10" :
                "border-red-300 bg-red-50/30 dark:bg-red-950/10"
              }`}
              onClick={() => setSelectedShift(shift.id === selectedShift ? null : shift.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {shift.category === "live" || shift.status === "checked-in" ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Live Now
                        </Badge>
                      ) : shift.category === "soon" ? (
                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDaysRemaining(shift.daysRemaining || 0)}
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600 border-red-200">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDaysRemaining(shift.daysRemaining || 0)}
                        </Badge>
                      )}
                      {shift.distance && shift.status === "checked-in" && (
                        <Badge variant="outline" className="text-xs">
                          <Navigation className="w-3 h-3 mr-1" />
                          {formatDistance(shift.distance)}
                        </Badge>
                      )}
                    </div>

                    {/* Full Client Name - Admin View */}
                    <p className="font-semibold text-foreground">{shift.clientName}</p>
                    
                    {/* Full Phone Number - Admin View */}
                    {shift.clientPhone && (
                      <p className="text-sm text-primary flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        <a href={`tel:${shift.clientPhone}`} className="hover:underline">
                          {shift.clientPhone}
                        </a>
                      </p>
                    )}
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {shift.patientAddress}
                    </p>
                    
                    {/* Scheduled Date & Time */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Calendar className="w-3 h-3" />
                      <span>{format(parseISO(shift.scheduledDate), "MMM d, yyyy")}</span>
                      <span>•</span>
                      <span>{shift.scheduledStart} - {shift.scheduledEnd}</span>
                    </div>

                    {/* PSW Assignment */}
                    {shift.pswName && shift.status !== "available" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        PSW: {shift.pswName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Admin Override for claimed shifts - View Only */}
                {shift.status === "claimed" && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-yellow-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Awaiting PSW check-in</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdminOverride(shift);
                        }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Override
                      </Button>
                    </div>
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

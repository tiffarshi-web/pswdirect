// Active Shifts Map View - Shows booking locations from Supabase
// Green = Live/Active, Yellow = Claimed (within 7 days), Red = Unclaimed or 7+ days
// Admin-only: Full contact details visible for operational oversight

import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  CircleDot,
  AlertCircle,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCoordinatesFromPostalCode } from "@/lib/postalCodeUtils";
import { format, differenceInDays, parseISO, differenceInHours } from "date-fns";
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

// Custom marker - Yellow (Claimed, starting within 7 days)
const yellowIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom marker - Red (Unclaimed or 7+ days)
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom PSW marker (blue) - for PSW current location on active shifts
const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Map bounds updater component - updates based on visible markers
const MapBoundsUpdater = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

// Order category for map visualization
type OrderCategory = "live" | "claimed_soon" | "claimed_later" | "unclaimed";

interface BookingMapData {
  id: string;
  bookingCode: string;
  clientName: string;
  clientPhone: string | null;
  patientAddress: string;
  postalCode: string | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  serviceType: string[];
  status: string;
  paymentStatus: string;
  pswAssigned: string | null;
  pswFirstName: string | null;
  coords?: { lat: number; lng: number };
  category: OrderCategory;
  daysRemaining: number;
  hoursRemaining: number;
}

// Calculate days/hours remaining and determine category
const getOrderCategory = (
  booking: {
    scheduledDate: string;
    startTime: string;
    status: string;
    pswAssigned: string | null;
  }
): { category: OrderCategory; daysRemaining: number; hoursRemaining: number } => {
  try {
    const scheduledDateTime = new Date(`${booking.scheduledDate}T${booking.startTime}`);
    const now = new Date();
    
    const daysRemaining = differenceInDays(scheduledDateTime, now);
    const hoursRemaining = differenceInHours(scheduledDateTime, now);
    
    // Unclaimed: psw_id is NULL and status is pending/paid
    if (!booking.pswAssigned && (booking.status === "pending" || booking.status === "paid")) {
      return { category: "unclaimed", daysRemaining, hoursRemaining };
    }
    
    // Live: PSW assigned and status is in-progress or active
    if (booking.pswAssigned && (booking.status === "in-progress" || booking.status === "active")) {
      return { category: "live", daysRemaining: 0, hoursRemaining: 0 };
    }
    
    // Claimed & scheduled: PSW assigned
    if (booking.pswAssigned) {
      if (daysRemaining <= 7) {
        return { category: "claimed_soon", daysRemaining, hoursRemaining };
      }
      return { category: "claimed_later", daysRemaining, hoursRemaining };
    }
    
    // Default to unclaimed
    return { category: "unclaimed", daysRemaining, hoursRemaining };
  } catch {
    return { category: "unclaimed", daysRemaining: 999, hoursRemaining: 9999 };
  }
};

// Get marker icon based on order category
const getMarkerIcon = (category: OrderCategory) => {
  switch (category) {
    case "live":
      return greenIcon;
    case "claimed_soon":
      return yellowIcon;
    case "claimed_later":
    case "unclaimed":
      return redIcon;
    default:
      return redIcon;
  }
};

// Format days/hours remaining for display
const formatTimeRemaining = (days: number, hours: number): string => {
  if (days <= 0 && hours <= 0) return "Now";
  if (days <= 0 && hours > 0) return `${hours}h`;
  if (days === 1) return "Tomorrow";
  return `${days} days`;
};

// Session storage key for toggle state
const TOGGLE_KEY = "admin_map_show_unclaimed";

export const ActiveShiftsMapView = () => {
  const [bookings, setBookings] = useState<BookingMapData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  
  // Toggle state with session persistence
  const [showUnclaimed, setShowUnclaimed] = useState(() => {
    const stored = sessionStorage.getItem(TOGGLE_KEY);
    return stored !== null ? stored === "true" : true; // Default to showing unclaimed
  });

  // Persist toggle state
  useEffect(() => {
    sessionStorage.setItem(TOGGLE_KEY, String(showUnclaimed));
  }, [showUnclaimed]);

  const loadBookings = useCallback(async () => {
    try {
      // Fetch all relevant bookings from Supabase
      // Only show orders with paid payment status OR pending status (for operational visibility)
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("status", ["pending", "paid", "active", "in-progress", "assigned"])
        .not("status", "eq", "archived")
        .order("scheduled_date", { ascending: true });

      if (error) {
        console.error("Error fetching bookings for map:", error);
        toast.error("Failed to load map data");
        return;
      }

      // Transform and enrich booking data
      const enrichedBookings: BookingMapData[] = (data || []).map((booking) => {
        const coords = getCoordinatesFromPostalCode(booking.patient_postal_code || "");
        const { category, daysRemaining, hoursRemaining } = getOrderCategory({
          scheduledDate: booking.scheduled_date,
          startTime: booking.start_time,
          status: booking.status,
          pswAssigned: booking.psw_assigned,
        });

        return {
          id: booking.id,
          bookingCode: booking.booking_code,
          clientName: booking.client_name || "Unknown Client",
          clientPhone: booking.client_phone,
          patientAddress: booking.patient_address,
          postalCode: booking.patient_postal_code,
          scheduledDate: booking.scheduled_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          serviceType: booking.service_type || [],
          status: booking.status,
          paymentStatus: booking.payment_status,
          pswAssigned: booking.psw_assigned,
          pswFirstName: booking.psw_first_name,
          coords: coords || undefined,
          category,
          daysRemaining,
          hoursRemaining,
        };
      });

      // Sort: live first, then claimed soon, then unclaimed, then claimed later
      enrichedBookings.sort((a, b) => {
        const order = { live: 0, claimed_soon: 1, unclaimed: 2, claimed_later: 3 };
        const orderDiff = order[a.category] - order[b.category];
        if (orderDiff !== 0) return orderDiff;
        return a.daysRemaining - b.daysRemaining;
      });

      setBookings(enrichedBookings);
    } catch (err) {
      console.error("Map data error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(loadBookings, 30000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  // Subscribe to real-time updates for booking status changes
  useEffect(() => {
    const channel = supabase
      .channel("booking-status-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          // Reload when any booking changes (claimed, status update, etc.)
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadBookings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBookings();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success("Map refreshed");
  };

  // Filter bookings based on toggle state
  const visibleBookings = useMemo(() => {
    if (showUnclaimed) {
      return bookings;
    }
    // Hide unclaimed when toggle is off
    return bookings.filter((b) => b.category !== "unclaimed");
  }, [bookings, showUnclaimed]);

  // Calculate map bounds based on VISIBLE markers only
  const mapBounds = useMemo(() => {
    const coords: [number, number][] = [];
    visibleBookings.forEach((booking) => {
      if (booking.coords) {
        coords.push([booking.coords.lat, booking.coords.lng]);
      }
    });
    if (coords.length >= 2) {
      return L.latLngBounds(coords);
    }
    if (coords.length === 1) {
      // Single marker - create small bounds around it
      return L.latLngBounds([
        [coords[0][0] - 0.05, coords[0][1] - 0.05],
        [coords[0][0] + 0.05, coords[0][1] + 0.05],
      ]);
    }
    // Default to Toronto if no coords
    return L.latLngBounds([[43.58, -79.5], [43.85, -79.2]]);
  }, [visibleBookings]);

  // Count by category
  const liveCount = bookings.filter((b) => b.category === "live").length;
  const claimedSoonCount = bookings.filter((b) => b.category === "claimed_soon").length;
  const claimedLaterCount = bookings.filter((b) => b.category === "claimed_later").length;
  const unclaimedCount = bookings.filter((b) => b.category === "unclaimed").length;

  // Get category label for display
  const getCategoryLabel = (category: OrderCategory): string => {
    switch (category) {
      case "live":
        return "LIVE NOW";
      case "claimed_soon":
        return "CLAIMED";
      case "claimed_later":
        return "CLAIMED";
      case "unclaimed":
        return "UNCLAIMED JOB";
      default:
        return "UNKNOWN";
    }
  };

  // Get category color classes
  const getCategoryColorClasses = (category: OrderCategory) => {
    switch (category) {
      case "live":
        return {
          badge: "bg-green-500/10 text-green-600 border-green-200",
          card: "border-green-300 bg-green-50/30 dark:bg-green-950/10",
          dot: "bg-green-500",
          text: "text-green-600",
        };
      case "claimed_soon":
        return {
          badge: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
          card: "border-yellow-300 bg-yellow-50/30 dark:bg-yellow-950/10",
          dot: "bg-yellow-500",
          text: "text-yellow-600",
        };
      case "claimed_later":
      case "unclaimed":
        return {
          badge: "bg-red-500/10 text-red-600 border-red-200",
          card: "border-red-300 bg-red-50/30 dark:bg-red-950/10",
          dot: "bg-red-500",
          text: "text-red-600",
        };
      default:
        return {
          badge: "bg-muted text-muted-foreground border-border",
          card: "border-border",
          dot: "bg-muted-foreground",
          text: "text-muted-foreground",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats & Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="px-3 py-1 bg-green-500/10 text-green-700 border-green-300">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            {liveCount} Live Now
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-yellow-500/10 text-yellow-700 border-yellow-300">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2" />
            {claimedSoonCount} Claimed (7 Days)
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-red-500/10 text-red-700 border-red-300">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
            {claimedLaterCount + unclaimedCount} Other
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Unclaimed Toggle */}
          <div className="flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2">
            <Switch
              id="show-unclaimed"
              checked={showUnclaimed}
              onCheckedChange={setShowUnclaimed}
            />
            <Label htmlFor="show-unclaimed" className="text-sm cursor-pointer flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Show Unclaimed Jobs ({unclaimedCount})
            </Label>
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
      </div>

      {/* Map */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Live Shift Tracking Map
          </CardTitle>
          <CardDescription>
            Real-time view of all orders with full client details for admin oversight
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

              {visibleBookings.map((booking) => (
                booking.coords && (
                  <Marker
                    key={booking.id}
                    position={[booking.coords.lat, booking.coords.lng]}
                    icon={getMarkerIcon(booking.category)}
                  >
                    <Popup>
                      <div className="text-sm min-w-[240px] space-y-2">
                        {/* Category Label */}
                        <div className={`font-bold text-xs uppercase tracking-wide ${getCategoryColorClasses(booking.category).text}`}>
                          {getCategoryLabel(booking.category)}
                        </div>

                        {/* Client Name & Phone - Full details for Admin */}
                        <div className="border-b border-border pb-2">
                          <div className="flex items-center gap-1 mb-1">
                            <User className="w-3 h-3 text-primary" />
                            <p className="font-semibold text-foreground">{booking.clientName}</p>
                          </div>
                          {booking.clientPhone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <a 
                                href={`tel:${booking.clientPhone}`} 
                                className="text-primary hover:underline text-xs"
                              >
                                {booking.clientPhone}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Task Type */}
                        <div className="flex items-start gap-1">
                          <Briefcase className="w-3 h-3 text-muted-foreground mt-0.5" />
                          <div className="text-xs">
                            {booking.serviceType.length > 0 
                              ? booking.serviceType.slice(0, 2).join(", ") + (booking.serviceType.length > 2 ? "..." : "")
                              : "General Care"}
                          </div>
                        </div>

                        {/* Scheduled Start Date */}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">
                            {format(parseISO(booking.scheduledDate), "EEEE, MMM d, yyyy")}
                          </span>
                        </div>

                        {/* Start Time */}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">
                            {booking.startTime} - {booking.endTime}
                          </span>
                        </div>

                        {/* Days/Hours Remaining */}
                        <div className="flex items-center gap-1 pt-1 border-t border-border">
                          <CircleDot className={`w-3 h-3 ${getCategoryColorClasses(booking.category).text}`} />
                          <span className={`text-xs font-medium ${getCategoryColorClasses(booking.category).text}`}>
                            {booking.category === "live" 
                              ? "In Progress" 
                              : formatTimeRemaining(booking.daysRemaining, booking.hoursRemaining)}
                          </span>
                        </div>

                        {/* PSW Assignment */}
                        {booking.pswFirstName && (
                          <div className="text-xs text-muted-foreground">
                            PSW: {booking.pswFirstName}
                          </div>
                        )}

                        {/* Address */}
                        <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                          <p>{booking.patientAddress}</p>
                          {booking.postalCode && <p>{booking.postalCode}</p>}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
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
                <span className="text-xs text-muted-foreground">Claimed (within 7 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-xs text-muted-foreground">Unclaimed / 7+ Days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Cards - Read Only, No Submit Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleBookings.length === 0 ? (
          <Card className="col-span-full shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              No bookings to display on map
            </CardContent>
          </Card>
        ) : (
          visibleBookings.map((booking) => {
            const colors = getCategoryColorClasses(booking.category);
            return (
              <Card
                key={booking.id}
                className={`shadow-card transition-all cursor-pointer ${
                  selectedBooking === booking.id ? "ring-2 ring-primary" : ""
                } ${colors.card}`}
                onClick={() => setSelectedBooking(booking.id === selectedBooking ? null : booking.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={colors.badge}>
                          {booking.category === "live" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : booking.category === "unclaimed" ? (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {getCategoryLabel(booking.category)}
                        </Badge>
                        {booking.category !== "live" && (
                          <span className={`text-xs ${colors.text}`}>
                            {formatTimeRemaining(booking.daysRemaining, booking.hoursRemaining)}
                          </span>
                        )}
                      </div>

                      {/* Full Client Name - Admin View */}
                      <p className="font-semibold text-foreground">{booking.clientName}</p>
                      
                      {/* Full Phone Number - Admin View */}
                      {booking.clientPhone && (
                        <p className="text-sm text-primary flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${booking.clientPhone}`} className="hover:underline">
                            {booking.clientPhone}
                          </a>
                        </p>
                      )}

                      {/* Task Type */}
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {booking.serviceType.length > 0 
                          ? booking.serviceType.slice(0, 2).join(", ")
                          : "General Care"}
                      </p>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {booking.patientAddress}
                      </p>
                      
                      {/* Scheduled Date & Time */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Calendar className="w-3 h-3" />
                        <span>{format(parseISO(booking.scheduledDate), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span>{booking.startTime} - {booking.endTime}</span>
                      </div>

                      {/* PSW Assignment */}
                      {booking.pswFirstName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          PSW: {booking.pswFirstName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unclaimed Warning */}
                  {booking.category === "unclaimed" && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Action Required: No PSW assigned</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

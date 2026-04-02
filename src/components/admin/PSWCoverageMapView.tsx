// PSW Coverage Map View - Shows PSW home locations with dynamic radius circles
// Helps admin visualize which areas are covered for client bookings.
//
// IMPORTANT: This section controls 'active_service_radius' in app_settings.
// This is the REAL DISPATCH RADIUS used by isWithinAnyPSWCoverageAsync() in postalCodeUtils.ts
// to determine whether a client's location is within range of any approved PSW.
// Per-PSW radius (psw_profiles.coverage_radius_km) is NOT used for dispatch currently.

import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  MapPin, 
  RefreshCw,
  Users,
  Clock,
  CheckCircle,
  Target,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { 
  PSWProfile, 
} from "@/lib/pswProfileStore";
import { supabase } from "@/integrations/supabase/client";
import type { PSAGender } from "@/lib/pswProfileStore";
import { getOfficeCoordinates } from "@/lib/postalCodeUtils";
import { useActiveServiceRadius } from "@/hooks/useActiveServiceRadius";
import { MIN_SERVICE_RADIUS_KM, MAX_SERVICE_RADIUS_KM, RADIUS_INCREMENT_KM } from "@/lib/serviceRadiusStore";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom PSW marker (green for approved)
const approvedPswIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom PSW marker (yellow for pending)
const pendingPswIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Office marker (red)
const officeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
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

interface PSWWithLocation extends PSWProfile {
  coords?: { lat: number; lng: number };
}

export const PSWCoverageMapView = () => {
  const [profiles, setProfiles] = useState<PSWWithLocation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showApproved, setShowApproved] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showRadiusCircles, setShowRadiusCircles] = useState(() => {
    const saved = localStorage.getItem("admin_show_radius_rings");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("admin_show_radius_rings", String(showRadiusCircles));
  }, [showRadiusCircles]);
  const [radiusDraft, setRadiusDraft] = useState<number>(MAX_SERVICE_RADIUS_KM);
  const saveDebounceRef = useRef<number | null>(null);
  
  // Dynamic service radius from database
  const { radius: activeServiceRadius, isLoading: radiusLoading, isSaving: radiusSaving, setActiveRadius } = useActiveServiceRadius();

  // Keep the UI slider in sync with the persisted value
  useEffect(() => {
    setRadiusDraft(activeServiceRadius);
  }, [activeServiceRadius]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("*")
        .in("vetting_status", ["approved", "pending"])
        .eq("is_test", false)
        .order("first_name");

      if (error) throw error;

      const enrichedProfiles: PSWWithLocation[] = (data || []).map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone || "",
        gender: (row.gender as PSAGender) || undefined,
        languages: row.languages || ["en"],
        homePostalCode: row.home_postal_code || "",
        homeCity: row.home_city || "",
        profilePhotoUrl: row.profile_photo_url || undefined,
        profilePhotoName: row.profile_photo_name || undefined,
        hscpoaNumber: row.hscpoa_number || undefined,
        policeCheckUrl: row.police_check_url || undefined,
        policeCheckName: row.police_check_name || undefined,
        policeCheckDate: row.police_check_date || undefined,
        vehiclePhotoUrl: row.vehicle_photo_url || undefined,
        vehiclePhotoName: row.vehicle_photo_name || undefined,
        yearsExperience: row.years_experience || undefined,
        experienceConditions: (row as any).experience_conditions || [],
        certifications: row.certifications || undefined,
        certificationsList: (row as any).certifications_list || [],
        hasOwnTransport: row.has_own_transport || undefined,
        licensePlate: row.license_plate || undefined,
        availableShifts: row.available_shifts || undefined,
        vehicleDisclaimer: row.vehicle_disclaimer as unknown as PSWProfile["vehicleDisclaimer"] || undefined,
        vettingStatus: row.vetting_status as PSWProfile["vettingStatus"],
        vettingNotes: row.vetting_notes || undefined,
        vettingUpdatedAt: row.vetting_updated_at || undefined,
        appliedAt: row.applied_at || new Date().toISOString(),
        approvedAt: row.approved_at || undefined,
        expiredDueToPoliceCheck: row.expired_due_to_police_check || false,
        coords: (() => {
          const lat = Number(row.home_lat);
          const lng = Number(row.home_lng);
          if (row.home_lat != null && row.home_lng != null && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            return { lat, lng };
          }
          return undefined;
        })(),
      }));

      // Debug logging
      const withCoords = enrichedProfiles.filter(p => p.coords);
      console.log(`[CoverageMap] Total PSWs loaded: ${enrichedProfiles.length}`);
      console.log(`[CoverageMap] With valid coordinates: ${withCoords.length}`);
      console.log(`[CoverageMap] Missing coordinates: ${enrichedProfiles.length - withCoords.length}`);
      
      setProfiles(enrichedProfiles);
    } catch (error: any) {
      console.error("Error loading PSW profiles for map:", error);
      toast.error("Failed to load PSW coverage data");
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProfiles();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success("Coverage map refreshed");
  };
  
  // Radix slider "commit" can be flaky depending on pointer interactions.
  // We update UI immediately while dragging, and persist with a short debounce.
  const handleRadiusValueChange = (value: number[]) => {
    const newRadius = value[0];
    setRadiusDraft(newRadius);

    if (saveDebounceRef.current) {
      window.clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = window.setTimeout(async () => {
      console.log("Persisting active_service_radius:", newRadius);
      const success = await setActiveRadius(newRadius);
      if (success) {
        toast.success(`Service radius updated to ${newRadius}km`);
      } else {
        toast.error("Couldn't save radius (admin permissions required)");
      }
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) {
        window.clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  // Filter profiles based on toggles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (p.vettingStatus === "approved" && showApproved) return true;
      if (p.vettingStatus === "pending" && showPending) return true;
      return false;
    }).filter((p) => p.coords); // Only show those with valid coordinates
  }, [profiles, showApproved, showPending]);

  // Calculate map bounds based on PSW locations
  const mapBounds = useMemo(() => {
    const pswCoords: [number, number][] = [];
    
    filteredProfiles.forEach((p) => {
      if (p.coords) {
        pswCoords.push([p.coords.lat, p.coords.lng]);
      }
    });
    
    if (pswCoords.length > 0) {
      const bounds = L.latLngBounds(pswCoords);
      console.log(`[CoverageMap] fitBounds with ${pswCoords.length} markers, center: ${bounds.getCenter().toString()}`);
      return bounds;
    }
    
    // Default to Toronto, Ontario
    console.log("[CoverageMap] No PSW markers, defaulting to Toronto center");
    return L.latLngBounds([[43.55, -79.50], [43.75, -79.25]]);
  }, [filteredProfiles]);

  const approvedCount = profiles.filter((p) => p.vettingStatus === "approved" && p.coords).length;
  const pendingCount = profiles.filter((p) => p.vettingStatus === "pending" && p.coords).length;
  const officeCoords = getOfficeCoordinates();

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            {approvedCount} Approved
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Clock className="w-3 h-3 mr-2" />
            {pendingCount} Pending
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

      {/* Service Radius Control */}
      <Card className="shadow-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4 text-primary" />
            Active Service Radius (Dispatch Radius)
          </CardTitle>
          <CardDescription>
            This controls which PSWs are considered "in range" for client requests. Changes here directly affect booking eligibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              {radiusLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <Slider
                   value={[radiusDraft]}
                  min={MIN_SERVICE_RADIUS_KM}
                  max={MAX_SERVICE_RADIUS_KM}
                  step={RADIUS_INCREMENT_KM}
                   onValueChange={handleRadiusValueChange}
                  disabled={radiusSaving}
                  className="w-full"
                />
              )}
            </div>
            <div className="w-24 text-right">
              <Badge variant="default" className="text-lg font-bold px-3 py-1">
                {radiusSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `${radiusDraft}km`
                )}
              </Badge>
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{MIN_SERVICE_RADIUS_KM}km (Tightest)</span>
            <span>{MAX_SERVICE_RADIUS_KM}km (Widest)</span>
          </div>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <Card className="shadow-card">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="show-approved"
                checked={showApproved}
                onCheckedChange={setShowApproved}
              />
              <Label htmlFor="show-approved" className="flex items-center gap-2 cursor-pointer">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                Approved PSWs
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-pending"
                checked={showPending}
                onCheckedChange={setShowPending}
              />
              <Label htmlFor="show-pending" className="flex items-center gap-2 cursor-pointer">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                Pending PSWs
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-radius"
                checked={showRadiusCircles}
                onCheckedChange={setShowRadiusCircles}
              />
              <Label htmlFor="show-radius" className="cursor-pointer">
                 Show {radiusDraft}km Radius
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            PSW Coverage Areas
          </CardTitle>
          <CardDescription className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full" /> Office
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full" /> Approved PSW
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-500 rounded-full" /> Pending PSW
            </span>
            <span className="inline-flex items-center gap-2">
               <span className="w-3 h-3 bg-green-200 rounded-full border border-green-400" /> {radiusDraft}km Service Radius
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] w-full">
            <MapContainer
              center={[officeCoords.lat, officeCoords.lng]}
              zoom={8}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapBoundsUpdater bounds={mapBounds} />

              {/* Office Marker */}
              <Marker
                position={[officeCoords.lat, officeCoords.lng]}
                icon={officeIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-red-700">Central Office</p>
                    <p className="text-muted-foreground">Belleville, ON</p>
                  </div>
                </Popup>
              </Marker>

              {/* PSW Markers with Radius Circles */}
              {filteredProfiles.map((psw) => (
                psw.coords && (
                  <div key={psw.id}>
                    {/* Radius Circle — only for APPROVED PSWs */}
                     {showRadiusCircles && psw.vettingStatus === "approved" && (
                       <Circle
                         center={[psw.coords.lat, psw.coords.lng]}
                          radius={radiusDraft * 1000}
                         pathOptions={{
                           color: "#22c55e",
                           fillColor: "#22c55e",
                           fillOpacity: 0.08,
                           weight: 1.5,
                         }}
                       />
                     )}
                    
                    {/* PSW Marker */}
                    <Marker
                      position={[psw.coords.lat, psw.coords.lng]}
                      icon={psw.vettingStatus === "approved" ? approvedPswIcon : pendingPswIcon}
                    >
                      <Popup>
                        <div className="text-sm min-w-[150px]">
                          <p className="font-semibold text-foreground">
                            {psw.firstName} {psw.lastName}
                          </p>
                          <p className="text-muted-foreground">
                            {psw.homeCity || "City not set"}, ON
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {psw.homePostalCode}
                          </p>
                          <div className="mt-2 pt-2 border-t">
                            {psw.vettingStatus === "approved" ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                             Coverage: {radiusDraft}km radius
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  </div>
                )
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* PSW List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">PSWs with Coverage Areas</CardTitle>
          <CardDescription>
            {filteredProfiles.length} PSWs with valid postal codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No PSWs with valid home postal codes found
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProfiles.map((psw) => (
                <div
                  key={psw.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      psw.vettingStatus === "approved" ? "bg-green-500" : "bg-amber-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {psw.firstName} {psw.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {psw.homeCity || "Unknown"} • {psw.homePostalCode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

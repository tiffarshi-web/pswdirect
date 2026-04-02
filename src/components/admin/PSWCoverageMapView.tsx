// PSW Coverage Map View - Shows approved PSW home locations + pending jobs
// with individual per-PSW radius toggles.

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Loader2,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import {
  PSWProfile,
} from "@/lib/pswProfileStore";
import { supabase } from "@/integrations/supabase/client";
import { AssignPSWDialog } from "./AssignPSWDialog";
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

const approvedPswIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const pendingJobIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const officeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const MapBoundsUpdater = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
};

interface PSWWithLocation extends PSWProfile {
  coords?: { lat: number; lng: number };
}

interface PendingJob {
  id: string;
  clientFirstName: string;
  serviceType: string[];
  scheduledDate: string;
  startTime: string;
  endTime: string;
  city: string;
  lat: number | null;
  lng: number | null;
}

export const PSWCoverageMapView = () => {
  const [profiles, setProfiles] = useState<PSWWithLocation[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showApproved, setShowApproved] = useState(true);
  const [showPendingJobs, setShowPendingJobs] = useState(true);
  const [visibleRadii, setVisibleRadii] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PendingJob | null>(null);

  const [radiusDraft, setRadiusDraft] = useState<number>(MAX_SERVICE_RADIUS_KM);
  const saveDebounceRef = useRef<number | null>(null);

  const { radius: activeServiceRadius, isLoading: radiusLoading, isSaving: radiusSaving, setActiveRadius } = useActiveServiceRadius();

  useEffect(() => {
    setRadiusDraft(activeServiceRadius);
  }, [activeServiceRadius]);

  const toggleRadius = useCallback((pswId: string) => {
    setVisibleRadii(prev => {
      const next = new Set(prev);
      if (next.has(pswId)) next.delete(pswId); else next.add(pswId);
      return next;
    });
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("*")
        .eq("vetting_status", "approved")
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

      const withCoords = enrichedProfiles.filter(p => p.coords);
      console.log(`[CoverageMap] Approved PSWs loaded: ${enrichedProfiles.length}, with coords: ${withCoords.length}`);
      setProfiles(enrichedProfiles);
    } catch (error: any) {
      console.error("Error loading PSW profiles for map:", error);
      toast.error("Failed to load PSW coverage data");
    }
  };

  const loadPendingJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, client_first_name, service_type, scheduled_date, start_time, end_time, patient_address, patient_postal_code, client_postal_code")
        .eq("status", "pending")
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      // We don't have lat/lng on bookings directly, but we can try to extract city from address
      const jobs: PendingJob[] = (data || []).map((b) => {
        // Extract city from address (rough: last part before postal code or comma-separated)
        const addr = b.patient_address || "";
        const parts = addr.split(",").map((s: string) => s.trim());
        const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "Unknown";

        return {
          id: b.id,
          clientFirstName: b.client_first_name || "Client",
          serviceType: b.service_type || [],
          scheduledDate: b.scheduled_date,
          startTime: b.start_time,
          endTime: b.end_time,
          city,
          lat: null, // bookings don't store lat/lng - we'll skip map plotting for those without coords
          lng: null,
        };
      });

      console.log(`[CoverageMap] Pending jobs loaded: ${jobs.length}`);
      setPendingJobs(jobs);
    } catch (error: any) {
      console.error("Error loading pending jobs:", error);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadPendingJobs();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProfiles();
    loadPendingJobs();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success("Coverage map refreshed");
  };

  const handleRadiusValueChange = (value: number[]) => {
    const newRadius = value[0];
    setRadiusDraft(newRadius);
    if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = window.setTimeout(async () => {
      const success = await setActiveRadius(newRadius);
      if (success) toast.success(`Service radius updated to ${newRadius}km`);
      else toast.error("Couldn't save radius (admin permissions required)");
    }, 350);
  };

  useEffect(() => {
    return () => { if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current); };
  }, []);

  const approvedWithCoords = useMemo(() =>
    profiles.filter(p => p.coords && showApproved), [profiles, showApproved]);

  const mapBounds = useMemo(() => {
    const coords: [number, number][] = [];
    approvedWithCoords.forEach(p => { if (p.coords) coords.push([p.coords.lat, p.coords.lng]); });
    // pending jobs don't have lat/lng currently, but if they did we'd include them

    if (coords.length > 0) {
      return L.latLngBounds(coords);
    }
    return L.latLngBounds([[43.55, -79.50], [43.75, -79.25]]);
  }, [approvedWithCoords]);

  const approvedCount = profiles.filter(p => p.coords).length;
  const officeCoords = getOfficeCoordinates();

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            {approvedCount} Approved PSWs
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Briefcase className="w-3 h-3 mr-2" />
            {pendingJobs.length} Pending Jobs
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
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
            Controls which PSWs are considered "in range" for client requests. Use the toggle on each PSW to visualize their individual radius.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              {radiusLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
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
                {radiusSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : `${radiusDraft}km`}
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
              <Switch id="show-approved" checked={showApproved} onCheckedChange={setShowApproved} />
              <Label htmlFor="show-approved" className="flex items-center gap-2 cursor-pointer">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                Approved PSWs
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show-pending-jobs" checked={showPendingJobs} onCheckedChange={setShowPendingJobs} />
              <Label htmlFor="show-pending-jobs" className="flex items-center gap-2 cursor-pointer">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                Pending Jobs
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
            Coverage & Pending Jobs
          </CardTitle>
          <CardDescription className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full" /> Office
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full" /> Approved PSW
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full" /> Pending Job
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
              <Marker position={[officeCoords.lat, officeCoords.lng]} icon={officeIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-red-700">Central Office</p>
                    <p className="text-muted-foreground">Belleville, ON</p>
                  </div>
                </Popup>
              </Marker>

              {/* Approved PSW Markers */}
              {showApproved && approvedWithCoords.map((psw) =>
                psw.coords && (
                  <div key={psw.id}>
                    {visibleRadii.has(psw.id) && (
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
                    <Marker position={[psw.coords.lat, psw.coords.lng]} icon={approvedPswIcon}>
                      <Popup>
                        <div className="text-sm min-w-[180px]">
                          <p className="font-semibold">{psw.firstName} {psw.lastName}</p>
                          <p className="text-muted-foreground">{psw.homeCity || "City not set"}, ON</p>
                          <p className="text-xs text-muted-foreground">{psw.homePostalCode}</p>
                          <div className="mt-2 pt-2 border-t">
                            <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" /> Approved
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <button
                              className={`text-xs px-2 py-1 rounded border ${
                                visibleRadii.has(psw.id)
                                  ? "bg-green-100 border-green-400 text-green-700"
                                  : "bg-muted border-border text-foreground"
                              }`}
                              onClick={() => toggleRadius(psw.id)}
                            >
                              {visibleRadii.has(psw.id) ? `Hide ${radiusDraft}km Radius` : `Show ${radiusDraft}km Radius`}
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </div>
                )
              )}

              {/* Pending Job markers — jobs don't have lat/lng so we show them in the list only */}
              {/* If bookings gain geocoded coords in the future, they would render here */}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pending Jobs List */}
      {showPendingJobs && pendingJobs.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-500" />
              Pending Jobs ({pendingJobs.length})
            </CardTitle>
            <CardDescription>Jobs awaiting PSW assignment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingJobs.map((job) => (
                <div key={job.id} className="flex flex-col gap-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full shrink-0" />
                    <p className="font-medium text-foreground truncate">{job.clientFirstName}</p>
                    <Badge variant="outline" className="ml-auto text-xs">Pending</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{job.serviceType.join(", ") || "General Care"}</p>
                  <p className="text-xs text-muted-foreground">{job.scheduledDate} · {job.startTime}–{job.endTime}</p>
                  <p className="text-xs text-muted-foreground">{job.city}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved PSW List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Approved PSWs</CardTitle>
          <CardDescription>
            {approvedWithCoords.length} PSWs with valid coordinates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvedWithCoords.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No approved PSWs with valid coordinates found</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {approvedWithCoords.map((psw) => (
                <div key={psw.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-3 h-3 bg-green-500 rounded-full shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{psw.firstName} {psw.lastName}</p>
                    <p className="text-xs text-muted-foreground">{psw.homeCity || "Unknown"} • {psw.homePostalCode}</p>
                  </div>
                  <button
                    className={`text-xs px-2 py-1 rounded border shrink-0 ${
                      visibleRadii.has(psw.id)
                        ? "bg-green-100 border-green-400 text-green-700"
                        : "bg-muted border-border text-foreground"
                    }`}
                    onClick={() => toggleRadius(psw.id)}
                  >
                    {visibleRadii.has(psw.id) ? "Hide Radius" : "Show Radius"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

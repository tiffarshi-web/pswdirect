// PSW Coverage Map View - Shows PSW home locations with 75km radius circles
// Helps admin visualize which areas are covered for client bookings

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  RefreshCw,
  Users,
  Clock,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { 
  PSWProfile, 
  getPSWProfiles, 
  initializePSWProfiles 
} from "@/lib/pswProfileStore";
import { getCoordinatesFromPostalCode, getOfficeCoordinates } from "@/lib/postalCodeUtils";
import { SERVICE_RADIUS_KM } from "@/lib/businessConfig";
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
  const [showRadiusCircles, setShowRadiusCircles] = useState(true);

  const loadProfiles = () => {
    initializePSWProfiles();
    const allProfiles = getPSWProfiles();
    
    // Enrich with coordinates
    const enrichedProfiles: PSWWithLocation[] = allProfiles.map((profile) => {
      const coords = profile.homePostalCode 
        ? getCoordinatesFromPostalCode(profile.homePostalCode)
        : null;
      return {
        ...profile,
        coords: coords || undefined,
      };
    });
    
    setProfiles(enrichedProfiles);
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

  // Filter profiles based on toggles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (p.vettingStatus === "approved" && showApproved) return true;
      if (p.vettingStatus === "pending" && showPending) return true;
      return false;
    }).filter((p) => p.coords); // Only show those with valid coordinates
  }, [profiles, showApproved, showPending]);

  // Calculate map bounds
  const mapBounds = useMemo(() => {
    const coords: [number, number][] = [];
    
    // Add office location
    const office = getOfficeCoordinates();
    coords.push([office.lat, office.lng]);
    
    // Add PSW locations
    filteredProfiles.forEach((p) => {
      if (p.coords) {
        coords.push([p.coords.lat, p.coords.lng]);
      }
    });
    
    if (coords.length >= 2) {
      return L.latLngBounds(coords);
    }
    
    // Default to Belleville area
    return L.latLngBounds([[43.9, -77.8], [44.4, -76.9]]);
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
                Show 75km Radius
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
              <span className="w-3 h-3 bg-green-200 rounded-full border border-green-400" /> 75km Service Radius
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
                    {/* 75km Radius Circle */}
                    {showRadiusCircles && (
                      <Circle
                        center={[psw.coords.lat, psw.coords.lng]}
                        radius={SERVICE_RADIUS_KM * 1000} // Convert km to meters
                        pathOptions={{
                          color: psw.vettingStatus === "approved" ? "#22c55e" : "#f59e0b",
                          fillColor: psw.vettingStatus === "approved" ? "#22c55e" : "#f59e0b",
                          fillOpacity: 0.1,
                          weight: 2,
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
                            Coverage: {SERVICE_RADIUS_KM}km radius
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

// PSW Coverage Map View - Shows approved PSW home locations from v_psw_coverage_map
// Uses real Supabase data, NOT mock/localStorage profiles

import { useState, useEffect, useMemo, useCallback } from "react";
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
  CheckCircle,
  Loader2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOfficeCoordinates } from "@/lib/postalCodeUtils";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const approvedPswIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const officeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MapBoundsUpdater = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

interface CoverageRow {
  id: string;
  first_name: string;
  last_name: string;
  home_postal_code: string | null;
  home_city: string | null;
  home_lat: number;
  home_lng: number;
  coverage_radius_km: number;
}

export const PSWCoverageMapView = () => {
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showRadiusCircles, setShowRadiusCircles] = useState(true);

  const loadCoverage = useCallback(async () => {
    const { data, error } = await supabase
      .from("v_psw_coverage_map" as any)
      .select("*");

    if (error) {
      console.error("Coverage fetch error:", error);
      toast.error("Failed to load coverage data");
      setRows([]);
    } else {
      setRows((data as unknown as CoverageRow[]) || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCoverage();
  }, [loadCoverage]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCoverage();
    setIsRefreshing(false);
    toast.success("Coverage map refreshed");
  };

  const handleGeocode = async () => {
    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-postal-codes", {
        method: "POST",
        body: {},
      });
      if (error) throw error;
      const result = data as { total: number; updated: number; failed: number };
      toast.success(`Geocoded ${result.updated} of ${result.total} PSWs`, {
        description: result.failed > 0 ? `${result.failed} could not be geocoded` : undefined,
      });
      // Reload the map
      await loadCoverage();
    } catch (err: any) {
      console.error("Geocode error:", err);
      toast.error("Geocoding failed");
    } finally {
      setIsGeocoding(false);
    }
  };

  const officeCoords = getOfficeCoordinates();

  const mapBounds = useMemo(() => {
    const coords: [number, number][] = [[officeCoords.lat, officeCoords.lng]];
    rows.forEach((r) => coords.push([r.home_lat, r.home_lng]));
    if (coords.length >= 2) return L.latLngBounds(coords);
    return L.latLngBounds([[43.9, -77.8], [44.4, -76.9]]);
  }, [rows, officeCoords]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        Loading coverage data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Badge variant="secondary" className="px-3 py-1">
          <CheckCircle className="w-3 h-3 mr-2" />
          {rows.length} Approved PSWs on map
        </Badge>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGeocode} disabled={isGeocoding}>
            <Globe className={`w-4 h-4 mr-2 ${isGeocoding ? "animate-spin" : ""}`} />
            {isGeocoding ? "Geocoding…" : "Geocode Approved PSWs"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="shadow-card">
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <Switch id="show-radius" checked={showRadiusCircles} onCheckedChange={setShowRadiusCircles} />
            <Label htmlFor="show-radius" className="cursor-pointer">Show Coverage Radius</Label>
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
              <span className="w-3 h-3 bg-green-200 rounded-full border border-green-400" /> Coverage Radius
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

              {/* PSW Markers */}
              {rows.map((psw) => (
                <div key={psw.id}>
                  {showRadiusCircles && (
                    <Circle
                      center={[psw.home_lat, psw.home_lng]}
                      radius={(psw.coverage_radius_km || 25) * 1000}
                      pathOptions={{
                        color: "#22c55e",
                        fillColor: "#22c55e",
                        fillOpacity: 0.1,
                        weight: 2,
                      }}
                    />
                  )}
                  <Marker position={[psw.home_lat, psw.home_lng]} icon={approvedPswIcon}>
                    <Popup>
                      <div className="text-sm min-w-[150px]">
                        <p className="font-semibold">{psw.first_name} {psw.last_name}</p>
                        <p className="text-muted-foreground">{psw.home_city || "City not set"}, ON</p>
                        <p className="text-xs text-muted-foreground">{psw.home_postal_code}</p>
                        <Badge className="mt-2 bg-green-500/10 text-green-600 border-green-200 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> Approved
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Coverage: {psw.coverage_radius_km || 25}km radius
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* PSW List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">PSWs with Coverage Areas</CardTitle>
          <CardDescription>{rows.length} approved PSWs with coordinates</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No approved PSWs with coordinates found. Click "Geocode Approved PSWs" to populate.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((psw) => (
                <div key={psw.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-3 h-3 rounded-full shrink-0 bg-green-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {psw.first_name} {psw.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {psw.home_city || "Unknown"} • {psw.home_postal_code}
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

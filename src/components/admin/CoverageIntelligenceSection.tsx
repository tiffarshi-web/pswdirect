// Coverage Intelligence — admin-only PSW concentration analysis
// Helps decide advertising / geo-fence radius based on PSW distribution

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  MapPin, RefreshCw, Users, Clock, CheckCircle, Target, Loader2, BarChart3, Lightbulb, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOfficeCoordinates } from "@/lib/postalCodeUtils";
import { calculateHaversineDistance } from "@/lib/serviceRadiusStore";
import "leaflet/dist/leaflet.css";

// --- Leaflet icon setup ---
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const approvedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const pendingIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const centerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const MapBoundsUpdater = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [50, 50] }); }, [bounds, map]);
  return null;
};

// --- Types ---
interface PSWPoint {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  status: "approved" | "pending";
}

// --- Helpers ---
const DEFAULT_CENTER = getOfficeCoordinates(); // Barrie-area default

const groupByCity = (psws: PSWPoint[]) => {
  const map = new Map<string, number>();
  psws.forEach((p) => {
    const key = p.city || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
};

const groupByFSA = (psws: PSWPoint[]) => {
  const map = new Map<string, number>();
  psws.forEach((p) => {
    const fsa = (p.postalCode || "").replace(/\s/g, "").substring(0, 3).toUpperCase();
    if (fsa.length === 3) map.set(fsa, (map.get(fsa) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([fsa, count]) => ({ fsa, count }))
    .sort((a, b) => b.count - a.count);
};

// Simple "cluster" visualization: group nearby markers into one circle with count label
const clusterMarkers = (points: PSWPoint[], zoomLevel: number): { lat: number; lng: number; count: number; members: PSWPoint[] }[] => {
  const gridSize = Math.max(0.05, 2 / Math.pow(2, zoomLevel - 5)); // dynamic grid
  const buckets = new Map<string, PSWPoint[]>();
  points.forEach((p) => {
    const key = `${Math.round(p.lat / gridSize)}_${Math.round(p.lng / gridSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  });
  return Array.from(buckets.values()).map((members) => {
    const lat = members.reduce((s, m) => s + m.lat, 0) / members.length;
    const lng = members.reduce((s, m) => s + m.lng, 0) / members.length;
    return { lat, lng, count: members.length, members };
  });
};

// Recommendation calculations
const smallestRadiusForN = (center: { lat: number; lng: number }, psws: PSWPoint[], n: number) => {
  const distances = psws.map((p) => calculateHaversineDistance(center.lat, center.lng, p.lat, p.lng)).sort((a, b) => a - b);
  if (n > distances.length) return null;
  return Math.ceil(distances[n - 1]);
};

const radiusForPercentage = (center: { lat: number; lng: number }, psws: PSWPoint[], pct: number) => {
  const distances = psws.map((p) => calculateHaversineDistance(center.lat, center.lng, p.lat, p.lng)).sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(distances.length * (pct / 100)) - 1);
  if (idx >= distances.length) return distances[distances.length - 1] ? Math.ceil(distances[distances.length - 1]) : null;
  return Math.ceil(distances[idx]);
};

// --- Component ---
export const CoverageIntelligenceSection = () => {
  const [psws, setPsws] = useState<PSWPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPending, setShowPending] = useState(false);
  const [missingCount, setMissingCount] = useState(0);

  // Advertising radius (persisted to app_settings)
  const [advertisingRadius, setAdvertisingRadius] = useState(75);
  const [radiusDraft, setRadiusDraft] = useState(75);
  const [radiusSaving, setRadiusSaving] = useState(false);
  const saveRef = useRef<number | null>(null);

  // Recommendation state
  const [recN, setRecN] = useState(5);
  const [recPct, setRecPct] = useState(80);
  const [centerLat, setCenterLat] = useState(DEFAULT_CENTER.lat);
  const [centerLng, setCenterLng] = useState(DEFAULT_CENTER.lng);

  // Map zoom for clustering
  const [zoom, setZoom] = useState(8);

  // --- Data loading ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("id, first_name, last_name, home_city, home_postal_code, home_lat, home_lng, vetting_status")
        .in("vetting_status", ["approved", "pending"])
        .eq("is_test", false)
        .order("first_name");

      if (error) throw error;

      let missing = 0;
      const points: PSWPoint[] = [];
      (data || []).forEach((r) => {
        if (r.home_lat && r.home_lng) {
          points.push({
            id: r.id,
            firstName: r.first_name,
            lastName: r.last_name,
            city: r.home_city || "",
            postalCode: r.home_postal_code || "",
            lat: Number(r.home_lat),
            lng: Number(r.home_lng),
            status: r.vetting_status as "approved" | "pending",
          });
        } else {
          missing++;
        }
      });
      setPsws(points);
      setMissingCount(missing);
    } catch (e: any) {
      console.error("Coverage data load error:", e);
      toast.error("Failed to load PSW coverage data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load advertising radius
  const loadRadius = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "advertising_radius_km")
      .maybeSingle();
    if (data?.setting_value) {
      const v = parseInt(data.setting_value, 10);
      if (!isNaN(v)) { setAdvertisingRadius(v); setRadiusDraft(v); }
    }
  }, []);

  useEffect(() => { loadData(); loadRadius(); }, [loadData, loadRadius]);

  // Save radius with debounce
  const handleRadiusChange = (value: number[]) => {
    const v = value[0];
    setRadiusDraft(v);
    if (saveRef.current) window.clearTimeout(saveRef.current);
    saveRef.current = window.setTimeout(async () => {
      setRadiusSaving(true);
      const { error } = await supabase
        .from("app_settings")
        .upsert({ setting_key: "advertising_radius_km", setting_value: v.toString(), updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
      setRadiusSaving(false);
      if (error) {
        toast.error("Failed to save advertising radius");
      } else {
        setAdvertisingRadius(v);
        toast.success(`Advertising radius set to ${v}km`);
      }
    }, 400);
  };

  useEffect(() => () => { if (saveRef.current) window.clearTimeout(saveRef.current); }, []);

  // --- Derived ---
  const activePsws = useMemo(() => psws.filter((p) => p.status === "approved"), [psws]);
  const visiblePsws = useMemo(() => showPending ? psws : activePsws, [psws, activePsws, showPending]);

  const clusters = useMemo(() => clusterMarkers(visiblePsws, zoom), [visiblePsws, zoom]);

  const topCities = useMemo(() => groupByCity(activePsws).slice(0, 10), [activePsws]);
  const topFSAs = useMemo(() => groupByFSA(activePsws).slice(0, 10), [activePsws]);

  const mapBounds = useMemo(() => {
    const coords: [number, number][] = [[centerLat, centerLng]];
    visiblePsws.forEach((p) => coords.push([p.lat, p.lng]));
    return coords.length >= 2 ? L.latLngBounds(coords) : L.latLngBounds([[43.5, -80.5], [44.8, -76.5]]);
  }, [visiblePsws, centerLat, centerLng]);

  // Recommendations
  const recSmallest = useMemo(() => smallestRadiusForN({ lat: centerLat, lng: centerLng }, activePsws, recN), [activePsws, centerLat, centerLng, recN]);
  const recPercentage = useMemo(() => radiusForPercentage({ lat: centerLat, lng: centerLng }, activePsws, recPct), [activePsws, centerLat, centerLng, recPct]);

  const applyRadius = async (km: number) => {
    const clamped = Math.max(5, Math.min(75, km));
    setRadiusDraft(clamped);
    setRadiusSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ setting_key: "advertising_radius_km", setting_value: clamped.toString(), updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
    setRadiusSaving(false);
    if (!error) { setAdvertisingRadius(clamped); toast.success(`Advertising radius applied: ${clamped}km`); }
    else toast.error("Failed to apply radius");
  };

  // Zoom tracker
  const ZoomTracker = () => {
    const map = useMap();
    useEffect(() => {
      const handler = () => setZoom(map.getZoom());
      map.on("zoomend", handler);
      return () => { map.off("zoomend", handler); };
    }, [map]);
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Coverage Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Analyse PSW concentration to optimise advertising radius
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1">
            <CheckCircle className="w-3 h-3 mr-1" /> {activePsws.length} Active
          </Badge>
          {missingCount > 0 && (
            <Badge variant="outline" className="px-3 py-1 text-destructive border-destructive/30">
              <AlertTriangle className="w-3 h-3 mr-1" /> {missingCount} missing location
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Advertising Radius Control */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4 text-primary" />
            Advertising / Geo-fence Radius
          </CardTitle>
          <CardDescription>Controls the advertising geo-fence distance. Admin-only — not visible to clients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Slider
                value={[radiusDraft]}
                min={5} max={75} step={5}
                onValueChange={handleRadiusChange}
                disabled={radiusSaving}
              />
            </div>
            <Badge variant="default" className="text-lg font-bold px-3 py-1 min-w-[5rem] justify-center">
              {radiusSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : `${radiusDraft}km`}
            </Badge>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5km (tight)</span><span>75km (widest)</span>
          </div>
        </CardContent>
      </Card>

      {/* Filters + Map */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              PSW Concentration Map
            </CardTitle>
            <div className="flex items-center gap-2">
              <Switch id="ci-pending" checked={showPending} onCheckedChange={setShowPending} />
              <Label htmlFor="ci-pending" className="text-sm cursor-pointer">Include Pending</Label>
            </div>
          </div>
          <CardDescription className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full" /> Center</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full" /> Approved</span>
            {showPending && <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-full" /> Pending</span>}
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-primary/20 rounded-full border border-primary/40" /> {radiusDraft}km radius</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] w-full">
            <MapContainer center={[centerLat, centerLng]} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapBoundsUpdater bounds={mapBounds} />
              <ZoomTracker />

              {/* Center marker + advertising radius circle */}
              <Marker position={[centerLat, centerLng]} icon={centerIcon}>
                <Popup><p className="font-semibold text-sm">Center Point</p></Popup>
              </Marker>
              <Circle
                center={[centerLat, centerLng]}
                radius={radiusDraft * 1000}
                pathOptions={{ color: "hsl(var(--primary))", fillColor: "hsl(var(--primary))", fillOpacity: 0.08, weight: 2, dashArray: "6 4" }}
              />

              {/* Clustered markers */}
              {clusters.map((c, i) =>
                c.count === 1 ? (
                  <Marker key={i} position={[c.lat, c.lng]} icon={c.members[0].status === "approved" ? approvedIcon : pendingIcon}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{c.members[0].firstName} {c.members[0].lastName}</p>
                        <p className="text-muted-foreground">{c.members[0].city || "Unknown"}</p>
                        <Badge className={c.members[0].status === "approved" ? "bg-green-500/10 text-green-600 border-green-200 text-xs mt-1" : "bg-amber-500/10 text-amber-600 border-amber-200 text-xs mt-1"}>
                          {c.members[0].status === "approved" ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                    </Popup>
                  </Marker>
                ) : (
                  <Circle key={i} center={[c.lat, c.lng]} radius={Math.max(3000, c.count * 1500)}
                    pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.25, weight: 2 }}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold">{c.count} PSWs in this area</p>
                        <ul className="mt-1 text-xs max-h-32 overflow-y-auto">
                          {c.members.slice(0, 10).map((m) => <li key={m.id}>{m.firstName} {m.lastName} — {m.city}</li>)}
                          {c.members.length > 10 && <li className="text-muted-foreground">+{c.members.length - 10} more</li>}
                        </ul>
                      </div>
                    </Popup>
                  </Circle>
                )
              )}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Concentration Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Cities</CardTitle>
            <CardDescription>Most common home cities among active PSWs</CardDescription>
          </CardHeader>
          <CardContent>
            {topCities.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No data available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>City</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">%</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {topCities.map((r) => (
                    <TableRow key={r.city}>
                      <TableCell className="font-medium">{r.city || "Unknown"}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right">{activePsws.length ? ((r.count / activePsws.length) * 100).toFixed(0) : 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Postal Prefixes (FSA)</CardTitle>
            <CardDescription>3-character Forward Sortation Areas</CardDescription>
          </CardHeader>
          <CardContent>
            {topFSAs.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No data available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>FSA</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">%</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {topFSAs.map((r) => (
                    <TableRow key={r.fsa}>
                      <TableCell className="font-mono font-medium">{r.fsa}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right">{activePsws.length ? ((r.count / activePsws.length) * 100).toFixed(0) : 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendation Helper */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Radius Recommendation
          </CardTitle>
          <CardDescription>Calculate optimal advertising radius from a center point</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Center point config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Center Latitude</Label>
              <Input type="number" step="0.001" value={centerLat} onChange={(e) => setCenterLat(parseFloat(e.target.value) || DEFAULT_CENTER.lat)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Center Longitude</Label>
              <Input type="number" step="0.001" value={centerLng} onChange={(e) => setCenterLng(parseFloat(e.target.value) || DEFAULT_CENTER.lng)} />
            </div>
          </div>

          {/* Option A */}
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-muted/50">
            <div>
              <Label className="text-xs mb-1 block">Smallest radius for at least</Label>
              <Input type="number" min={1} max={activePsws.length || 100} value={recN} onChange={(e) => setRecN(parseInt(e.target.value) || 1)} className="w-20" />
            </div>
            <span className="text-sm text-muted-foreground pb-2">active PSWs →</span>
            <Badge variant="outline" className="text-base font-bold px-3 py-1">
              {recSmallest !== null ? `${recSmallest}km` : "N/A"}
            </Badge>
            {recSmallest !== null && (
              <Button size="sm" variant="secondary" onClick={() => applyRadius(recSmallest)}>
                Apply {recSmallest}km
              </Button>
            )}
          </div>

          {/* Option B */}
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-muted/50">
            <div>
              <Label className="text-xs mb-1 block">Radius covering</Label>
              <Input type="number" min={1} max={100} value={recPct} onChange={(e) => setRecPct(parseInt(e.target.value) || 80)} className="w-20" />
            </div>
            <span className="text-sm text-muted-foreground pb-2">% of active PSWs →</span>
            <Badge variant="outline" className="text-base font-bold px-3 py-1">
              {recPercentage !== null ? `${recPercentage}km` : "N/A"}
            </Badge>
            {recPercentage !== null && (
              <Button size="sm" variant="secondary" onClick={() => applyRadius(recPercentage)}>
                Apply {recPercentage}km
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

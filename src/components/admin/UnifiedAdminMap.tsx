// Unified Admin Coverage & Orders Map
// Combines the former "PSW Coverage Map" and "Live Map" into a single admin view.
// Features:
//  - City selector (snap-to-city) with a curated Ontario city list + free-text search
//  - Approved PSWs + open / pending / assigned / active / unserved / completed orders on one map
//  - Per-layer filters (PSWs, each order bucket, radius circles, vehicle-required, language-required)
//  - Per-PSW radius toggle (preserves existing dispatch radius logic via useActiveServiceRadius)
//  - Clickable markers with full admin details + actions:
//      - Order popup: copy booking code, manually assign an approved PSW
//      - PSW popup: copy email, view radius
//  - City supply/demand summary panel (PSWs in city, available, open/unserved/active orders, coverage gap)
//
// Admin-only view — full contact details are intentionally exposed (PII protection rule: admin
// sees all contact; clients/PSWs see masked data only outside this surface).

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin,
  RefreshCw,
  Target,
  Loader2,
  Car,
  Languages as LanguagesIcon,
  AlertTriangle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCoordinatesFromPostalCode } from "@/lib/postalCodeUtils";
import { SEO_CITIES } from "@/lib/seoCityData";
import { useActiveServiceRadius } from "@/hooks/useActiveServiceRadius";
import {
  MIN_SERVICE_RADIUS_KM,
  MAX_SERVICE_RADIUS_KM,
  RADIUS_INCREMENT_KM,
} from "@/lib/serviceRadiusStore";
import { useAdminMapProvider, type AdminMapProvider } from "@/hooks/useAdminMapProvider";
import { LeafletAdminMap } from "./map/LeafletAdminMap";
import { GoogleAdminMap } from "./map/GoogleAdminMap";
import type { OrderBucket, OrderRow, PSWRow } from "./map/types";

// --- City presets ---------------------------------------------------------
// All Ontario cities/towns/villages — sourced from SEO_CITIES so the coverage
// map automatically gains snap-to-city support for every locality we publish
// content for. Province-wide stays pinned at the top.
interface CityPreset {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}
const CITY_PRESETS: CityPreset[] = [
  { name: "All / Province-wide", lat: 44.4, lng: -79.5, zoom: 7 },
  ...[...SEO_CITIES]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((c) => ({ name: c.label, lat: c.lat, lng: c.lng, zoom: 12 })),
];

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

const normalizeMapCityName = (value?: string | null) =>
  (value || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const CITY_CENTER_BY_NAME = new Map(
  SEO_CITIES.map((city) => [normalizeMapCityName(city.label), { lat: city.lat, lng: city.lng }])
);

const CITY_COORDINATE_MISMATCH_KM = 35;

const resolvePSWMapCoords = (row: {
  home_city?: string | null;
  home_postal_code?: string | null;
  home_lat?: number | string | null;
  home_lng?: number | string | null;
}): { coords: { lat: number; lng: number }; source: PSWRow["mapSource"]; warning?: string } | null => {
  const lat = Number(row.home_lat);
  const lng = Number(row.home_lng);
  const storedCoords =
    row.home_lat != null &&
    row.home_lng != null &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat !== 0 &&
    lng !== 0
      ? { lat, lng }
      : null;

  const postalCoords = getCoordinatesFromPostalCode(row.home_postal_code || "");
  const normalizedHomeCity = normalizeMapCityName(row.home_city);
  const cityCoords = normalizedHomeCity ? CITY_CENTER_BY_NAME.get(normalizedHomeCity) : undefined;
  if (postalCoords && cityCoords) {
    const kmFromDeclaredCity = haversineKm(postalCoords, cityCoords);
    if (kmFromDeclaredCity <= CITY_COORDINATE_MISMATCH_KM) {
      // Prefer postal/FSA coordinates when they align with the declared city.
      // This keeps stale stored coordinates (for example older Collingwood L9Y rows)
      // from placing PSWs outside the visible city viewport.
      return { coords: postalCoords, source: "postal" };
    }
  }

  if (storedCoords && cityCoords) {
    const kmFromDeclaredCity = haversineKm(storedCoords, cityCoords);
    if (kmFromDeclaredCity <= CITY_COORDINATE_MISMATCH_KM) {
      return { coords: storedCoords, source: "stored" };
    }
  }

  if (cityCoords) {
    return {
      coords: cityCoords,
      source: "city",
      warning: "Mapped by city because stored/postal coordinates do not match the city.",
    };
  }

  if (storedCoords) return { coords: storedCoords, source: "stored" };
  if (postalCoords) return { coords: postalCoords, source: "postal" };
  return null;
};

// =========================================================================


export const UnifiedAdminMap = () => {
  // City + viewport
  const [selectedCityName, setSelectedCityName] = useState<string>("All / Province-wide");
  const [searchText, setSearchText] = useState("");
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  const selectedCity = useMemo(
    () => CITY_PRESETS.find((c) => c.name === selectedCityName) ?? CITY_PRESETS[0],
    [selectedCityName]
  );

  // Filters
  const [showPSWs, setShowPSWs] = useState(true);
  const [showOpen, setShowOpen] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showAssigned, setShowAssigned] = useState(true);
  const [showInProgress, setShowInProgress] = useState(true);
  const [showUnserved, setShowUnserved] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showRadii, setShowRadii] = useState(false);
  const [filterVehicleRequired, setFilterVehicleRequired] = useState(false);
  const [filterLanguageRequired, setFilterLanguageRequired] = useState<string>("any");
  const [visibleRadii, setVisibleRadii] = useState<Set<string>>(new Set());

  // Radius slider (preserves existing active service radius)
  const {
    radius: activeServiceRadius,
    isLoading: radiusLoading,
    isSaving: radiusSaving,
    setActiveRadius,
  } = useActiveServiceRadius();
  const [radiusDraft, setRadiusDraft] = useState(activeServiceRadius);
  const saveDebounceRef = useRef<number | null>(null);
  useEffect(() => setRadiusDraft(activeServiceRadius), [activeServiceRadius]);
  const onRadiusChange = (v: number[]) => {
    setRadiusDraft(v[0]);
    if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = window.setTimeout(async () => {
      const ok = await setActiveRadius(v[0]);
      if (ok) toast.success(`Dispatch radius updated to ${v[0]}km`);
      else toast.error("Couldn't save radius");
    }, 350);
  };
  useEffect(
    () => () => {
      if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    },
    []
  );

  // Data
  const [psws, setPSWs] = useState<PSWRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual-assign dialog state
  const [assignOrder, setAssignOrder] = useState<OrderRow | null>(null);
  const [assignPswId, setAssignPswId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  // --- Loaders ----------------------------------------------------------
  const loadPSWs = useCallback(async () => {
    const { data, error } = await supabase
      .from("psw_profiles")
      .select(
        "id, first_name, last_name, email, phone, home_city, home_postal_code, home_lat, home_lng, languages, has_own_transport, gender, vetting_status, is_test"
      )
      .eq("vetting_status", "approved")
      .eq("is_test", false);
    if (error) {
      console.error("[UnifiedAdminMap] PSW load error", error);
      return;
    }
    const rows: PSWRow[] = (data || [])
      .map((r: any): PSWRow | null => {
        const resolved = resolvePSWMapCoords(r);
        if (!resolved) return null;
        return {
          id: r.id,
          firstName: r.first_name || "",
          lastName: r.last_name || "",
          email: r.email,
          phone: r.phone || "",
          city: r.home_city || "Unknown",
          postalCode: r.home_postal_code || "",
          languages: r.languages || [],
          hasVehicle: r.has_own_transport === "yes-car",
          gender: r.gender || null,
          status: "available",
          coords: resolved.coords,
          mapSource: resolved.source,
          mapWarning: resolved.warning,
        };
      })
      .filter((p): p is PSWRow => p !== null);
    setPSWs(rows);
  }, []);

  const loadOrders = useCallback(async () => {
    // Coverage Map = LIVE OPS MAP. Server-side allow-list so historical/cancelled/archived
    // records can never reach the client, regardless of cache state.
    const ALLOWED_STATUSES = ["pending", "active", "in-progress", "unserved"];
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_code, client_name, client_phone, patient_name, service_type, scheduled_date, start_time, end_time, patient_address, patient_postal_code, client_postal_code, service_latitude, service_longitude, preferred_languages, psw_assigned, psw_first_name, status, payment_status, is_transport_booking, created_at"
      )
      .in("status", ALLOWED_STATUSES)
      .order("scheduled_date", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[UnifiedAdminMap] Orders load error", error);
      return;
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const rawCount = (data || []).length;
    const rows: OrderRow[] = (data || [])
      .map((b: any): OrderRow | null => {
        const status = (b.status || "").toLowerCase();

        // Defensive: re-check allow-list client-side
        if (!ALLOWED_STATUSES.includes(status)) return null;

        // Exclude shifts whose end time is in the past UNLESS the shift is
        // actively in-progress (PSW clocked in & still working).
        if (b.scheduled_date) {
          const endStr = b.end_time || b.start_time || "23:59";
          const endAt = new Date(`${b.scheduled_date}T${endStr}`).getTime();
          if (!isNaN(endAt) && endAt < now && status !== "in-progress") {
            return null;
          }
        }

        // Exclude stale records >24h old that are not actively in-progress
        // and whose scheduled start is already past (never filled, no longer actionable).
        if (b.created_at) {
          const createdAt = new Date(b.created_at).getTime();
          if (!isNaN(createdAt) && now - createdAt > DAY_MS && status !== "in-progress") {
            const startAt = b.scheduled_date
              ? new Date(`${b.scheduled_date}T${b.start_time || "23:59"}`).getTime()
              : 0;
            if (!isNaN(startAt) && startAt < now) return null;
          }
        }

        let coords: { lat: number; lng: number } | undefined;
        const lat = Number(b.service_latitude);
        const lng = Number(b.service_longitude);
        if (b.service_latitude != null && b.service_longitude != null && !isNaN(lat) && lat !== 0) {
          coords = { lat, lng };
        } else {
          const fsa = getCoordinatesFromPostalCode(b.patient_postal_code || b.client_postal_code || "");
          if (fsa) coords = fsa;
        }
        if (!coords) return null;

        let bucket: OrderBucket;
        if (status === "unserved") bucket = "unserved";
        else if (status === "in-progress") bucket = "in_progress";
        else if (status === "active" || b.psw_assigned) bucket = "assigned";
        else if (status === "pending" && b.payment_status !== "paid") bucket = "pending";
        else bucket = "open";

        const addr: string = b.patient_address || "";
        const parts = addr.split(",").map((s) => s.trim());
        const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "Unknown";

        return {
          id: b.id,
          bookingCode: b.booking_code,
          clientName: b.client_name || "Client",
          clientPhone: b.client_phone || null,
          patientName: b.patient_name || "",
          serviceType: b.service_type || [],
          scheduledDate: b.scheduled_date,
          startTime: b.start_time,
          endTime: b.end_time,
          city,
          postalCode: b.patient_postal_code || b.client_postal_code,
          preferredLanguages: b.preferred_languages || [],
          requiresVehicle: !!b.is_transport_booking,
          pswAssigned: b.psw_assigned,
          pswFirstName: b.psw_first_name,
          pswPhone: null,
          bucket,
          coords,
        };
      })
      .filter((o): o is OrderRow => o !== null);

    console.log(
      `[UnifiedAdminMap] Coverage filter: ${rawCount} fetched -> ${rows.length} visible markers`
    );



    // Mark PSWs that are on an active/assigned shift and enrich orders with PSW phone
    let pswPhoneMap = new Map<string, string>();
    setPSWs((prev) => {
      pswPhoneMap = new Map(prev.map((p) => [p.id, p.phone]));
      const onShiftIds = new Set(
        rows
          .filter((o) => (o.bucket === "in_progress" || o.bucket === "assigned") && o.pswAssigned)
          .map((o) => o.pswAssigned!)
      );
      return prev.map((p) => ({
        ...p,
        status: onShiftIds.has(p.id) ? "on_shift" : "available",
      }));
    });
    const enriched = rows.map((o) => ({
      ...o,
      pswPhone: o.pswAssigned ? pswPhoneMap.get(o.pswAssigned) || null : null,
    }));
    setOrders(enriched);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([loadPSWs(), loadOrders()]);
      setIsLoading(false);
    })();
  }, [loadPSWs, loadOrders]);

  const refresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadPSWs(), loadOrders()]);
    setIsRefreshing(false);
    toast.success("Map refreshed");
  };

  // --- City filtering ----------------------------------------------------
  const isAllCities = selectedCity.name === "All / Province-wide";
  // Radius (km) we consider "in/near the selected city"
  const CITY_RADIUS_KM = 30;

  const inSelectedCity = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (isAllCities) return true;
      return haversineKm(coords, { lat: selectedCity.lat, lng: selectedCity.lng }) <= CITY_RADIUS_KM;
    },
    [isAllCities, selectedCity]
  );

  // --- Visible markers ---------------------------------------------------
  const visiblePSWs = useMemo(() => {
    if (!showPSWs) return [];
    return psws.filter((p) => {
      if (!inSelectedCity(p.coords)) return false;
      if (filterVehicleRequired && !p.hasVehicle) return false;
      if (filterLanguageRequired !== "any" && !p.languages.includes(filterLanguageRequired)) return false;
      return true;
    });
  }, [psws, showPSWs, inSelectedCity, filterVehicleRequired, filterLanguageRequired]);

  const visibleOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!inSelectedCity(o.coords)) return false;
      if (o.bucket === "open" && !showOpen) return false;
      if (o.bucket === "pending" && !showPending) return false;
      if (o.bucket === "assigned" && !showAssigned) return false;
      if (o.bucket === "in_progress" && !showInProgress) return false;
      if (o.bucket === "unserved" && !showUnserved) return false;
      if (o.bucket === "completed" && !showCompleted) return false;
      if (filterVehicleRequired && !o.requiresVehicle) return false;
      if (
        filterLanguageRequired !== "any" &&
        o.preferredLanguages.length > 0 &&
        !o.preferredLanguages.includes(filterLanguageRequired)
      )
        return false;
      return true;
    });
  }, [
    orders,
    inSelectedCity,
    showOpen,
    showPending,
    showAssigned,
    showInProgress,
    showUnserved,
    showCompleted,
    filterVehicleRequired,
    filterLanguageRequired,
  ]);

  // --- City summary ------------------------------------------------------
  const summary = useMemo(() => {
    const inCityPSWs = psws.filter((p) => inSelectedCity(p.coords));
    const inCityOrders = orders.filter((o) => inSelectedCity(o.coords));
    return {
      approvedPSWs: inCityPSWs.length,
      availablePSWs: inCityPSWs.filter((p) => p.status === "available").length,
      onShiftPSWs: inCityPSWs.filter((p) => p.status === "on_shift").length,
      openOrders: inCityOrders.filter((o) => o.bucket === "open" || o.bucket === "pending").length,
      unservedOrders: inCityOrders.filter((o) => o.bucket === "unserved").length,
      inProgressOrders: inCityOrders.filter((o) => o.bucket === "in_progress").length,
      assignedOrders: inCityOrders.filter((o) => o.bucket === "assigned").length,
      coverageGap: inCityPSWs.length === 0 && inCityOrders.length > 0,
    };
  }, [psws, orders, inSelectedCity]);

  // --- City selection / search ------------------------------------------
  useEffect(() => {
    setFlyTarget({ lat: selectedCity.lat, lng: selectedCity.lng, zoom: selectedCity.zoom });
  }, [selectedCity]);

  const handleCitySearch = () => {
    const q = searchText.trim().toLowerCase();
    if (!q) return;
    const found = CITY_PRESETS.find((c) => c.name.toLowerCase().includes(q));
    if (found) {
      setSelectedCityName(found.name);
      toast.success(`Showing ${found.name}`);
    } else {
      toast.error(`City "${searchText}" is not in the preset list — use the dropdown above`);
    }
  };

  const toggleRadius = (id: string) =>
    setVisibleRadii((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    toast.success(`${label} copied`);
  };

  // --- Manual assignment -------------------------------------------------
  const openAssignDialog = (order: OrderRow) => {
    setAssignOrder(order);
    setAssignPswId("");
  };
  const submitAssign = async () => {
    if (!assignOrder || !assignPswId) return;
    const psw = psws.find((p) => p.id === assignPswId);
    if (!psw) return;
    setIsAssigning(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        psw_assigned: psw.id,
        psw_first_name: psw.firstName,
        status: assignOrder.bucket === "unserved" ? "assigned" : "assigned",
      })
      .eq("id", assignOrder.id);
    setIsAssigning(false);
    if (error) {
      console.error("[UnifiedAdminMap] assign error", error);
      toast.error("Failed to assign PSW");
      return;
    }
    toast.success(`${psw.firstName} assigned to ${assignOrder.bookingCode}`);
    setAssignOrder(null);
    await loadOrders();
  };

  // --- Provider switch ---------------------------------------------------
  const { provider, isLoading: providerLoading, isSaving: providerSaving, setProvider } = useAdminMapProvider();
  const handleProviderChange = async (next: AdminMapProvider) => {
    const ok = await setProvider(next);
    if (ok) toast.success(`Admin map provider: ${next === "google" ? "Google Maps" : "Leaflet (OSM)"}`);
    else toast.error("Couldn't update map provider");
  };



  return (
    <div className="space-y-4">
      {/* City selector + search */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-primary" />
            Admin Coverage & Orders Map
          </CardTitle>
          <CardDescription>
            One map for PSW coverage, live shifts, open jobs, and city-level supply/demand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1 min-w-[220px]">
              <Label className="text-xs">City</Label>
              <Select value={selectedCityName} onValueChange={setSelectedCityName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {CITY_PRESETS.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <Label className="text-xs">Search city</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Hamilton"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
                />
                <Button variant="outline" size="icon" onClick={handleCitySearch}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col">
              <Label className="text-xs">Map provider (QA)</Label>
              <Select
                value={provider}
                onValueChange={(v) => handleProviderChange(v as AdminMapProvider)}
                disabled={providerLoading || providerSaving}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leaflet">Leaflet (OSM) — default</SelectItem>
                  <SelectItem value="google">Google Maps (QA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* City summary */}
      <Card className="shadow-card">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
            <SummaryCell label="Approved PSWs" value={summary.approvedPSWs} />
            <SummaryCell label="Available" value={summary.availablePSWs} accent="text-green-600" />
            <SummaryCell label="On Shift" value={summary.onShiftPSWs} accent="text-violet-600" />
            <SummaryCell label="Open Orders" value={summary.openOrders} accent="text-red-600" />
            <SummaryCell label="Unserved" value={summary.unservedOrders} accent="text-yellow-600" />
            <SummaryCell label="In Progress" value={summary.inProgressOrders} accent="text-purple-600" />
            <SummaryCell label="Assigned" value={summary.assignedOrders} accent="text-blue-600" />
          </div>
          {summary.coverageGap && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <AlertTriangle className="w-4 h-4" />
              Coverage gap: orders exist in {selectedCity.name} but no approved PSWs are nearby.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="py-4 space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <FilterToggle id="f-psws" checked={showPSWs} onChange={setShowPSWs} dot="bg-green-500" label="PSWs" />
            <FilterToggle id="f-open" checked={showOpen} onChange={setShowOpen} dot="bg-red-500" label="Open orders" />
            <FilterToggle id="f-pending" checked={showPending} onChange={setShowPending} dot="bg-orange-500" label="Pending payment" />
            <FilterToggle id="f-assigned" checked={showAssigned} onChange={setShowAssigned} dot="bg-blue-500" label="Assigned" />
            <FilterToggle id="f-inprogress" checked={showInProgress} onChange={setShowInProgress} dot="bg-purple-600" label="In progress" />
            <FilterToggle id="f-unserved" checked={showUnserved} onChange={setShowUnserved} dot="bg-yellow-500" label="Unserved" />
            <FilterToggle id="f-completed" checked={showCompleted} onChange={setShowCompleted} dot="bg-gray-400" label="Completed" />
            <FilterToggle id="f-radii" checked={showRadii} onChange={setShowRadii} dot="bg-green-200 border border-green-500" label="Radius circles" />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="f-vehicle"
                checked={filterVehicleRequired}
                onCheckedChange={setFilterVehicleRequired}
              />
              <Label htmlFor="f-vehicle" className="text-sm cursor-pointer flex items-center gap-1">
                <Car className="w-4 h-4" /> Vehicle required only
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <LanguagesIcon className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm">Language:</Label>
              <Select value={filterLanguageRequired} onValueChange={setFilterLanguageRequired}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="pa">Punjabi</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="tl">Tagalog</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active dispatch radius slider — preserved from coverage view */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-3">
              <Target className="w-4 h-4 text-primary shrink-0" />
              <Label className="text-sm shrink-0">Dispatch radius</Label>
              <div className="flex-1">
                {radiusLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Slider
                    value={[radiusDraft]}
                    min={MIN_SERVICE_RADIUS_KM}
                    max={MAX_SERVICE_RADIUS_KM}
                    step={RADIUS_INCREMENT_KM}
                    onValueChange={onRadiusChange}
                    disabled={radiusSaving}
                  />
                )}
              </div>
              <Badge variant="default" className="font-bold">
                {radiusSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : `${radiusDraft}km`}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The map */}
      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[560px] w-full relative">
            {isLoading && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/60">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <LeafletAdminMap
              center={selectedCity}
              flyTarget={flyTarget}
              psws={visiblePSWs}
              orders={visibleOrders}
              showRadii={showRadii}
              visibleRadii={visibleRadii}
              radiusKm={radiusDraft}
              onToggleRadius={toggleRadius}
              onCopy={copy}
              onAssign={openAssignDialog}
            />

          </div>
        </CardContent>
      </Card>

      {/* Manual assign dialog */}
      <Dialog open={!!assignOrder} onOpenChange={(open) => !open && setAssignOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually assign PSW</DialogTitle>
            <DialogDescription>
              {assignOrder && (
                <>
                  Assign an approved PSW to <span className="font-semibold">{assignOrder.bookingCode}</span> ·{" "}
                  {assignOrder.scheduledDate} {assignOrder.startTime}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Approved PSWs near {selectedCity.name}</Label>
            <Select value={assignPswId} onValueChange={setAssignPswId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a PSW" />
              </SelectTrigger>
              <SelectContent className="max-h-[260px]">
                {psws
                  .filter((p) => (assignOrder ? inSelectedCity(p.coords) : true))
                  .sort((a, b) =>
                    assignOrder
                      ? haversineKm(a.coords, assignOrder.coords) - haversineKm(b.coords, assignOrder.coords)
                      : 0
                  )
                  .slice(0, 50)
                  .map((p) => {
                    const dist = assignOrder ? haversineKm(p.coords, assignOrder.coords) : 0;
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} · {p.city} · {dist.toFixed(1)}km
                        {p.hasVehicle ? " · 🚗" : ""}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOrder(null)} disabled={isAssigning}>
              Cancel
            </Button>
            <Button onClick={submitAssign} disabled={!assignPswId || isAssigning}>
              {isAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --- Small presentational helpers ----------------------------------------
const SummaryCell = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) => (
  <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
    <div className={`text-lg font-bold ${accent ?? "text-foreground"}`}>{value}</div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);

const FilterToggle = ({
  id,
  checked,
  onChange,
  label,
  dot,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  dot: string;
}) => (
  <div className="flex items-center gap-2">
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
    <Label htmlFor={id} className="text-sm cursor-pointer flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${dot}`} />
      {label}
    </Label>
  </div>
);

export default UnifiedAdminMap;

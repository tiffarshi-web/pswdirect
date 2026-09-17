// Admin dispatch map — one order, its matching radius, and every caregiver
// candidate with distance, location age and the exact exclusion reason.
// Caregiver positions are visible to administrators only; caregivers never see
// each other's locations.

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, pinIcon } from "@/components/maps/GoogleMapCompat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_DISPATCH_RADIUS_KM,
  describeExclusion,
  formatLocationAge,
} from "@/lib/dispatchLocation";

interface OrderOption {
  id: string;
  booking_code: string | null;
  patient_address: string | null;
  scheduled_date: string | null;
  service_latitude: number | null;
  service_longitude: number | null;
}

interface Candidate {
  psw_id: string;
  psw_number: string | null;
  first_name: string | null;
  last_name: string | null;
  latitude: number | null;
  longitude: number | null;
  location_source: string | null;
  location_age_hours: number | null;
  location_is_fresh: boolean | null;
  distance_km: number | null;
  radius_km: number | null;
  is_eligible: boolean | null;
  exclusion_reason: string | null;
}

export const AdminDispatchMap = () => {
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setOrdersLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, patient_address, scheduled_date, service_latitude, service_longitude")
        .in("status", ["pending", "active"])
        .is("psw_assigned", null)
        .or("is_test_data.is.null,is_test_data.eq.false")
        .order("scheduled_date", { ascending: true })
        .limit(50);
      if (error) {
        console.error("[AdminDispatchMap] orders error", error);
        setOrdersError("Unable to load unassigned orders right now.");
      } else {
        setOrdersError(null);
      }
      const rows = (data || []) as OrderOption[];
      setOrders(rows);
      if (rows.length > 0) setSelectedId((prev) => prev || rows[0].id);
      setOrdersLoading(false);
    })();
  }, []);

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) || null, [orders, selectedId]);

  const loadCandidates = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_dispatch_candidates", {
        p_booking_id: selectedId,
      });
      if (error) {
        console.error("[AdminDispatchMap] candidates error", error);
        setCandidates([]);
        return;
      }
      setCandidates((data || []) as Candidate[]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const radiusKm = candidates.find((c) => c.radius_km)?.radius_km ?? DEFAULT_DISPATCH_RADIUS_KM;
  const eligible = candidates.filter((c) => c.is_eligible);
  const excluded = candidates.filter((c) => !c.is_eligible && c.exclusion_reason);

  const center: [number, number] = selected?.service_latitude && selected?.service_longitude
    ? [Number(selected.service_latitude), Number(selected.service_longitude)]
    : [43.65, -79.38];

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" /> Dispatch map
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {radiusKm} km matching radius, caregiver distance and why each caregiver was excluded.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCandidates} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose an unassigned order" />
          </SelectTrigger>
          <SelectContent>
            {orders.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.booking_code || o.id.slice(0, 8)} — {o.scheduled_date || "no date"} — {o.patient_address || "no address"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {ordersLoading ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Loading unassigned orders…
          </div>
        ) : ordersError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {ordersError}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            There are no unassigned orders right now, so there is nothing to map.
          </div>
        ) : !selected ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Choose an order above to see its matching radius and caregivers.
          </div>
        ) : !selected.service_latitude || !selected.service_longitude ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            This order has no confirmed map position, so it is held back from automatic dispatch and appears in the
            address review queue.
          </div>
        ) : (
          <MapContainer center={center} zoom={9} className="h-[420px] w-full overflow-hidden rounded-lg">
            <TileLayer />
            <Circle
              center={center}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.06, weight: 2 }}
            />
            <Marker position={center} icon={pinIcon("green")}>
              <Popup>
                <div className="text-xs">
                  <strong>{selected.booking_code || "Order"}</strong>
                  <div>{selected.patient_address}</div>
                  <div>{selected.scheduled_date}</div>
                </div>
              </Popup>
            </Marker>
            {eligible
              .filter((c) => c.latitude != null && c.longitude != null)
              .map((c) => (
                <Marker
                  key={c.psw_id}
                  position={[Number(c.latitude), Number(c.longitude)]}
                  icon={pinIcon("orange")}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>
                        {c.first_name} {c.last_name} {c.psw_number ? `(PSW-${c.psw_number})` : ""}
                      </strong>
                      <div>{c.distance_km} km away</div>
                      <div>
                        Location {c.location_source === "device" ? "from phone" : "from home address"} ·{" "}
                        {formatLocationAge(c.location_age_hours)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        )}

        {selected && (
        <>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" /> Order location
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" /> Eligible caregiver
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-blue-600" /> {radiusKm} km radius
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-medium">Eligible ({eligible.length})</h4>
            <div className="space-y-1.5">
              {eligible.length === 0 && (
                <p className="text-sm text-muted-foreground">No caregiver currently matches this order.</p>
              )}
              {eligible.map((c) => (
                <div key={c.psw_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>
                    {c.first_name} {c.last_name}
                    {c.psw_number ? ` · PSW-${c.psw_number}` : ""}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {c.distance_km != null ? `${c.distance_km} km` : "—"}
                    <Badge variant={c.location_is_fresh ? "secondary" : "outline"}>
                      {formatLocationAge(c.location_age_hours)}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">Excluded ({excluded.length})</h4>
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {excluded.map((c) => (
                <div key={c.psw_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>
                    {c.first_name} {c.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {describeExclusion(c.exclusion_reason)}
                    {c.distance_km != null ? ` · ${c.distance_km} km` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminDispatchMap;

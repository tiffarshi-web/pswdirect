// Coverage map for caregivers: their home service area plus pins for open
// jobs they are eligible for and shifts they have already accepted.
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import { MapPin, RefreshCw, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  getEligibleAvailableShiftsAsync,
  getPSWShiftsAsync,
  type ShiftRecord,
} from "@/lib/shiftStore";
import { loadOwnAddress } from "@/lib/pswAddressStore";

type Pin = { shift: ShiftRecord; kind: "open" | "mine" };

const hasCoords = (s: ShiftRecord) =>
  typeof s.serviceLat === "number" && typeof s.serviceLng === "number";

export const PSWCoverageTab = () => {
  const { user } = useAuth();
  const [pins, setPins] = useState<Pin[]>([]);
  const [home, setHome] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [openResult, mine, address] = await Promise.all([
        getEligibleAvailableShiftsAsync(user.id),
        getPSWShiftsAsync(user.id),
        loadOwnAddress(),
      ]);

      if (openResult.radiusKm) setRadiusKm(openResult.radiusKm);

      if (address?.lat != null && address?.lng != null) {
        setHome({
          lat: Number(address.lat),
          lng: Number(address.lng),
          label: address.city || "Your area",
        });
      }

      const claimed = mine.filter(
        (s) => (s.status === "claimed" || s.status === "checked-in") && !s.signedOutAt,
      );

      setPins([
        ...openResult.shifts.filter(hasCoords).map((shift) => ({ shift, kind: "open" as const })),
        ...claimed.filter(hasCoords).map((shift) => ({ shift, kind: "mine" as const })),
      ]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const center = useMemo<[number, number]>(() => {
    if (home) return [home.lat, home.lng];
    const first = pins[0]?.shift;
    if (first) return [first.serviceLat as number, first.serviceLng as number];
    return [44.3894, -79.6903]; // Barrie, ON
  }, [home, pins]);

  const openCount = pins.filter((p) => p.kind === "open").length;
  const mineCount = pins.filter((p) => p.kind === "mine").length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Coverage Map</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Where your work is — open jobs and shifts you've accepted
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={load} aria-label="Refresh coverage map">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-primary/40 text-primary">
          {openCount} open job{openCount !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
          {mineCount} accepted
        </Badge>
        {radiusKm && <Badge variant="outline">{radiusKm} km service area</Badge>}
      </div>

      <Card className="shadow-card overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[420px] w-full">
            <MapContainer
              key={`${center[0]},${center[1]}`}
              center={center}
              zoom={home ? 10 : 8}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {home && radiusKm && (
                <Circle
                  center={[home.lat, home.lng]}
                  radius={radiusKm * 1000}
                  pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.08, weight: 1 }}
                />
              )}

              {pins.map(({ shift, kind }) => (
                <CircleMarker
                  key={`${kind}-${shift.id}`}
                  center={[shift.serviceLat as number, shift.serviceLng as number]}
                  radius={9}
                  pathOptions={{
                    color: kind === "mine" ? "#059669" : "#2563eb",
                    fillColor: kind === "mine" ? "#059669" : "#2563eb",
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">
                        {kind === "mine" ? "Your shift" : "Open job"}
                      </p>
                      <p>{shift.scheduledDate} · {shift.scheduledStart}–{shift.scheduledEnd}</p>
                      <p className="text-muted-foreground">{shift.patientAddress}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {!loading && pins.length === 0 && (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Nothing to show on the map yet. Open jobs and accepted shifts will appear here.
          </p>
        </div>
      )}
    </div>
  );
};

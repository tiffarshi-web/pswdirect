import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AlertTriangle, MapPin, Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/lib/geocodingUtils";
import { getCoordinatesFromPostalCode } from "@/lib/postalCodeUtils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PSWRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  home_postal_code: string | null;
  home_city: string | null;
  home_lat: number | null;
  home_lng: number | null;
  vetting_status: string | null;
}

interface DiagnosticStats {
  totalApproved: number;
  totalPending: number;
  approvedMissingCoords: number;
  pendingMissingCoords: number;
  missingRows: PSWRow[];
}

const isMissingCoords = (row: PSWRow) =>
  row.home_lat === null || row.home_lng === null || row.home_lat === 0 || row.home_lng === 0;

export const PSWCoverageDiagnostics = () => {
  const [stats, setStats] = useState<DiagnosticStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<{ updated: number; skipped: number; failed: number } | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("id, first_name, last_name, email, home_postal_code, home_city, home_lat, home_lng, vetting_status")
        .in("vetting_status", ["approved", "pending"])
        .eq("is_test", false)
        .order("first_name");

      if (error) throw error;

      const rows = (data || []) as PSWRow[];
      const approved = rows.filter((r) => r.vetting_status === "approved");
      const pending = rows.filter((r) => r.vetting_status === "pending");

      setStats({
        totalApproved: approved.length,
        totalPending: pending.length,
        approvedMissingCoords: approved.filter(isMissingCoords).length,
        pendingMissingCoords: pending.filter(isMissingCoords).length,
        missingRows: rows.filter(isMissingCoords),
      });
    } catch (err: any) {
      console.error("Diagnostics load error:", err);
      toast.error("Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleGeocode = async () => {
    if (!stats || stats.missingRows.length === 0) return;

    setGeocoding(true);
    setGeocodeResult(null);
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of stats.missingRows) {
      if (!row.home_postal_code && !row.home_city) {
        skipped++;
        continue;
      }

      try {
        let lat: number | null = null;
        let lng: number | null = null;

        // Try local FSA lookup first (instant, no API needed)
        if (row.home_postal_code) {
          const localCoords = getCoordinatesFromPostalCode(row.home_postal_code);
          if (localCoords) {
            lat = localCoords.lat;
            lng = localCoords.lng;
          }
        }

        // Fallback to Nominatim if local lookup failed
        if (lat === null || lng === null) {
          const searchStr = [row.home_postal_code, row.home_city, "Ontario", "Canada"]
            .filter(Boolean)
            .join(", ");
          await new Promise((r) => setTimeout(r, 1100));
          const result = await geocodeAddress(searchStr);
          if (result) {
            lat = result.lat;
            lng = result.lng;
          }
        }

        if (lat === null || lng === null) {
          failed++;
          continue;
        }

        const { error } = await supabase
          .from("psw_profiles")
          .update({ home_lat: lat, home_lng: lng })
          .eq("id", row.id);

        if (error) {
          console.error("Update error for", row.id, error);
          failed++;
        } else {
          updated++;
        }
      } catch (err) {
        console.error("Geocode error for", row.id, err);
        failed++;
      }
    }

    setGeocodeResult({ updated, skipped, failed });
    setGeocoding(false);

    if (updated > 0) {
      toast.success(`Geocoded ${updated} PSW(s). Refresh the map to see changes.`);
    }
    // Reload stats
    await loadStats();
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading diagnostics…
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const totalMissing = stats.approvedMissingCoords + stats.pendingMissingCoords;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <Card className="shadow-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-primary" />
            Coverage Map Diagnostics
          </CardTitle>
          <CardDescription>
            The map plots PSWs using <code className="text-xs bg-muted px-1 rounded">home_lat</code> / <code className="text-xs bg-muted px-1 rounded">home_lng</code> from psw_profiles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-green-500/10 border border-green-200 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.totalApproved}</p>
              <p className="text-xs text-muted-foreground">Approved Total</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-200 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{stats.totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending Total</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${stats.approvedMissingCoords > 0 ? "bg-destructive/10 border border-destructive/30" : "bg-muted border"}`}>
              <p className="text-2xl font-bold">{stats.approvedMissingCoords}</p>
              <p className="text-xs text-muted-foreground">Approved Missing Coords</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${stats.pendingMissingCoords > 0 ? "bg-destructive/10 border border-destructive/30" : "bg-muted border"}`}>
              <p className="text-2xl font-bold">{stats.pendingMissingCoords}</p>
              <p className="text-xs text-muted-foreground">Pending Missing Coords</p>
            </div>
          </div>

          {/* Geocode button */}
          {totalMissing > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" disabled={geocoding}>
                    {geocoding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Geocoding…
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        Geocode {totalMissing} Missing PSW Coordinates
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Geocode Missing Coordinates</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will use each PSW's postal code / city to look up lat/lng via OpenStreetMap.
                      Only rows with missing or zero coordinates will be updated. Existing lat/lng values are never overwritten.
                      This may take ~{totalMissing} seconds due to rate limiting.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGeocode}>Run Geocode</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}

          {totalMissing === 0 && (
            <div className="mt-4 flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">All PSWs have coordinates — map is complete.</span>
            </div>
          )}

          {/* Geocode results */}
          {geocodeResult && (
            <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
              <p><strong>Results:</strong> {geocodeResult.updated} updated, {geocodeResult.skipped} skipped (no postal/city), {geocodeResult.failed} failed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing PSW Table */}
      {totalMissing > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              PSWs Missing Lat/Lng ({totalMissing})
            </CardTitle>
            <CardDescription>These PSWs will not appear on the coverage map.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Postal Code</TableHead>
                  <TableHead>Lat/Lng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.missingRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.first_name} {row.last_name}</TableCell>
                    <TableCell>
                      <Badge variant={row.vetting_status === "approved" ? "default" : "outline"} className="text-xs">
                        {row.vetting_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.home_city || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.home_postal_code || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {row.home_lat ?? "null"}, {row.home_lng ?? "null"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

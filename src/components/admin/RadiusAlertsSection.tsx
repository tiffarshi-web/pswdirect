import { useState, useEffect } from "react";
import { MapPin, AlertCircle, Clock, User, Trash2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveServiceRadius } from "@/hooks/useActiveServiceRadius";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface RadiusAlert {
  id: string;
  client_name: string | null;
  client_email: string | null;
  city: string | null;
  postal_code_raw: string | null;
  distance_km: number | null;
  created_at: string;
  status: string;
  reason: string;
}

export const RadiusAlertsSection = () => {
  const [alerts, setAlerts] = useState<RadiusAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { radius: activeServiceRadius, isLoading: isRadiusLoading } = useActiveServiceRadius();

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("unserved_orders")
        .select("id, client_name, client_email, city, postal_code_raw, distance_km, created_at, status, reason")
        .eq("reason", "OUTSIDE_RADIUS")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setAlerts(data);
      }
      setLoading(false);
    };
    loadAlerts();
  }, []);

  const dismissAlert = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  const clearDismissed = () => {
    setAlerts(prev => prev.filter(a => !dismissed.has(a.id)));
    setDismissed(new Set());
  };

  const activeAlerts = alerts.filter(a => !dismissed.has(a.id));
  const dismissedAlerts = alerts.filter(a => dismissed.has(a.id));

  const formatDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "MMM d, HH:mm");
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-6">
      {/* Service Area Info */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Active Service Radius: {isRadiusLoading ? "..." : `${activeServiceRadius} km`}
                </p>
                <p className="text-sm text-muted-foreground">PSW-based coverage zone</p>
              </div>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Out-of-Radius Booking Attempts
              </CardTitle>
              <CardDescription>
                Clients who tried to book from outside the {activeServiceRadius}km service zone
              </CardDescription>
            </div>
            {activeAlerts.length > 0 && (
              <Badge variant="destructive">{activeAlerts.length} Total</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeAlerts.length > 0 ? (
            activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{alert.client_name || "Unknown"}</span>
                    {alert.client_email && (
                      <span className="text-sm text-muted-foreground">({alert.client_email})</span>
                    )}
                  </div>
                  {alert.distance_km != null && (
                    <Badge className="bg-red-500/10 text-red-600 border-red-300">
                      {Math.round(alert.distance_km)} km away
                    </Badge>
                  )}
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    {[alert.city, alert.postal_code_raw].filter(Boolean).join(", ") || "Unknown location"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(alert.created_at)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAlert(alert.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No out-of-radius attempts recorded</p>
              <p className="text-sm text-muted-foreground mt-1">
                All recent booking attempts are within the {activeServiceRadius}km service area
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dismissed Alerts */}
      {dismissedAlerts.length > 0 && (
        <Card className="shadow-card bg-muted/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-muted-foreground">
                Dismissed Alerts ({dismissedAlerts.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDismissed}
                className="text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {dismissedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 bg-muted/50 rounded-lg flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{alert.client_name || "Unknown"}</span>
                  {alert.distance_km != null && (
                    <span className="text-xs text-muted-foreground">• {Math.round(alert.distance_km)}km</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(alert.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Geofence Info */}
      <Card className="shadow-card bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            <strong className="text-foreground">Blocked Message:</strong> Clients outside the service area see: 
            <em className="block mt-1">"We are currently expanding! We haven't reached your area yet, but check back soon."</em>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

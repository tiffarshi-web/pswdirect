import { useState } from "react";
import { MapPin, AlertCircle, Clock, User, Trash2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SERVICE_RADIUS_KM, OFFICE_LOCATION } from "@/lib/businessConfig";

interface RadiusAlert {
  id: string;
  clientName: string;
  clientEmail: string;
  attemptedAddress: string;
  distanceKm: number;
  timestamp: string;
  dismissed: boolean;
}

// Mock radius alerts
const mockAlerts: RadiusAlert[] = [
  {
    id: "RA001",
    clientName: "John Peterson",
    clientEmail: "j.peterson@email.com",
    attemptedAddress: "456 Cottage Road, Peterborough, ON K9H 2M1",
    distanceKm: 112,
    timestamp: "2025-01-13T14:32:00",
    dismissed: false,
  },
  {
    id: "RA002",
    clientName: "Linda Hayes",
    clientEmail: "linda.h@email.com",
    attemptedAddress: "789 Lake Street, Barrie, ON L4N 3T5",
    distanceKm: 89,
    timestamp: "2025-01-12T09:15:00",
    dismissed: false,
  },
  {
    id: "RA003",
    clientName: "Robert Clark",
    clientEmail: "r.clark@email.com",
    attemptedAddress: "123 River Road, Hamilton, ON L8P 4R2",
    distanceKm: 78,
    timestamp: "2025-01-11T16:45:00",
    dismissed: true,
  },
  {
    id: "RA004",
    clientName: "Susan Miller",
    clientEmail: "susan.m@email.com",
    attemptedAddress: "567 Highway Ave, London, ON N6A 1B5",
    distanceKm: 195,
    timestamp: "2025-01-10T11:20:00",
    dismissed: false,
  },
];

export const RadiusAlertsSection = () => {
  const [alerts, setAlerts] = useState<RadiusAlert[]>(mockAlerts);

  const dismissAlert = (id: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, dismissed: true } : a))
    );
  };

  const clearDismissed = () => {
    setAlerts(prev => prev.filter(a => !a.dismissed));
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const dismissedAlerts = alerts.filter(a => a.dismissed);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
                <p className="font-medium text-foreground">Service Radius: {SERVICE_RADIUS_KM} km</p>
                <p className="text-sm text-muted-foreground">From: {OFFICE_LOCATION.address}</p>
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
                Clients who tried to book from outside the {SERVICE_RADIUS_KM}km service zone
              </CardDescription>
            </div>
            {activeAlerts.length > 0 && (
              <Badge variant="destructive">{activeAlerts.length} New</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeAlerts.length > 0 ? (
            activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{alert.clientName}</span>
                    <span className="text-sm text-muted-foreground">({alert.clientEmail})</span>
                  </div>
                  <Badge className="bg-red-500/10 text-red-600 border-red-300">
                    {alert.distanceKm} km away
                  </Badge>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{alert.attemptedAddress}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(alert.timestamp)}
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
              <p className="text-muted-foreground">No new out-of-radius attempts</p>
              <p className="text-sm text-muted-foreground mt-1">
                All recent booking attempts are within the {SERVICE_RADIUS_KM}km service area
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
                  <span className="text-muted-foreground">{alert.clientName}</span>
                  <span className="text-xs text-muted-foreground">• {alert.distanceKm}km</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(alert.timestamp)}</span>
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
            <em className="block mt-1">"Address outside of 75km service radius."</em>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

import { useState } from "react";
import { User, MapPin, Clock, Phone, Activity, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatServiceType } from "@/lib/businessConfig";

interface ActiveCareSession {
  id: string;
  pswFirstName: string;
  serviceType: string;
  checkInTime: string;
  patientName: string;
  patientAddress: string;
  estimatedEndTime: string;
}

// Mock active care data
const mockActiveCare: ActiveCareSession[] = [
  {
    id: "AC001",
    pswFirstName: "Jennifer",
    serviceType: "personal-care",
    checkInTime: "09:15",
    patientName: "Margaret Thompson",
    patientAddress: "123 Maple Street, Toronto",
    estimatedEndTime: "13:00",
  },
];

interface ActiveCareSectionProps {
  clientName?: string;
}

export const ActiveCareSection = ({ clientName = "there" }: ActiveCareSectionProps) => {
  const [activeCare] = useState<ActiveCareSession[]>(mockActiveCare);

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (activeCare.length === 0) {
    return (
      <Card className="shadow-card border-dashed">
        <CardContent className="p-6 text-center">
          <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No Active Care</p>
          <p className="text-sm text-muted-foreground mt-1">
            No PSW is currently checked in at your location
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Activity className="w-4 h-4 text-emerald-500" />
        Active Care
      </h3>
      
      {activeCare.map((session) => (
        <Card key={session.id} className="shadow-card border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 space-y-3">
            {/* PSW Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-emerald-500">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700">
                    {session.pswFirstName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    {session.pswFirstName}
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Checked In
                    </Badge>
                  </p>
                  <p className="text-sm text-emerald-600 font-medium">
                    {formatServiceType(session.serviceType)}
                  </p>
                </div>
              </div>
            </div>

            {/* Session Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-medium text-foreground">In since {formatTime(session.checkInTime)}</span>
                  <p className="text-xs">Until ~{formatTime(session.estimatedEndTime)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{session.patientName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{session.patientAddress}</span>
            </div>

            {/* Privacy Notice */}
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded flex items-start gap-2">
              <Phone className="w-3 h-3 mt-0.5 shrink-0" />
              <span>For any concerns during the visit, please contact the office directly.</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

import { User, MapPin, Clock, Phone, Activity, CheckCircle2, Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatServiceType } from "@/lib/businessConfig";
import { Booking } from "@/hooks/useClientBookings";

interface ActiveCareSectionProps {
  clientName?: string;
  activeBookings?: Booking[];
}

export const ActiveCareSection = ({ clientName = "there", activeBookings = [] }: ActiveCareSectionProps) => {
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (activeBookings.length === 0) {
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
      
      {activeBookings.map((booking) => (
        <Card key={booking.id} className="shadow-card border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 space-y-3">
            {/* PSW Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-emerald-500">
                  {booking.psw_photo_url ? (
                    <AvatarImage 
                      src={booking.psw_photo_url} 
                      alt={booking.psw_first_name || "PSW"} 
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-emerald-100 text-emerald-700">
                    {booking.psw_first_name?.charAt(0) || "P"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    {booking.psw_first_name || "Your PSW"}
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {booking.status === "in-progress" ? "In Progress" : "Checked In"}
                    </Badge>
                  </p>
                  <p className="text-sm text-emerald-600 font-medium">
                    {formatServiceType(booking.service_type[0])}
                  </p>
                </div>
              </div>
            </div>

            {/* Session Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-medium text-foreground">
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </span>
                  <p className="text-xs">{booking.hours}h scheduled</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{booking.patient_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{booking.patient_address}</span>
            </div>

            {/* Vehicle Info for Transport Shifts */}
            {booking.is_transport_booking && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <Car className="w-4 h-4" />
                  <span>Transport Information</span>
                </div>
                {booking.pickup_address && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Pick-up:</span> {booking.pickup_address}
                  </p>
                )}
                {booking.dropoff_address && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Drop-off:</span> {booking.dropoff_address}
                  </p>
                )}
              </div>
            )}

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

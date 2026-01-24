import { Clock, CheckCircle2, Users, Calendar, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Booking } from "@/hooks/useClientBookings";

interface BookingStatusSectionProps {
  pendingBookings: Booking[];
  confirmedBookings: Booking[];
  inProgressBookings: Booking[];
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
  
  return date.toLocaleDateString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const BookingStatusSection = ({
  pendingBookings,
  confirmedBookings,
  inProgressBookings,
}: BookingStatusSectionProps) => {
  const hasAnyBookings = pendingBookings.length > 0 || confirmedBookings.length > 0 || inProgressBookings.length > 0;
  
  if (!hasAnyBookings) {
    return null;
  }

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Your Booking Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* In Progress Bookings */}
        {inProgressBookings.map((booking) => (
          <div 
            key={booking.id}
            className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-green-500">
                {booking.psw_photo_url ? (
                  <AvatarImage 
                    src={booking.psw_photo_url} 
                    alt={booking.psw_first_name || "Caregiver"} 
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 font-medium">
                  {booking.psw_first_name?.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">Care in Progress</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-green-700 dark:text-green-400">{booking.psw_first_name || "Caregiver"}</span> is with {booking.patient_name}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
              Active
            </Badge>
          </div>
        ))}

        {/* Confirmed Bookings (PSW assigned) */}
        {confirmedBookings.map((booking) => (
          <div 
            key={booking.id}
            className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-blue-500">
                {booking.psw_photo_url ? (
                  <AvatarImage 
                    src={booking.psw_photo_url} 
                    alt={booking.psw_first_name || "Caregiver"} 
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium">
                  {booking.psw_first_name?.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(booking.scheduled_date)} at {formatTime(booking.start_time)}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-blue-700 dark:text-blue-400">{booking.psw_first_name}</span> assigned
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700">
              Confirmed
            </Badge>
          </div>
        ))}

        {/* Pending Bookings (waiting for PSW) */}
        {pendingBookings.map((booking) => (
          <div 
            key={booking.id}
            className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(booking.scheduled_date)} at {formatTime(booking.start_time)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Finding a caregiver...
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700">
              Pending
            </Badge>
          </div>
        ))}

        {/* Quick summary */}
        {(pendingBookings.length > 0 || confirmedBookings.length > 0) && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              You'll receive an email when your caregiver is confirmed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
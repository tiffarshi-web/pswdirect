import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, X, Info, AlertCircle, CheckCircle2, User, Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { checkCancellationRefund, formatServiceType } from "@/lib/businessConfig";
import { cancelBooking } from "@/lib/bookingStore";
import { Booking } from "@/hooks/useClientBookings";
import { supabase } from "@/integrations/supabase/client";

interface UpcomingBookingsSectionProps {
  upcomingBookings?: Booking[];
  onRefetch?: () => void;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  } else if (dateStr === tomorrow.toISOString().split("T")[0]) {
    return "Tomorrow";
  }
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const UpcomingBookingsSection = ({ upcomingBookings = [], onRefetch }: UpcomingBookingsSectionProps) => {
  const [bookings, setBookings] = useState<Booking[]>(upcomingBookings);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellationResult, setCancellationResult] = useState<{ eligible: boolean; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setBookings(upcomingBookings);
  }, [upcomingBookings]);

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
    setCancellationResult(null);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;

    setIsProcessing(true);
    
    const result = checkCancellationRefund(
      selectedBooking.scheduled_date,
      selectedBooking.start_time,
      selectedBooking.is_asap
    );
    
    setCancellationResult(result);

    // If eligible for refund, call the process-refund edge function
    if (result.eligible) {
      const isDryRun = localStorage.getItem("stripe_dry_run") === "true";
      
      try {
        const { data, error } = await supabase.functions.invoke("process-refund", {
          body: {
            bookingCode: selectedBooking.booking_code,
            reason: "Client self-service cancellation (4+ hours notice)",
            processedBy: "client-self-service",
            isDryRun,
          }
        });
        
        if (error) {
          console.error("Refund processing error:", error);
          toast.error("Refund request submitted. Please contact support if not processed within 5 business days.");
        } else {
          console.log("Refund processed:", data);
          toast.success("Refund processed successfully!");
        }
      } catch (err) {
        console.error("Failed to process refund:", err);
      }
    }

    // Cancel the booking in database
    await cancelBooking(selectedBooking.id, result.eligible);
    
    // Remove from local state
    setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
    
    // Refresh parent data
    onRefetch?.();
    setIsProcessing(false);
  };

  const handleCloseResult = () => {
    setCancelDialogOpen(false);
    setSelectedBooking(null);
    setCancellationResult(null);
  };

  if (bookings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Upcoming Appointments
        </h3>
        
        {/* Refund Policy Link */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-primary text-xs h-auto p-1">
              <Info className="w-3.5 h-3.5 mr-1" />
              Refund Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancellation & Refund Policy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Full refund:</strong> Cancellations made 4+ hours before the scheduled start time.
              </p>
              <p>
                <strong className="text-foreground">No refunds:</strong> Cancellations within 4 hours of the appointment, or for ASAP/immediate service requests.
              </p>
              <p>
                Contact admin for special circumstances or manual reviews.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {bookings.map((booking) => {
        const isConfirmed = booking.status === "active" && booking.psw_assigned;
        const isPending = booking.status === "pending" || (booking.status === "active" && !booking.psw_assigned);
        
        return (
          <Card key={booking.id} className="shadow-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {booking.service_type.map(s => formatServiceType(s)).join(", ")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={isConfirmed 
                        ? "bg-primary/10 text-primary" 
                        : "bg-amber-100 text-amber-700"
                      }
                    >
                      {isConfirmed ? "Confirmed" : "Pending"}
                    </Badge>
                    {booking.is_asap && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        ASAP
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${booking.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.hours}h × ${booking.hourly_rate}/hr
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium text-foreground">{formatDate(booking.scheduled_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{booking.patient_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  {booking.psw_first_name ? (
                    <Avatar className="h-6 w-6">
                      {booking.psw_photo_url ? (
                        <AvatarImage 
                          src={booking.psw_photo_url} 
                          alt={booking.psw_first_name} 
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                        {booking.psw_first_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span>
                    Caregiver: <span className="font-medium text-foreground">
                      {booking.psw_first_name || "TBD"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Vehicle Info for Transport Bookings */}
              {booking.is_transport_booking && isConfirmed && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                    <Car className="w-4 h-4" />
                    <span>Transport Details</span>
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

              {booking.is_asap && (
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>ASAP bookings are non-refundable once confirmed.</span>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => handleCancelClick(booking)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Appointment
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {/* Cancellation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          {!cancellationResult ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Are you sure you want to cancel this appointment?</p>
                  {selectedBooking && (
                    <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                      <p className="font-medium text-foreground">
                        {selectedBooking.service_type.map(s => formatServiceType(s)).join(", ")}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDate(selectedBooking.scheduled_date)} • {formatTime(selectedBooking.start_time)}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Caregiver: {selectedBooking.psw_first_name || "TBD"}
                      </p>
                      {selectedBooking.is_asap && (
                        <p className="text-orange-600 font-medium mt-2">
                          ⚠️ This is an ASAP booking and is non-refundable.
                        </p>
                      )}
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleConfirmCancel}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Yes, Cancel
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : cancellationResult.eligible ? (
            <>
              <AlertDialogHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <AlertDialogTitle className="text-center">Cancellation Confirmed</AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  {cancellationResult.message}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:justify-center">
                <AlertDialogAction onClick={handleCloseResult}>
                  Done
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <AlertDialogTitle className="text-center">Non-Refundable Cancellation</AlertDialogTitle>
                <AlertDialogDescription className="text-center space-y-3">
                  <p>{cancellationResult.message}</p>
                  <a 
                    href="tel:+1234567890" 
                    className="inline-block text-primary underline font-medium"
                  >
                    Contact Office
                  </a>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:justify-center">
                <AlertDialogAction onClick={handleCloseResult}>
                  Understood
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

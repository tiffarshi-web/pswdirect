import { useState } from "react";
import { Calendar, Clock, MapPin, X, Info, AlertCircle, CheckCircle2, User, Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { checkCancellationRefund, formatServiceType } from "@/lib/businessConfig";

interface UpcomingBooking {
  id: string;
  serviceType: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: "pending" | "confirmed";
  hours: number;
  hourlyRate: number;
  isAsap: boolean;
  pswFirstName: string;
  patientName: string;
  isTransportBooking?: boolean;
  pswLicensePlate?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
}

// Mock upcoming bookings
const mockUpcomingBookings: UpcomingBooking[] = [
  {
    id: "UB001",
    serviceType: "personal-care",
    date: "2025-01-14",
    startTime: "09:00",
    endTime: "13:00",
    location: "123 Maple Street, Toronto",
    status: "confirmed",
    hours: 4,
    hourlyRate: 35,
    isAsap: false,
    pswFirstName: "Jennifer",
    patientName: "Margaret Thompson",
  },
  {
    id: "UB002",
    serviceType: "hospital-doctor",
    date: "2025-01-15",
    startTime: "14:00",
    endTime: "17:00",
    location: "Toronto General Hospital",
    status: "confirmed",
    hours: 3,
    hourlyRate: 40,
    isAsap: false,
    pswFirstName: "Amanda",
    patientName: "Margaret Thompson",
    isTransportBooking: true,
    pswLicensePlate: "CAKF 247",
    pickupAddress: "123 Maple Street, Toronto",
    dropoffAddress: "Toronto General Hospital",
  },
  {
    id: "UB003",
    serviceType: "medication",
    date: "2025-01-13",
    startTime: "16:00",
    endTime: "18:00",
    location: "123 Maple Street, Toronto",
    status: "pending",
    hours: 2,
    hourlyRate: 35,
    isAsap: true,
    pswFirstName: "TBD",
    patientName: "Margaret Thompson",
  },
];

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

export const UpcomingBookingsSection = () => {
  const [bookings, setBookings] = useState<UpcomingBooking[]>(mockUpcomingBookings);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<UpcomingBooking | null>(null);
  const [cancellationResult, setCancellationResult] = useState<{ eligible: boolean; message: string } | null>(null);

  const handleCancelClick = (booking: UpcomingBooking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
    setCancellationResult(null);
  };

  const handleConfirmCancel = () => {
    if (!selectedBooking) return;

    const result = checkCancellationRefund(
      selectedBooking.date,
      selectedBooking.startTime,
      selectedBooking.isAsap
    );
    
    setCancellationResult(result);

    setBookings(prev =>
      prev.filter(b => b.id !== selectedBooking.id)
    );
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
      
      {bookings.map((booking) => (
        <Card key={booking.id} className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{formatServiceType(booking.serviceType)}</p>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={booking.status === "confirmed" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-amber-100 text-amber-700"
                    }
                  >
                    {booking.status === "confirmed" ? "Confirmed" : "Pending"}
                  </Badge>
                  {booking.isAsap && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      ASAP
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  ${(booking.hours * booking.hourlyRate).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {booking.hours}h × ${booking.hourlyRate}/hr
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="font-medium text-foreground">{formatDate(booking.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{booking.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>
                  Caregiver: <span className="font-medium text-foreground">{booking.pswFirstName}</span>
                </span>
              </div>
            </div>

            {/* Vehicle Info for Transport Bookings */}
            {booking.isTransportBooking && booking.status === "confirmed" && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <Car className="w-4 h-4" />
                  <span>Transport Details</span>
                </div>
                {booking.pswLicensePlate ? (
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-mono font-semibold">
                    License Plate: {booking.pswLicensePlate}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Vehicle info will be provided by the caregiver
                  </p>
                )}
                {booking.pickupAddress && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Pick-up:</span> {booking.pickupAddress}
                  </p>
                )}
                {booking.dropoffAddress && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Drop-off:</span> {booking.dropoffAddress}
                  </p>
                )}
              </div>
            )}

            {booking.isAsap && (
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
      ))}

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
                      <p className="font-medium text-foreground">{formatServiceType(selectedBooking.serviceType)}</p>
                      <p className="text-muted-foreground">
                        {formatDate(selectedBooking.date)} • {formatTime(selectedBooking.startTime)}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Caregiver: {selectedBooking.pswFirstName}
                      </p>
                      {selectedBooking.isAsap && (
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

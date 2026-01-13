import { useState } from "react";
import { Plus, Calendar, Clock, MapPin, DollarSign, X, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ServiceRequestForm } from "./ServiceRequestForm";
import { checkCancellationRefund, getPricing, formatServiceType } from "@/lib/businessConfig";

interface Booking {
  id: string;
  serviceType: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  hours: number;
  hourlyRate: number;
  isAsap: boolean;
  // Ordering Client Info
  orderingClient: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  // Patient Info (may be same as ordering client)
  patient: {
    name: string;
    address: string;
  };
}

// Mock bookings data
const mockBookings: Booking[] = [
  {
    id: "1",
    serviceType: "personal-care",
    date: "2026-01-13", // Today
    startTime: "14:00",
    endTime: "18:00",
    location: "123 Maple Street, Toronto",
    status: "confirmed",
    hours: 4,
    hourlyRate: 35,
    isAsap: false,
    orderingClient: {
      name: "Sarah Thompson",
      address: "123 Maple Street, Toronto, ON M4B 1B3",
      phone: "(416) 555-1234",
      email: "sarah.thompson@email.com",
    },
    patient: {
      name: "Margaret Thompson",
      address: "123 Maple Street, Toronto, ON M4B 1B3",
    },
  },
  {
    id: "2",
    serviceType: "companionship",
    date: "2026-01-14", // Tomorrow
    startTime: "10:00",
    endTime: "14:00",
    location: "456 Oak Avenue, Toronto",
    status: "confirmed",
    hours: 4,
    hourlyRate: 32,
    isAsap: false,
    orderingClient: {
      name: "Michael Chen",
      address: "789 Business Plaza, Toronto, ON M5H 2N2",
      phone: "(416) 555-5678",
      email: "m.chen@email.com",
    },
    patient: {
      name: "Robert Chen",
      address: "456 Oak Avenue, Toronto, ON M4C 2K1",
    },
  },
  {
    id: "3",
    serviceType: "medication",
    date: "2026-01-13", // Today - ASAP booking
    startTime: "16:00",
    endTime: "18:00",
    location: "789 Pine Road, Mississauga",
    status: "pending",
    hours: 2,
    hourlyRate: 38,
    isAsap: true, // Immediate service - non-refundable
    orderingClient: {
      name: "Jennifer Williams",
      address: "789 Pine Road, Mississauga, ON L5B 1M2",
      phone: "(905) 555-9012",
      email: "j.williams@email.com",
    },
    patient: {
      name: "Dorothy Williams",
      address: "789 Pine Road, Mississauga, ON L5B 1M2",
    },
  },
  {
    id: "4",
    serviceType: "light-housekeeping",
    date: "2026-01-10",
    startTime: "11:00",
    endTime: "15:00",
    location: "321 Elm Street, Brampton",
    status: "completed",
    hours: 4,
    hourlyRate: 30,
    isAsap: false,
    orderingClient: {
      name: "David Miller",
      address: "321 Elm Street, Brampton, ON L6Y 1T3",
      phone: "(905) 555-3456",
      email: "david.miller@email.com",
    },
    patient: {
      name: "James Miller",
      address: "321 Elm Street, Brampton, ON L6Y 1T3",
    },
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getStatusBadge = (status: Booking["status"], isAsap: boolean) => {
  if (isAsap && (status === "pending" || status === "confirmed")) {
    return (
      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
        ASAP
      </Badge>
    );
  }
  switch (status) {
    case "confirmed":
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Confirmed</Badge>;
    case "pending":
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Pending</Badge>;
    case "completed":
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Completed</Badge>;
    case "cancelled":
      return <Badge variant="secondary" className="bg-red-100 text-red-700">Cancelled</Badge>;
    default:
      return null;
  }
};

export const BookingsTab = () => {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellationResult, setCancellationResult] = useState<{ eligible: boolean; message: string } | null>(null);

  if (showRequestForm) {
    return <ServiceRequestForm onBack={() => setShowRequestForm(false)} />;
  }

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
    setCancellationResult(null);
  };

  const handleConfirmCancel = () => {
    if (!selectedBooking) return;

    // Use the business logic engine to check refund eligibility
    const result = checkCancellationRefund(
      selectedBooking.date,
      selectedBooking.startTime,
      selectedBooking.isAsap
    );
    
    setCancellationResult(result);

    // Update booking status
    setBookings(prev =>
      prev.map(b =>
        b.id === selectedBooking.id ? { ...b, status: "cancelled" as const } : b
      )
    );
  };

  const handleCloseResult = () => {
    setCancelDialogOpen(false);
    setSelectedBooking(null);
    setCancellationResult(null);
  };

  const activeBookings = bookings.filter(b => b.status === "confirmed" || b.status === "pending");
  const pastBookings = bookings.filter(b => b.status === "completed" || b.status === "cancelled");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">My Bookings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your care services
          </p>
        </div>
        
        {/* Refund Policy Link */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-primary text-xs">
              <Info className="w-3.5 h-3.5 mr-1" />
              View Refund Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Refund Policy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Full refund</strong> for cancellations made 4+ hours in advance.
              </p>
              <p>
                <strong className="text-foreground">No refunds</strong> for immediate service requests (ASAP bookings) or late cancellations.
              </p>
              <p>
                Contact admin for manual reviews.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Request New Service Button */}
      <Button 
        variant="brand" 
        size="lg" 
        className="w-full h-14 text-base font-semibold shadow-card"
        onClick={() => setShowRequestForm(true)}
      >
        <Plus className="w-5 h-5 mr-2" />
        Request New Service
      </Button>

      {/* Pricing Note */}
      <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Prices are subject to final adjustment by admin based on service requirements.
        </p>
      </div>

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Upcoming Services
          </h3>
          
          {activeBookings.map((booking) => (
            <Card key={booking.id} className="shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{formatServiceType(booking.serviceType)}</p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(booking.status, booking.isAsap)}
                      {booking.isAsap && (
                        <span className="text-xs text-orange-600">(Non-refundable)</span>
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
                    <span>{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{booking.location}</span>
                  </div>
                </div>

                {/* Cancel Button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => handleCancelClick(booking)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Booking
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Past Services
          </h3>
          
          {pastBookings.map((booking) => (
            <Card key={booking.id} className="shadow-card opacity-75">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{formatServiceType(booking.serviceType)}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(booking.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        ${(booking.hours * booking.hourlyRate).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(booking.status, false)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancellation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          {!cancellationResult ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Are you sure you want to cancel this booking?</p>
                  {selectedBooking && (
                    <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                      <p className="font-medium text-foreground">{formatServiceType(selectedBooking.serviceType)}</p>
                      <p className="text-muted-foreground">
                        {formatDate(selectedBooking.date)} • {formatTime(selectedBooking.startTime)}
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
                <AlertDialogCancel>Keep Booking</AlertDialogCancel>
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

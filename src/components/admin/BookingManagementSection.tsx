import { useState, useEffect } from "react";
import { Calendar, User, MapPin, Phone, Mail, DollarSign, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatServiceType } from "@/lib/businessConfig";
import { getBookings, type BookingData } from "@/lib/bookingStore";
import { getLanguageName } from "@/lib/languageConfig";

interface OrderingClient {
  name: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
}

interface Patient {
  name: string;
  address: string;
  postalCode: string;
  relationship: string;
}

interface Booking {
  id: string;
  serviceType: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "active" | "completed" | "cancelled";
  hours: number;
  hourlyRate: number;
  total: number;
  isAsap: boolean;
  wasRefunded: boolean;
  orderingClient: OrderingClient;
  patient: Patient;
  pswAssigned: string;
}

// Mock bookings data for demo
const mockBookings: Booking[] = [
  {
    id: "BK001",
    serviceType: "personal-care",
    date: "2025-01-14",
    startTime: "09:00",
    endTime: "13:00",
    status: "active",
    hours: 4,
    hourlyRate: 35,
    total: 140,
    isAsap: false,
    wasRefunded: false,
    orderingClient: {
      name: "Sarah Johnson",
      address: "456 Oak Avenue, Belleville, ON",
      postalCode: "K8N 2B3",
      phone: "(613) 555-1234",
      email: "sarah.johnson@email.com",
    },
    patient: {
      name: "Margaret Johnson",
      address: "456 Oak Avenue, Belleville, ON",
      postalCode: "K8N 2B3",
      relationship: "Mother",
    },
    pswAssigned: "Jennifer M.",
  },
  {
    id: "BK002",
    serviceType: "companionship",
    date: "2025-01-13",
    startTime: "14:00",
    endTime: "17:00",
    status: "active",
    hours: 3,
    hourlyRate: 32,
    total: 120,
    isAsap: true,
    wasRefunded: false,
    orderingClient: {
      name: "Michael Chen",
      address: "789 Maple Street, Trenton, ON",
      postalCode: "K8V 3M2",
      phone: "(613) 555-5678",
      email: "m.chen@email.com",
    },
    patient: {
      name: "David Chen",
      address: "789 Maple Street, Trenton, ON",
      postalCode: "K8V 3M2",
      relationship: "Father",
    },
    pswAssigned: "Amanda L.",
  },
  {
    id: "BK003",
    serviceType: "meal-prep",
    date: "2025-01-10",
    startTime: "11:00",
    endTime: "14:00",
    status: "completed",
    hours: 3,
    hourlyRate: 30,
    total: 90,
    isAsap: false,
    wasRefunded: false,
    orderingClient: {
      name: "Emily Watson",
      address: "123 Pine Road, Napanee, ON",
      postalCode: "K7R 1H5",
      phone: "(613) 555-9012",
      email: "emily.w@email.com",
    },
    patient: {
      name: "Robert Watson",
      address: "123 Pine Road, Napanee, ON",
      postalCode: "K7R 1H5",
      relationship: "Husband",
    },
    pswAssigned: "Patricia K.",
  },
  {
    id: "BK004",
    serviceType: "respite",
    date: "2025-01-08",
    startTime: "09:00",
    endTime: "17:00",
    status: "cancelled",
    hours: 8,
    hourlyRate: 40,
    total: 320,
    isAsap: false,
    wasRefunded: true,
    orderingClient: {
      name: "James Williams",
      address: "567 Birch Lane, Picton, ON",
      postalCode: "K0K 2T0",
      phone: "(613) 555-3456",
      email: "j.williams@email.com",
    },
    patient: {
      name: "Helen Williams",
      address: "567 Birch Lane, Picton, ON",
      postalCode: "K0K 2T0",
      relationship: "Wife",
    },
    pswAssigned: "Unassigned",
  },
];

export const BookingManagementSection = () => {
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [newBookings, setNewBookings] = useState<BookingData[]>([]);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Load new bookings from store on mount and periodically
  useEffect(() => {
    const loadNewBookings = () => {
      const storedBookings = getBookings();
      setNewBookings(storedBookings);
    };
    
    loadNewBookings();
    // Refresh every 5 seconds to catch new bookings
    const interval = setInterval(loadNewBookings, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefund = (booking: Booking) => {
    setSelectedBooking(booking);
    setRefundDialogOpen(true);
  };

  const confirmRefund = () => {
    if (selectedBooking) {
      setBookings(prev =>
        prev.map(b =>
          b.id === selectedBooking.id
            ? { ...b, wasRefunded: true, status: "cancelled" as const }
            : b
        )
      );
      toast.success(`Manual refund processed for booking ${selectedBooking.id}`);
    }
    setRefundDialogOpen(false);
    setSelectedBooking(null);
  };

  const getStatusBadge = (status: string, wasRefunded: boolean) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Completed</Badge>;
      case "cancelled":
        return (
          <div className="flex gap-2">
            <Badge className="bg-red-500/10 text-red-600 border-red-200">Cancelled</Badge>
            {wasRefunded && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Refunded</Badge>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const filterBookings = (status: "active" | "completed" | "cancelled") =>
    bookings.filter((b) => b.status === status);

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card className="shadow-card">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{booking.id}</span>
              {booking.isAsap && (
                <Badge variant="destructive" className="text-xs">ASAP</Badge>
              )}
            </div>
            <p className="text-sm text-primary font-medium">
              {formatServiceType(booking.serviceType)}
            </p>
          </div>
          {getStatusBadge(booking.status, booking.wasRefunded)}
        </div>

        {/* Schedule */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{booking.date}</span>
          <Clock className="w-4 h-4 ml-2" />
          <span>{booking.startTime} - {booking.endTime}</span>
          <span className="ml-auto font-medium text-foreground">${booking.total}</span>
        </div>

        {/* Ordering Client Details */}
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Ordering Client (Payer)
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">{booking.orderingClient.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{booking.orderingClient.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Postal Code:</span>
              <Badge variant="outline" className="font-mono">{booking.orderingClient.postalCode}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span>{booking.orderingClient.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span>{booking.orderingClient.email}</span>
            </div>
          </div>
        </div>

        {/* Patient Details */}
        <div className="p-3 border border-border rounded-lg space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Patient Information
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">{booking.patient.name}</span>
              <Badge variant="outline" className="text-xs">{booking.patient.relationship}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{booking.patient.address}</span>
            </div>
          </div>
        </div>

        {/* PSW & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-sm">
            <span className="text-muted-foreground">PSW: </span>
            <span className="font-medium text-foreground">{booking.pswAssigned}</span>
          </div>
          
          {booking.status === "active" && !booking.wasRefunded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleManualRefund(booking)}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Manual Refund
            </Button>
          )}
          
          {booking.status === "cancelled" && !booking.wasRefunded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleManualRefund(booking)}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Issue Refund
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* New Bookings Alert */}
      {newBookings.length > 0 && (
        <Card className="shadow-card border-primary border-2 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-primary">
              <AlertCircle className="w-5 h-5" />
              New Bookings ({newBookings.length})
            </CardTitle>
            <CardDescription>
              These bookings were just submitted and need PSW assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {newBookings.map((booking) => (
              <div key={booking.id} className="p-4 bg-card rounded-lg border border-border space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono font-bold text-primary">{booking.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.serviceType.map(s => formatServiceType(s)).join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      {booking.paymentStatus === "invoice-pending" ? "Invoice Pending" : booking.paymentStatus}
                    </Badge>
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      {booking.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {booking.date}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {booking.startTime} - {booking.endTime}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{booking.orderingClient.name}</p>
                    <p className="text-xs text-muted-foreground">{booking.orderingClient.email}</p>
                    <p className="text-xs text-muted-foreground">{booking.orderingClient.postalCode}</p>
                    {booking.patient.preferredLanguages && booking.patient.preferredLanguages.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Globe className="w-3 h-3 text-primary" />
                        <span className="text-xs text-primary">
                          {booking.patient.preferredLanguages.map(getLanguageName).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">${booking.total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      PSW: {booking.pswAssigned || "Unassigned"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Booking Management
          </CardTitle>
          <CardDescription>
            View all bookings and manage refunds. Manual refund overrides the 4-hour cancellation rule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="active" className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Active ({filterBookings("active").length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Completed ({filterBookings("completed").length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Cancelled ({filterBookings("cancelled").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {filterBookings("active").length > 0 ? (
                filterBookings("active").map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No active bookings</p>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {filterBookings("completed").length > 0 ? (
                filterBookings("completed").map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No completed bookings</p>
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4">
              {filterBookings("cancelled").length > 0 ? (
                filterBookings("cancelled").map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No cancelled bookings</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Manual Refund Dialog */}
      <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Override Cancellation Policy</AlertDialogTitle>
            <AlertDialogDescription>
              This will issue a manual refund for booking <strong>{selectedBooking?.id}</strong> 
              (${selectedBooking?.total}), overriding the standard 4-hour cancellation rule.
              <br /><br />
              This action will be logged. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRefund} className="bg-primary">
              Confirm Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

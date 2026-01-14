import { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Bell,
  CheckCircle,
  XCircle,
  Play,
  Timer,
  Send,
  FileText,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { getShifts, type ShiftRecord } from "@/lib/shiftStore";
import { getBookings, type BookingData } from "@/lib/bookingStore";
import { formatServiceType, OFFICE_LOCATION, SERVICE_RADIUS_KM } from "@/lib/businessConfig";
import { sendNewJobAlertSMS } from "@/lib/notificationService";
import { format, isSameDay, differenceInHours, parseISO, isToday, isFuture } from "date-fns";

interface CombinedOrder {
  id: string;
  type: "shift" | "booking";
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
  patientAddress: string;
  postalCode: string;
  // Use "active" as alias for "claimed" in status display
  status: "pending" | "claimed" | "active" | "in-progress" | "completed" | "cancelled";
  
  services: string[];
  pswAssigned: string | null;
  orderingClientPhone?: string;
  orderingClientEmail?: string;
  careSheet?: ShiftRecord["careSheet"];
  isHospitalDischarge?: boolean;
  dischargeDocuments?: string;
}

export const DailyOperationsCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isPinging, setIsPinging] = useState<string | null>(null);

  // Combine shifts and bookings
  const allOrders = useMemo((): CombinedOrder[] => {
    const shifts = getShifts();
    const bookings = getBookings();
    
    const ordersFromShifts: CombinedOrder[] = shifts.map(shift => ({
      id: shift.id,
      type: "shift" as const,
      date: shift.scheduledDate,
      startTime: shift.scheduledStart,
      endTime: shift.scheduledEnd,
      clientName: shift.clientName,
      patientAddress: shift.patientAddress,
      postalCode: shift.postalCode,
      status: shift.status === "available" ? "pending" : 
              shift.status === "checked-in" ? "in-progress" : 
              shift.status,
      services: shift.services,
      pswAssigned: shift.pswName || null,
      careSheet: shift.careSheet,
      isHospitalDischarge: shift.careSheet?.isHospitalDischarge,
      dischargeDocuments: shift.careSheet?.dischargeDocuments,
    }));

    const ordersFromBookings: CombinedOrder[] = bookings
      .filter(b => !shifts.find(s => s.bookingId === b.id))
      .map(booking => ({
        id: booking.id,
        type: "booking" as const,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        clientName: booking.orderingClient.name,
        patientAddress: booking.patient.address,
        postalCode: booking.patient.postalCode,
        // Map booking status to our combined status
        status: booking.status === "active" ? "claimed" as const : booking.status as CombinedOrder["status"],
        services: booking.serviceType,
        pswAssigned: booking.pswAssigned,
        orderingClientPhone: booking.orderingClient.phone,
        orderingClientEmail: booking.orderingClient.email,
      }));

    return [...ordersFromShifts, ...ordersFromBookings];
  }, []);

  // Filter orders for selected date
  const ordersForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    
    return allOrders
      .filter(order => {
        try {
          const orderDate = parseISO(order.date);
          return isSameDay(orderDate, selectedDate);
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [allOrders, selectedDate]);

  // Get dates with orders for calendar highlighting
  const datesWithOrders = useMemo(() => {
    const dates = new Map<string, { pending: boolean; active: boolean }>();
    
    allOrders.forEach(order => {
      const dateKey = order.date;
      const existing = dates.get(dateKey) || { pending: false, active: false };
      
      if (order.status === "pending") {
        existing.pending = true;
      } else if (order.status === "claimed" || order.status === "in-progress") {
        existing.active = true;
      }
      
      dates.set(dateKey, existing);
    });
    
    return dates;
  }, [allOrders]);

  // Check if order is within 4 hours and still pending
  const isUrgentPending = (order: CombinedOrder): boolean => {
    if (order.status !== "pending") return false;
    
    try {
      const orderDateTime = parseISO(`${order.date}T${order.startTime}`);
      const hoursUntil = differenceInHours(orderDateTime, new Date());
      return hoursUntil <= 4 && hoursUntil >= 0;
    } catch {
      return false;
    }
  };

  // Manual ping function
  const handleManualPing = async (order: CombinedOrder) => {
    setIsPinging(order.id);
    
    // Simulate sending SMS to PSWs in the area
    try {
      await sendNewJobAlertSMS(
        "+16135550101", // Demo PSW
        "Available PSW",
        order.postalCode,
        order.date,
        order.startTime
      );
      
      toast.success("📱 Manual ping sent!", {
        description: `SMS alerts sent to PSWs within ${SERVICE_RADIUS_KM}km of ${order.postalCode}`,
      });
    } catch (error) {
      toast.error("Failed to send ping");
    }
    
    setIsPinging(null);
  };

  const getStatusBadge = (status: CombinedOrder["status"]) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
      case "claimed":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Claimed</Badge>;
      case "in-progress":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">In-Progress</Badge>;
      case "completed":
        return <Badge className="bg-primary/10 text-primary border-primary/30">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: CombinedOrder["status"]) => {
    switch (status) {
      case "pending":
        return <Timer className="w-4 h-4 text-amber-600" />;
      case "claimed":
        return <User className="w-4 h-4 text-blue-600" />;
      case "in-progress":
        return <Play className="w-4 h-4 text-emerald-600" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Daily Operations Calendar
          </CardTitle>
          <CardDescription>
            Click a date to view all orders. Pending orders within 4 hours show a Manual Ping option.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border w-full"
                modifiers={{
                  hasPending: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return datesWithOrders.get(dateStr)?.pending || false;
                  },
                  hasActive: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return datesWithOrders.get(dateStr)?.active || false;
                  },
                }}
                modifiersStyles={{
                  hasPending: {
                    backgroundColor: "hsl(var(--amber-500) / 0.2)",
                    color: "hsl(var(--amber-600))",
                    fontWeight: "bold",
                  },
                  hasActive: {
                    backgroundColor: "hsl(var(--primary) / 0.2)",
                    color: "hsl(var(--primary))",
                    fontWeight: "bold",
                  },
                }}
              />
              
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500/30" />
                  <span className="text-muted-foreground">Has pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/30" />
                  <span className="text-muted-foreground">Has active</span>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
                </h3>
                <Badge variant="outline">
                  {ordersForSelectedDate.length} order{ordersForSelectedDate.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {ordersForSelectedDate.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders scheduled for this date
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {ordersForSelectedDate.map(order => (
                    <Card 
                      key={order.id} 
                      className={`shadow-sm ${
                        isUrgentPending(order) 
                          ? "border-amber-500 border-2 bg-amber-50/50 dark:bg-amber-950/20" 
                          : ""
                      } ${
                        order.isHospitalDischarge 
                          ? "border-red-500 border-2" 
                          : ""
                      }`}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <span className="font-mono font-bold text-sm">{order.id}</span>
                            {isUrgentPending(order) && (
                              <Badge variant="destructive" className="text-xs animate-pulse">
                                URGENT
                              </Badge>
                            )}
                            {order.isHospitalDischarge && (
                              <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                Hospital Discharge
                              </Badge>
                            )}
                          </div>
                          {getStatusBadge(order.status)}
                        </div>

                        {/* Time & Client */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{order.startTime} - {order.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>{order.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{order.patientAddress}</span>
                          </div>
                        </div>

                        {/* Services */}
                        <div className="flex flex-wrap gap-1">
                          {order.services.map((service, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {typeof service === "string" && service.includes("-") 
                                ? formatServiceType(service) 
                                : service}
                            </Badge>
                          ))}
                        </div>

                        {/* PSW Assignment */}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="text-sm">
                            <span className="text-muted-foreground">PSW: </span>
                            <span className={order.pswAssigned ? "font-medium text-foreground" : "text-amber-600"}>
                              {order.pswAssigned || "Unassigned"}
                            </span>
                          </div>
                          
                          {/* Care Sheet Link for completed orders */}
                          {order.status === "completed" && order.careSheet && (
                            <Button variant="ghost" size="sm" className="text-primary">
                              <FileText className="w-4 h-4 mr-1" />
                              View Care Sheet
                            </Button>
                          )}
                          
                          {/* Manual Ping for urgent pending */}
                          {isUrgentPending(order) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleManualPing(order)}
                              disabled={isPinging === order.id}
                              className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            >
                              {isPinging === order.id ? (
                                <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-1" />
                                  Manual Ping
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Hospital Discharge Warning */}
                        {order.isHospitalDischarge && (
                          <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-red-700 dark:text-red-400">
                              <p className="font-medium">Hospital/Doctor Discharge</p>
                              <p className="text-xs">Review discharge documents immediately</p>
                              {order.dischargeDocuments && (
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="p-0 h-auto text-red-600 underline"
                                  onClick={() => window.open(order.dischargeDocuments, "_blank")}
                                >
                                  View Discharge Papers
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

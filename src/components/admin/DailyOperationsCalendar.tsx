import { useState, useMemo, useEffect } from "react";
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
  AlertTriangle,
  Users,
  DollarSign,
  ClipboardCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Search,
  Copy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatServiceType, OFFICE_LOCATION, SERVICE_RADIUS_KM } from "@/lib/businessConfig";
import { sendEmail } from "@/lib/notificationService";
import { format, isSameDay, differenceInHours, parseISO, isToday, isFuture, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, addMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PROVINCES, ONTARIO_CITIES } from "@/lib/postalCodeUtils";

interface CareSheetData {
  pswFirstName?: string;
  moodOnArrival?: string;
  moodOnDeparture?: string;
  tasksCompleted?: string[];
  observations?: string;
  isHospitalDischarge?: boolean;
  dischargeDocuments?: string;
}

interface CombinedOrder {
  id: string;
  bookingCode: string;
  type: "booking";
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
  patientAddress: string;
  postalCode: string;
  status: "pending" | "claimed" | "active" | "in-progress" | "completed" | "cancelled";
  services: string[];
  pswAssigned: string | null;
  orderingClientPhone?: string;
  orderingClientEmail?: string;
  careSheet?: CareSheetData | null;
  isHospitalDischarge?: boolean;
  dischargeDocuments?: string;
  total?: number;
  hours?: number;
}

interface PSWCompletion {
  pswName: string;
  city: string;
  ordersCompleted: number;
  totalHours: number;
  totalPay: number;
  careSheetsFilled: number;
  careSheetsTotal: number;
  status: "pending" | "cleared";
}

export const DailyOperationsCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isPinging, setIsPinging] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<CombinedOrder[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<any[]>([]);
  const [selectedCareSheet, setSelectedCareSheet] = useState<{ order: CombinedOrder; careSheet: CareSheetData } | null>(null);

  // PSW Completions filter states
  const [provinceFilter, setProvinceFilter] = useState<string>("ON");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "cleared">("all");
  const [completionsMonth, setCompletionsMonth] = useState<Date>(new Date());
  const [completionsDay, setCompletionsDay] = useState<Date | null>(null);
  const [pswCompletionSearch, setPswCompletionSearch] = useState<string>("");

  // Calendar order list search filters
  const [clientNameSearch, setClientNameSearch] = useState<string>("");
  const [pswNameSearch, setPswNameSearch] = useState<string>("");

  // Fetch bookings from Supabase
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("*")
        .order("scheduled_date", { ascending: false });

      if (error) {
        console.error("Error fetching bookings:", error);
        toast.error("Failed to load orders");
        return;
      }

      const orders: CombinedOrder[] = (bookings || []).map(booking => {
        const careSheetData = booking.care_sheet as CareSheetData | null;
        
        return {
          id: booking.id,
          bookingCode: booking.booking_code,
          type: "booking" as const,
          date: booking.scheduled_date,
          startTime: booking.start_time?.slice(0, 5) || "",
          endTime: booking.end_time?.slice(0, 5) || "",
          clientName: booking.patient_name,
          patientAddress: booking.patient_address,
          postalCode: booking.patient_postal_code || booking.client_postal_code || "",
          status: mapBookingStatus(booking.status),
          services: booking.service_type || [],
          pswAssigned: booking.psw_first_name || booking.psw_assigned || null,
          orderingClientPhone: booking.client_phone,
          orderingClientEmail: booking.client_email,
          careSheet: careSheetData,
          isHospitalDischarge: careSheetData?.isHospitalDischarge,
          dischargeDocuments: careSheetData?.dischargeDocuments,
          total: Number(booking.total) || 0,
          hours: Number(booking.hours) || 0,
        };
      });

      setAllOrders(orders);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payroll entries from Supabase
  const fetchPayrollEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("payroll_entries")
        .select("*")
        .order("scheduled_date", { ascending: false });

      if (error) {
        console.error("Error fetching payroll entries:", error);
        return;
      }

      setPayrollEntries(data || []);
    } catch (err) {
      console.error("Error fetching payroll:", err);
    }
  };

  // Map booking status to display status
  const mapBookingStatus = (status: string): CombinedOrder["status"] => {
    switch (status) {
      case "pending": return "pending";
      case "active": return "claimed";
      case "in-progress": return "in-progress";
      case "completed": return "completed";
      case "cancelled": return "cancelled";
      default: return "pending";
    }
  };

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchOrders();
    fetchPayrollEntries();

    // Real-time subscription for bookings
    const bookingsChannel = supabase
      .channel('bookings-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchOrders();
      })
      .subscribe();

    // Real-time subscription for payroll entries
    const payrollChannel = supabase
      .channel('payroll-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_entries' }, () => {
        fetchPayrollEntries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(payrollChannel);
    };
  }, []);

  // Calculate PSW completions from payroll entries
  const pswCompletions = useMemo((): PSWCompletion[] => {
    const completionMap = new Map<string, PSWCompletion>();
    
    // Use completionsMonth/completionsDay for date range
    const rangeStart = completionsDay 
      ? startOfDay(completionsDay) 
      : startOfMonth(completionsMonth);
    const rangeEnd = completionsDay 
      ? endOfDay(completionsDay) 
      : endOfMonth(completionsMonth);

    // Get completed orders for selected range to count care sheets
    const rangeOrders = allOrders.filter(order => {
      try {
        const orderDate = parseISO(order.date);
        return orderDate >= rangeStart && orderDate <= rangeEnd && order.status === "completed";
      } catch {
        return false;
      }
    });

    // Group payroll entries by PSW
    payrollEntries.forEach(entry => {
      try {
        const entryDate = parseISO(entry.scheduled_date);
        if (entryDate < rangeStart || entryDate > rangeEnd) return;

        const existing = completionMap.get(entry.psw_id) || {
          pswName: entry.psw_name,
          city: extractCityFromPostalCode(entry.psw_id), // Will be updated from orders
          ordersCompleted: 0,
          totalHours: 0,
          totalPay: 0,
          careSheetsFilled: 0,
          careSheetsTotal: 0,
          status: entry.status === "cleared" ? "cleared" as const : "pending" as const,
        };

        existing.ordersCompleted += 1;
        existing.totalHours += Number(entry.hours_worked) || 0;
        existing.totalPay += Number(entry.total_owed) || 0;

        completionMap.set(entry.psw_id, existing);
      } catch {
        // Skip invalid entries
      }
    });

    // Match with orders to get care sheet counts and city info
    rangeOrders.forEach(order => {
      if (!order.pswAssigned) return;
      
      // Find matching PSW in completions
      for (const [pswId, completion] of completionMap.entries()) {
        if (completion.pswName === order.pswAssigned) {
          completion.careSheetsTotal += 1;
          if (order.careSheet) {
            completion.careSheetsFilled += 1;
          }
          // Try to extract city from postal code
          if (order.postalCode) {
            completion.city = extractCityFromPostalCode(order.postalCode);
          }
          break;
        }
      }
    });

    return Array.from(completionMap.values()).sort((a, b) => b.totalPay - a.totalPay);
  }, [payrollEntries, allOrders, completionsMonth, completionsDay]);

  // Extract available cities from actual data for dropdown
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    
    pswCompletions.forEach(psw => {
      if (psw.city && psw.city !== "Unknown" && psw.city !== "Ontario") {
        cities.add(psw.city);
      }
    });
    
    return Array.from(cities).sort();
  }, [pswCompletions]);

  // Filtered completions based on city, status, and PSW name filters
  const filteredCompletions = useMemo(() => {
    let results = pswCompletions;

    // Filter by PSW name search
    if (pswCompletionSearch) {
      results = results.filter(p => 
        p.pswName.toLowerCase().includes(pswCompletionSearch.toLowerCase())
      );
    }

    // Filter by city
    if (cityFilter !== "all") {
      results = results.filter(p => p.city === cityFilter);
    }

    // Filter by status
    if (statusFilter !== "all") {
      results = results.filter(p => p.status === statusFilter);
    }

    return results;
  }, [pswCompletions, pswCompletionSearch, cityFilter, statusFilter]);

  // Helper functions for month navigation
  const prevCompletionsMonth = () => {
    setCompletionsMonth(prev => subMonths(prev, 1));
    setCompletionsDay(null);
  };

  const nextCompletionsMonth = () => {
    setCompletionsMonth(prev => addMonths(prev, 1));
    setCompletionsDay(null);
  };

  const resetFilters = () => {
    setProvinceFilter("ON");
    setCityFilter("all");
    setStatusFilter("all");
    setCompletionsMonth(new Date());
    setCompletionsDay(null);
    setPswCompletionSearch("");
  };

  const resetCalendarFilters = () => {
    setClientNameSearch("");
    setPswNameSearch("");
  };

  const hasActiveFilters = cityFilter !== "all" || statusFilter !== "all" || completionsDay !== null || pswCompletionSearch !== "";
  const hasCalendarFilters = clientNameSearch !== "" || pswNameSearch !== "";

  // Extended city mapping with more Ontario cities
  const extractCityFromPostalCode = (postalCode: string): string => {
    if (!postalCode) return "Unknown";
    const prefix = postalCode.substring(0, 3).toUpperCase();
    
    // Comprehensive Ontario postal code prefixes
    const cityMap: Record<string, string> = {
      // Toronto
      "M5V": "Toronto", "M4Y": "Toronto", "M6K": "Toronto", "M5J": "Toronto", "M5G": "Toronto",
      // Hamilton
      "L8P": "Hamilton", "L8S": "Hamilton", "L8E": "Hamilton", "L8L": "Hamilton",
      // Brantford
      "N3T": "Brantford", "N3R": "Brantford", "N3S": "Brantford", "N3P": "Brantford",
      // Peterborough
      "K9H": "Peterborough", "K9J": "Peterborough", "K9K": "Peterborough",
      // London
      "N6A": "London", "N6B": "London", "N6C": "London", "N6E": "London", "N6G": "London", "N6H": "London",
      // Ottawa
      "K1A": "Ottawa", "K1P": "Ottawa", "K1N": "Ottawa", "K1S": "Ottawa", "K2P": "Ottawa",
      // Barrie
      "L4M": "Barrie", "L4N": "Barrie",
      // Brampton
      "L6X": "Brampton", "L6Y": "Brampton", "L6V": "Brampton", "L6W": "Brampton",
      // Mississauga
      "L5A": "Mississauga", "L5B": "Mississauga", "L5C": "Mississauga", "L5M": "Mississauga",
      // Kitchener
      "N2A": "Kitchener", "N2B": "Kitchener", "N2C": "Kitchener", "N2E": "Kitchener",
      // Waterloo
      "N2L": "Waterloo", "N2J": "Waterloo", "N2K": "Waterloo",
      // Windsor
      "N8W": "Windsor", "N8X": "Windsor", "N8Y": "Windsor", "N9A": "Windsor",
      // Sudbury
      "P3A": "Sudbury", "P3B": "Sudbury", "P3C": "Sudbury",
      // Kingston
      "K7K": "Kingston", "K7L": "Kingston", "K7M": "Kingston",
      // Guelph
      "N1E": "Guelph", "N1G": "Guelph", "N1H": "Guelph",
      // Cambridge
      "N1R": "Cambridge", "N1S": "Cambridge", "N1T": "Cambridge",
    };

    // Check for exact match first
    if (cityMap[prefix]) return cityMap[prefix];
    
    // Check first character for region
    const regionMap: Record<string, string> = {
      "M": "Toronto",
      "L": "GTA",
      "N": "SW Ontario",
      "K": "Eastern Ontario",
      "P": "Northern Ontario",
    };

    return regionMap[prefix[0]] || "Ontario";
  };

  // Filter orders for selected date with name search
  const ordersForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    
    return allOrders
      .filter(order => {
        try {
          const orderDate = parseISO(order.date);
          if (!isSameDay(orderDate, selectedDate)) return false;
          
          // Client name filter
          if (clientNameSearch && !order.clientName.toLowerCase().includes(clientNameSearch.toLowerCase())) {
            return false;
          }
          
          // PSW name filter
          if (pswNameSearch && (!order.pswAssigned || !order.pswAssigned.toLowerCase().includes(pswNameSearch.toLowerCase()))) {
            return false;
          }
          
          return true;
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [allOrders, selectedDate, clientNameSearch, pswNameSearch]);

  // Get dates with orders for calendar highlighting
  const datesWithOrders = useMemo(() => {
    const dates = new Map<string, { pending: boolean; active: boolean; completed: boolean }>();
    
    allOrders.forEach(order => {
      const dateKey = order.date;
      const existing = dates.get(dateKey) || { pending: false, active: false, completed: false };
      
      if (order.status === "pending") {
        existing.pending = true;
      } else if (order.status === "claimed" || order.status === "in-progress") {
        existing.active = true;
      } else if (order.status === "completed") {
        existing.completed = true;
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
    
    try {
      await sendEmail({
        to: "psw-alerts@pswdirect.ca",
        subject: `New Shift Available - ${order.date}`,
        body: `New shift available!\n\nDate: ${order.date}\nTime: ${order.startTime}\nArea: ${order.postalCode}\n\nOpen the app to claim it!`,
      });
      
      toast.success("📧 Manual ping sent!", {
        description: `Email alerts sent to PSWs within ${SERVICE_RADIUS_KM}km of ${order.postalCode}`,
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

  // Open care sheet dialog
  const handleViewCareSheet = (order: CombinedOrder) => {
    if (order.careSheet) {
      setSelectedCareSheet({ order, careSheet: order.careSheet });
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Calendar Card */}
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading orders...</span>
            </div>
          ) : (
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
                    hasCompleted: (date) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      return datesWithOrders.get(dateStr)?.completed || false;
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
                    hasCompleted: {
                      backgroundColor: "hsl(142 76% 36% / 0.2)",
                      color: "hsl(142 76% 36%)",
                      fontWeight: "bold",
                    },
                  }}
                />
                
                <div className="flex gap-4 mt-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500/30" />
                    <span className="text-muted-foreground">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary/30" />
                    <span className="text-muted-foreground">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500/30" />
                    <span className="text-muted-foreground">Completed</span>
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

                {/* Name Search Filters */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1 min-w-[140px] relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search client name..."
                      value={clientNameSearch}
                      onChange={(e) => setClientNameSearch(e.target.value)}
                      className="h-8 text-sm pl-8"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px] relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search PSW name..."
                      value={pswNameSearch}
                      onChange={(e) => setPswNameSearch(e.target.value)}
                      className="h-8 text-sm pl-8"
                    />
                  </div>
                  {hasCalendarFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetCalendarFilters}
                      className="h-8 px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {ordersForSelectedDate.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {hasCalendarFilters ? "No orders match your search" : "No orders scheduled for this date"}
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
                              <span className="font-mono font-bold text-sm">{order.bookingCode}</span>
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

                          {/* PSW Assignment + Copy UUID */}
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <div className="text-sm">
                              <span className="text-muted-foreground">PSW: </span>
                              <span className={order.pswAssigned ? "font-medium text-foreground" : "text-amber-600"}>
                                {order.pswAssigned || "Unassigned"}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {/* Copy UUID */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(order.id);
                                  toast.success("Copied booking ID");
                                }}
                                title="Copy booking UUID"
                                className="text-muted-foreground hover:text-foreground h-7 px-2"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                <span className="text-xs">UUID</span>
                              </Button>

                              {/* Care Sheet Link for completed orders */}
                              {order.status === "completed" && order.careSheet && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-primary"
                                  onClick={() => handleViewCareSheet(order)}
                                >
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
          )}
        </CardContent>
      </Card>

      {/* PSW Order Completions Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            PSW Order Completions
          </CardTitle>
          <CardDescription>
            Staff who completed orders with care sheet status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
            {/* Month Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={prevCompletionsMonth} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[120px] text-center text-sm">
                {format(completionsMonth, "MMMM yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={nextCompletionsMonth} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Day Selector (Optional) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8">
                  <CalendarIcon className="w-4 h-4" />
                  {completionsDay ? format(completionsDay, "MMM d") : "All Days"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={completionsDay || undefined}
                  onSelect={(date) => setCompletionsDay(date || null)}
                  month={completionsMonth}
                  onMonthChange={setCompletionsMonth}
                />
                {completionsDay && (
                  <div className="p-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setCompletionsDay(null)}
                      className="w-full text-xs"
                    >
                      Clear Day Filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <div className="h-6 w-px bg-border" />

            {/* Province Selector */}
            <Select 
              value={provinceFilter} 
              onValueChange={(val) => {
                setProvinceFilter(val);
                setCityFilter("all");
              }}
            >
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ON">Ontario</SelectItem>
                {/* Future expansion for other provinces */}
              </SelectContent>
            </Select>

            {/* City Selector */}
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[150px] h-8 text-sm">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {availableCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-6 w-px bg-border" />

            {/* Status Toggle */}
            <ToggleGroup 
              type="single" 
              value={statusFilter} 
              onValueChange={(val) => val && setStatusFilter(val as typeof statusFilter)}
              className="gap-0"
            >
              <ToggleGroupItem value="all" className="text-xs h-8 px-3 rounded-r-none">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="pending" className="text-xs h-8 px-3 rounded-none border-l-0">
                Pending
              </ToggleGroupItem>
              <ToggleGroupItem value="cleared" className="text-xs h-8 px-3 rounded-l-none border-l-0">
                Cleared
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="h-6 w-px bg-border" />

            {/* PSW Name Search */}
            <div className="relative flex-1 min-w-[150px] max-w-[200px]">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search PSW..."
                value={pswCompletionSearch}
                onChange={(e) => setPswCompletionSearch(e.target.value)}
                className="h-8 text-sm pl-8"
              />
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 h-8 text-xs ml-auto">
                <X className="w-3 h-3" />
                Reset
              </Button>
            )}
          </div>

          {/* Table Content */}
          {filteredCompletions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {pswCompletions.length === 0 
                ? `No completed orders for ${completionsDay ? format(completionsDay, "MMMM d, yyyy") : format(completionsMonth, "MMMM yyyy")}`
                : "No results match your filters"
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PSW Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Total Pay</TableHead>
                    <TableHead className="text-center">Care Sheets</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompletions.map((psw, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{psw.pswName}</TableCell>
                      <TableCell>{psw.city}</TableCell>
                      <TableCell className="text-center">{psw.ordersCompleted}</TableCell>
                      <TableCell className="text-right">{psw.totalHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right font-medium">${psw.totalPay.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ClipboardCheck className={`w-4 h-4 ${psw.careSheetsFilled === psw.careSheetsTotal && psw.careSheetsTotal > 0 ? "text-green-600" : "text-amber-600"}`} />
                          <span className={psw.careSheetsFilled === psw.careSheetsTotal && psw.careSheetsTotal > 0 ? "text-green-600" : "text-amber-600"}>
                            {psw.careSheetsFilled}/{psw.careSheetsTotal}
                          </span>
                          {psw.careSheetsFilled === psw.careSheetsTotal && psw.careSheetsTotal > 0 && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={psw.status === "cleared" 
                          ? "bg-green-500/10 text-green-600 border-green-200" 
                          : "bg-amber-500/10 text-amber-600 border-amber-200"
                        }>
                          {psw.status === "cleared" ? "Cleared" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Summary Row */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filteredCompletions.length}</span>
                    {filteredCompletions.length !== pswCompletions.length && (
                      <span className="text-xs ml-1">(of {pswCompletions.length})</span>
                    )}
                    {" "}PSWs
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {filteredCompletions.reduce((sum, p) => sum + p.ordersCompleted, 0)}
                    </span> orders
                  </div>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="text-xs">
                      <Filter className="w-3 h-3 mr-1" />
                      Filters Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg">
                    ${filteredCompletions.reduce((sum, p) => sum + p.totalPay, 0).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">total owed</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Care Sheet Dialog */}
      <Dialog open={!!selectedCareSheet} onOpenChange={(open) => !open && setSelectedCareSheet(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Care Sheet - {selectedCareSheet?.order.bookingCode}
            </DialogTitle>
          </DialogHeader>
          {selectedCareSheet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Completed by</p>
                  <p className="font-medium">{selectedCareSheet.careSheet.pswFirstName || selectedCareSheet.order.pswAssigned || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedCareSheet.order.date}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mood on Arrival</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedCareSheet.careSheet.moodOnArrival || "Not recorded"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mood on Departure</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedCareSheet.careSheet.moodOnDeparture || "Not recorded"}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Tasks Completed</p>
                {selectedCareSheet.careSheet.tasksCompleted && selectedCareSheet.careSheet.tasksCompleted.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedCareSheet.careSheet.tasksCompleted.map((task, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {task}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No tasks recorded</p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Observations / Notes</p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    {selectedCareSheet.careSheet.observations || "No observations recorded"}
                  </p>
                </div>
              </div>

              {selectedCareSheet.careSheet.isHospitalDischarge && (
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Hospital Discharge Visit
                  </p>
                  {selectedCareSheet.careSheet.dischargeDocuments && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto text-red-600 underline mt-1"
                      onClick={() => window.open(selectedCareSheet.careSheet.dischargeDocuments, "_blank")}
                    >
                      View Discharge Documents
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

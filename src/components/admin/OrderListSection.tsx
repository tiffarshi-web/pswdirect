// Order List Section - Displays orders with time filtering and real-time updates
// Weekly, Monthly, Yearly tabs with date selectors + Archived tab

import { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, Clock, DollarSign, FileText, Search, User, ChevronLeft, ChevronRight, CalendarDays, List, LayoutGrid, Archive, ArchiveRestore, AlertTriangle, Timer, Copy, Plus, Phone, Mail, MapPin, Heart, Globe, UserCheck, Receipt, XCircle } from "lucide-react";
import { BookingInvoicePanel } from "./BookingInvoicePanel";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { ShiftTimeAdjustmentDialog } from "./ShiftTimeAdjustmentDialog";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears, addWeeks, addMonths, addYears, isToday, startOfDay, endOfDay } from "date-fns";
import { BookingStatusIcon, getBookingStatusInfo } from "@/components/ui/BookingStatusIcon";
import { OvertimeBadge } from "@/components/ui/OvertimeBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { archiveBooking, restoreBooking, archivePastDueBookings, archiveToAccounting } from "@/lib/bookingStore";
import { ManualOrderCreation } from "./ManualOrderCreation";

interface CareSheetData {
  moodOnArrival: string;
  moodOnDeparture: string;
  tasksCompleted: string[];
  observations: string;
  pswFirstName: string;
}

interface Booking {
  id: string;
  booking_code: string;
  client_name: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string;
  client_phone: string | null;
  client_address: string;
  client_postal_code: string | null;
  patient_name: string;
  patient_first_name: string | null;
  patient_last_name: string | null;
  patient_address: string;
  patient_postal_code: string | null;
  patient_relationship: string | null;
  preferred_languages: string[] | null;
  preferred_gender: string | null;
  special_notes: string | null;
  care_conditions: string[] | null;
  street_number: string | null;
  street_name: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  status: string;
  subtotal: number;
  total: number;
  service_type: string[];
  psw_first_name: string | null;
  psw_assigned: string | null;
  care_sheet: CareSheetData | null;
  care_sheet_submitted_at: string | null;
  care_sheet_psw_name: string | null;
  care_sheet_status: string | null;
  payment_status: string;
  overtime_minutes: number | null;
  overtime_payment_intent_id: string | null;
  was_refunded: boolean | null;
  refund_amount: number | null;
  refund_reason: string | null;
  care_sheet_flagged: boolean;
  care_sheet_flag_reason: string[];
  is_recurring?: boolean;
  checked_in_at: string | null;
  signed_out_at: string | null;
}

type TimeFilter = "daily" | "weekly" | "monthly" | "yearly" | "archived";
type ViewMode = "list" | "summary";

const BOOKING_SELECT = "id, booking_code, client_name, client_first_name, client_last_name, client_email, client_phone, client_address, client_postal_code, patient_name, patient_first_name, patient_last_name, patient_address, patient_postal_code, patient_relationship, preferred_languages, preferred_gender, special_notes, care_conditions, street_number, street_name, scheduled_date, start_time, end_time, hours, status, subtotal, total, service_type, psw_first_name, psw_assigned, care_sheet, care_sheet_submitted_at, care_sheet_psw_name, payment_status, overtime_minutes, overtime_payment_intent_id, care_sheet_flagged, care_sheet_flag_reason, care_sheet_status, was_refunded, refund_amount, refund_reason, is_recurring, checked_in_at, signed_out_at";

const formatDate = (dateStr: string): string => {
  return format(new Date(dateStr), "MMM d, yyyy");
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getStatusBadge = (status: string, pswAssigned: string | null, paymentStatus?: string | null) => {
  const statusInfo = getBookingStatusInfo(status, pswAssigned, paymentStatus);
  return (
    <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border ${statusInfo.borderColor}`}>
      {statusInfo.label}
    </Badge>
  );
};

export const OrderListSection = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderIdSearch, setOrderIdSearch] = useState("");
  const [exactMatchResult, setExactMatchResult] = useState<Booking | null>(null);
  const [searchingOrderId, setSearchingOrderId] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("daily");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedCareSheet, setSelectedCareSheet] = useState<CareSheetData | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Archive functionality state
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [bookingToArchive, setBookingToArchive] = useState<Booking | null>(null);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  
  // MOC state
  const [mocOpen, setMocOpen] = useState(false);
  
  // Client info dialog
  const [clientInfoBooking, setClientInfoBooking] = useState<Booking | null>(null);

  // Time adjustment dialog
  const [timeAdjustBooking, setTimeAdjustBooking] = useState<Booking | null>(null);

  // Cancel order dialog
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [timeFilter, selectedDate]);

  // Subscribe to realtime changes for live updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          console.log("Realtime order update:", payload);
          
          if (payload.eventType === "UPDATE") {
            const updatedBooking = payload.new as any;
            setBookings((prev) =>
              prev.map((b) => 
                b.id === updatedBooking.id 
                  ? { ...b, ...updatedBooking, care_sheet: updatedBooking.care_sheet as unknown as CareSheetData | null, care_sheet_flagged: updatedBooking.care_sheet_flagged ?? false, care_sheet_flag_reason: updatedBooking.care_sheet_flag_reason ?? [] }
                  : b
              )
            );
          } else if (payload.eventType === "INSERT") {
            // Refetch to check if new booking is in current date range
            fetchBookings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeFilter, selectedDate]);

  const getDateRange = () => {
    switch (timeFilter) {
      case "daily":
        return {
          start: startOfDay(selectedDate),
          end: endOfDay(selectedDate),
        };
      case "weekly":
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
        };
      case "monthly":
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate),
        };
      case "yearly":
        return {
          start: startOfYear(selectedDate),
          end: endOfYear(selectedDate),
        };
      case "archived":
        // For archived, we'll fetch all archived bookings (no date range)
        return {
          start: new Date(0),
          end: new Date(),
        };
    }
  };

  // Search for exact order ID match
  const searchByOrderId = async (orderId: string) => {
    if (!orderId.trim()) {
      setExactMatchResult(null);
      return;
    }
    
    setSearchingOrderId(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("booking_code", orderId.trim().toUpperCase())
      .maybeSingle();
    
    if (error) {
      console.error("Error searching order:", error);
      setExactMatchResult(null);
    } else if (data) {
      setExactMatchResult({
        ...data,
        care_sheet: data.care_sheet as unknown as CareSheetData | null,
        overtime_minutes: data.overtime_minutes ?? null,
        overtime_payment_intent_id: data.overtime_payment_intent_id ?? null,
        care_sheet_flagged: (data as any).care_sheet_flagged ?? false,
        care_sheet_flag_reason: (data as any).care_sheet_flag_reason ?? [],
      });
    } else {
      setExactMatchResult(null);
    }
    setSearchingOrderId(false);
  };

  // Debounced order ID search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (orderIdSearch.length >= 3) {
        searchByOrderId(orderIdSearch);
      } else {
        setExactMatchResult(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [orderIdSearch]);

  const fetchBookings = async () => {
    setLoading(true);
    
    if (timeFilter === "archived") {
      // Fetch only archived bookings
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("status", "archived")
        .order("scheduled_date", { ascending: false });

      if (error) {
        console.error("Error fetching archived bookings:", error);
      } else {
        const typedBookings = (data || []).map(booking => ({
          ...booking,
          care_sheet: booking.care_sheet as unknown as CareSheetData | null,
          overtime_minutes: booking.overtime_minutes ?? null,
          overtime_payment_intent_id: booking.overtime_payment_intent_id ?? null,
          care_sheet_flagged: (booking as any).care_sheet_flagged ?? false,
          care_sheet_flag_reason: (booking as any).care_sheet_flag_reason ?? [],
        }));
        setBookings(typedBookings);
      }
      setLoading(false);
      return;
    }
    
    const { start, end } = getDateRange();
    
    // Fetch non-archived bookings for regular views
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .gte("scheduled_date", format(start, "yyyy-MM-dd"))
      .lte("scheduled_date", format(end, "yyyy-MM-dd"))
      .neq("status", "archived")
      .order("scheduled_date", { ascending: false });

    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      const typedBookings = (data || []).map(booking => ({
        ...booking,
        care_sheet: booking.care_sheet as unknown as CareSheetData | null,
        overtime_minutes: booking.overtime_minutes ?? null,
        overtime_payment_intent_id: booking.overtime_payment_intent_id ?? null,
        care_sheet_flagged: (booking as any).care_sheet_flagged ?? false,
        care_sheet_flag_reason: (booking as any).care_sheet_flag_reason ?? [],
      }));
      setBookings(typedBookings);
    }
    setLoading(false);
  };

  const navigatePeriod = (direction: "prev" | "next") => {
    const modifier = direction === "prev" ? -1 : 1;
    switch (timeFilter) {
      case "daily":
        setSelectedDate(new Date(selectedDate.getTime() + modifier * 24 * 60 * 60 * 1000));
        break;
      case "weekly":
        setSelectedDate(direction === "prev" ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
        break;
      case "monthly":
        setSelectedDate(direction === "prev" ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1));
        break;
      case "yearly":
        setSelectedDate(direction === "prev" ? subYears(selectedDate, 1) : addYears(selectedDate, 1));
        break;
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setTimeFilter("daily");
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setTimeFilter("daily");
      setCalendarOpen(false);
    }
  };

  const getPeriodLabel = () => {
    if (timeFilter === "archived") {
      return "Archived Orders";
    }
    const { start, end } = getDateRange();
    switch (timeFilter) {
      case "daily":
        return format(selectedDate, "EEEE, MMMM d, yyyy");
      case "weekly":
        return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
      case "monthly":
        return format(selectedDate, "MMMM yyyy");
      case "yearly":
        return format(selectedDate, "yyyy");
      default:
        return "";
    }
  };

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    
    const query = searchQuery.toLowerCase();
    return bookings.filter(b => 
      b.client_name.toLowerCase().includes(query) ||
      b.booking_code.toLowerCase().includes(query) ||
      b.client_email.toLowerCase().includes(query) ||
      (b.psw_first_name?.toLowerCase().includes(query))
    );
  }, [bookings, searchQuery]);

  const stats = useMemo(() => {
    // Revenue: only non-cancelled, non-archived operational bookings
    const operationalBookings = filteredBookings.filter(b => b.status !== "cancelled" && b.status !== "archived");
    const completed = filteredBookings.filter(b => b.status === "completed").length;
    const totalRevenue = operationalBookings.reduce((sum, b) => sum + (b.total || 0), 0);
    const withCareSheet = filteredBookings.filter(b => b.care_sheet !== null).length;
    const overtimeCount = filteredBookings.filter(b => b.payment_status === "overtime_adjusted").length;
    const overtimeRevenue = filteredBookings
      .filter(b => b.payment_status === "overtime_adjusted")
      .reduce((sum, b) => sum + ((b.total || 0) - (b.subtotal || 0)), 0);
    
    return { completed, totalRevenue, withCareSheet, total: filteredBookings.length, overtimeCount, overtimeRevenue };
  }, [filteredBookings]);

  // Summary stats by status for daily summary view
  // Revenue excludes cancelled orders to prevent financial inflation
  const dailySummary = useMemo(() => {
    const pending = filteredBookings.filter(b => b.status === "pending").length;
    const confirmed = filteredBookings.filter(b => b.status === "confirmed").length;
    const inProgress = filteredBookings.filter(b => b.status === "in-progress").length;
    const completed = filteredBookings.filter(b => b.status === "completed").length;
    const cancelled = filteredBookings.filter(b => b.status === "cancelled").length;
    const unserved = filteredBookings.filter(b => b.status === "unserved").length;
    const operationalBookings = filteredBookings.filter(b => b.status !== "cancelled" && b.status !== "archived");
    const totalRevenue = operationalBookings.reduce((sum, b) => sum + (b.total || 0), 0);
    const overtimeCount = filteredBookings.filter(b => b.payment_status === "overtime_adjusted").length;
    
    return { pending: pending + unserved, confirmed, inProgress, completed, cancelled, totalRevenue, total: filteredBookings.length, overtimeCount };
  }, [filteredBookings]);

  const viewCareSheet = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedCareSheet(booking.care_sheet);
  };

  // Archive handlers
  const handleArchiveClick = (booking: Booking) => {
    if (booking.status === "in-progress") {
      toast.error("Cannot archive in-progress orders");
      return;
    }
    setBookingToArchive(booking);
    setArchiveConfirmOpen(true);
  };

  const confirmArchive = async () => {
    if (!bookingToArchive) return;
    setArchiving(true);
    const result = await archiveBooking(bookingToArchive.booking_code);
    if (result) {
      toast.success(`Order ${bookingToArchive.booking_code} archived`);
      fetchBookings();
    } else {
      toast.error("Failed to archive order");
    }
    setArchiving(false);
    setArchiveConfirmOpen(false);
    setBookingToArchive(null);
  };

  const handleRestore = async (booking: Booking) => {
    setArchiving(true);
    const result = await restoreBooking(booking.booking_code);
    if (result) {
      toast.success(`Order ${booking.booking_code} restored`);
      fetchBookings();
    } else {
      toast.error("Failed to restore order");
    }
    setArchiving(false);
  };

  const handleBulkArchive = async () => {
    setArchiving(true);
    const result = await archivePastDueBookings();
    if (result.error) {
      toast.error(`Failed to archive: ${result.error}`);
    } else if (result.archived > 0) {
      toast.success(`Archived ${result.archived} past-due orders`);
      fetchBookings();
    } else {
      toast.info("No past-due orders to archive");
    }
    setArchiving(false);
    setBulkArchiveOpen(false);
  };

  // Count past-due non-archived bookings for bulk archive button
  const pastDueCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return filteredBookings.filter(b => 
      b.scheduled_date < today && 
      b.status !== "completed" && 
      b.status !== "in-progress" &&
      b.status !== "archived"
    ).length;
  }, [filteredBookings]);

  const copyUuid = (uuid: string) => {
    navigator.clipboard.writeText(uuid);
    toast.success("Copied booking ID");
  };

  return (
    <div className="space-y-6">
      {/* Header with MOC Button */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setMocOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Order (Manual)
        </Button>
      </div>

      {/* MOC Dialog */}
      <ManualOrderCreation open={mocOpen} onOpenChange={setMocOpen} onOrderCreated={() => fetchBookings()} />
      {/* Order ID Search - Exact Match */}
      <Card className="shadow-card border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID (e.g., CDT-000001 or PSW-ABC123)..."
                value={orderIdSearch}
                onChange={(e) => setOrderIdSearch(e.target.value.toUpperCase())}
                className="pl-10 font-mono"
              />
            </div>
            {searchingOrderId && (
              <span className="text-sm text-muted-foreground">Searching...</span>
            )}
          </div>
          
          {/* Exact Match Result */}
          {exactMatchResult && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Order Found: {exactMatchResult.booking_code}
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setOrderIdSearch("")}>
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Client:</span>
                  <p className="font-medium">{exactMatchResult.client_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{formatDate(exactMatchResult.scheduled_date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <p className="font-medium">{formatTime(exactMatchResult.start_time)} - {formatTime(exactMatchResult.end_time)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <BookingStatusIcon status={exactMatchResult.status} pswAssigned={exactMatchResult.psw_assigned} paymentStatus={exactMatchResult.payment_status} size="sm" />
                    {getStatusBadge(exactMatchResult.status, exactMatchResult.psw_assigned, exactMatchResult.payment_status)}
                    {exactMatchResult.payment_status === "overtime_adjusted" && (
                      <OvertimeBadge 
                        overtimeMinutes={exactMatchResult.overtime_minutes}
                        overtimePaymentIntentId={exactMatchResult.overtime_payment_intent_id}
                        subtotal={exactMatchResult.subtotal}
                        total={exactMatchResult.total}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">PSW:</span>
                  <p className="font-medium">{exactMatchResult.psw_first_name || "Unassigned"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-medium">${exactMatchResult.total.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  {exactMatchResult.care_sheet && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewCareSheet(exactMatchResult)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      View Care Sheet
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {orderIdSearch.length >= 3 && !searchingOrderId && !exactMatchResult && (
            <p className="mt-3 text-sm text-muted-foreground">No order found with ID "{orderIdSearch}"</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Today Button */}
        <Button 
          variant={isToday(selectedDate) && timeFilter === "daily" ? "default" : "outline"}
          size="sm"
          onClick={goToToday}
          className="gap-2"
        >
          <CalendarDays className="w-4 h-4" />
          Today
        </Button>
        
        {/* Calendar Date Picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              Pick Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        
        {/* View Mode Toggle (only for daily view) */}
        {timeFilter === "daily" && (
          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="view-mode" className="text-sm text-muted-foreground">View:</Label>
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "summary" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("summary")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Time Filter Tabs */}
      <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
          <TabsTrigger value="archived" className="gap-1">
            <Archive className="w-3 h-3" />
            Archived
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Period Navigation - hide for archived view */}
      {timeFilter !== "archived" && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => navigatePeriod("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold">{getPeriodLabel()}</h3>
          <Button variant="outline" size="icon" onClick={() => navigatePeriod("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Archived View Header */}
      {timeFilter === "archived" && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Archive className="w-5 h-5 text-muted-foreground" />
            {getPeriodLabel()} ({filteredBookings.length})
          </h3>
        </div>
      )}
      
      {/* Bulk Archive Action - show only for non-archived views when there are past-due orders */}
      {timeFilter !== "archived" && pastDueCount > 0 && (
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-foreground">Past-Due Orders Found</p>
                <p className="text-sm text-muted-foreground">
                  {pastDueCount} order{pastDueCount > 1 ? "s are" : " is"} past scheduled date and not completed
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setBulkArchiveOpen(true)}
              className="gap-2 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <Archive className="w-4 h-4" />
              Archive Past Due
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Daily Summary View */}
      {timeFilter === "daily" && viewMode === "summary" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{dailySummary.total}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{dailySummary.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{dailySummary.confirmed}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{dailySummary.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{dailySummary.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">${dailySummary.totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats (for non-daily or list view) */}
      {(timeFilter !== "daily" || viewMode === "list") && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">${stats.totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.withCareSheet}</p>
              <p className="text-xs text-muted-foreground">Care Sheets</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search - Filter within results */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Filter by client name, email, or PSW..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Orders Table (show only in list view for daily, always for other filters) */}
      {(timeFilter !== "daily" || viewMode === "list") && (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Orders
          </CardTitle>
          <CardDescription>
            {filteredBookings.length} orders in selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>PSW</TableHead>
                    <TableHead>Status</TableHead>
                     <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { console.log("[OrderDetail] Row clicked:", booking.booking_code); setClientInfoBooking(booking); }}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {booking.booking_code}
                          {booking.is_recurring && (
                            <Badge variant="secondary" className="text-xs">
                              Recurring
                            </Badge>
                          )}
                          {booking.status === "archived" && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Archived
                            </Badge>
                          )}
                          {booking.payment_status === "overtime_adjusted" && (
                            <OvertimeBadge 
                              overtimeMinutes={booking.overtime_minutes}
                              overtimePaymentIntentId={booking.overtime_payment_intent_id}
                              subtotal={booking.subtotal}
                              total={booking.total}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(booking.scheduled_date)}</TableCell>
                      <TableCell>
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </TableCell>
                      <TableCell>
                        <span className="text-primary font-medium">
                          {booking.client_name}
                        </span>
                      </TableCell>
                      <TableCell>{booking.psw_first_name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookingStatusIcon status={booking.status} pswAssigned={booking.psw_assigned} paymentStatus={booking.payment_status} size="sm" />
                          {getStatusBadge(booking.status, booking.psw_assigned, booking.payment_status)}
                        </div>
                      </TableCell>
                      <TableCell>${booking.total.toFixed(2)}</TableCell>
                       <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* View Order Detail */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { console.log("[OrderDetail] Open button clicked:", booking.booking_code); setClientInfoBooking(booking); }}
                            className="gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            Open
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUuid(booking.id)}
                            title="Copy booking UUID for Stripe/manual ops"
                            className="gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="w-3 h-3" />
                            <span className="text-xs">UUID</span>
                          </Button>
                          {booking.care_sheet_flagged && (
                            <Badge variant="destructive" className="text-xs gap-1" title={`Detected: ${(booking.care_sheet_flag_reason || []).join(", ")}`}>
                              <AlertTriangle className="w-3 h-3" />
                              Contact detected
                            </Badge>
                          )}
                          {booking.care_sheet && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewCareSheet(booking)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          )}
                          {/* Archive to Accounting - for completed/refunded orders */}
                          {(booking.status === "completed") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const result = await archiveToAccounting(booking.booking_code);
                                if (result) {
                                  toast.success(`Order ${booking.booking_code} archived to accounting`);
                                  fetchBookings();
                                } else {
                                  toast.error("Failed to archive to accounting");
                                }
                              }}
                              disabled={archiving}
                              className="gap-1 text-primary hover:text-primary"
                            >
                              <DollarSign className="w-4 h-4" />
                              To Accounting
                            </Button>
                          )}
                          {booking.status === "archived" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(booking)}
                              disabled={archiving}
                              className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                              Restore
                            </Button>
                          ) : booking.status !== "in-progress" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveClick(booking)}
                              disabled={archiving}
                              className="gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Care Sheet Dialog */}
      <Dialog open={!!selectedCareSheet} onOpenChange={() => setSelectedCareSheet(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Care Sheet Report
            </DialogTitle>
          </DialogHeader>
          
          {selectedCareSheet && selectedBooking && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order ID:</span>
                    <p className="font-medium text-foreground">{selectedBooking.booking_code}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-medium text-foreground">{formatDate(selectedBooking.scheduled_date)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Client:</span>
                    <p className="font-medium text-foreground">{selectedBooking.client_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PSW:</span>
                    <p className="font-medium text-foreground">{selectedCareSheet.pswFirstName || selectedBooking.care_sheet_psw_name}</p>
                  </div>
                </div>
              </div>

              {/* Mood Status */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Patient Status
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Mood on Arrival</p>
                    <p className="text-sm font-medium text-foreground">{selectedCareSheet.moodOnArrival}</p>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Mood on Departure</p>
                    <p className="text-sm font-medium text-foreground">{selectedCareSheet.moodOnDeparture}</p>
                  </div>
                </div>
              </div>

              {/* Tasks Completed */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Tasks Completed</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCareSheet.tasksCompleted?.map((task, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {task}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Observations</h4>
                <p className="text-sm text-muted-foreground leading-relaxed p-3 bg-muted rounded-lg">
                  {selectedCareSheet.observations || "No observations recorded."}
                </p>
              </div>

              {/* Flagged Warning */}
              {selectedBooking.care_sheet_flagged && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Contact info detected in care sheet</p>
                    <p className="text-xs text-muted-foreground">
                      Detected: {(selectedBooking.care_sheet_flag_reason || []).join(", ")}. Client email was sent with sanitized content only.
                    </p>
                  </div>
                </div>
              )}

              {/* Submitted At */}
              {selectedBooking.care_sheet_submitted_at && (
                <p className="text-xs text-muted-foreground">
                  Submitted: {format(new Date(selectedBooking.care_sheet_submitted_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-muted-foreground" />
              Archive Order
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive order <strong>{bookingToArchive?.booking_code}</strong>?
              <br /><br />
              The order will be removed from the Live Map and Active views but preserved in the Archived tab for record-keeping.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmArchive}
              disabled={archiving}
              className="gap-2"
            >
              <Archive className="w-4 h-4" />
              {archiving ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Archive Confirmation Dialog */}
      <AlertDialog open={bulkArchiveOpen} onOpenChange={setBulkArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Archive Past-Due Orders
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will archive all orders that:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Are scheduled before today</li>
                <li>Are NOT completed or in-progress</li>
              </ul>
              <br />
              These orders will be removed from the Live Map and Active views but preserved in the Archived tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkArchive}
              disabled={archiving}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Archive className="w-4 h-4" />
              {archiving ? "Archiving..." : "Archive All Past Due"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Client Info / Order Detail Dialog */}
      <Dialog open={!!clientInfoBooking} onOpenChange={(open) => { console.log("[OrderDetail] Dialog onOpenChange:", open); if (!open) setClientInfoBooking(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto z-[100]">
          <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Order Detail
            </DialogTitle>
            <DialogDescription>
              {clientInfoBooking?.booking_code} — Client & Service Information
            </DialogDescription>
          </DialogHeader>

          {clientInfoBooking && (
            <div className="space-y-5">
              {/* Ordering Client */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Ordering Client
                </h4>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">{clientInfoBooking.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${clientInfoBooking.client_email}`} className="text-sm text-primary hover:underline">
                      {clientInfoBooking.client_email}
                    </a>
                  </div>
                  {clientInfoBooking.client_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${clientInfoBooking.client_phone}`} className="text-sm text-primary hover:underline">
                        {clientInfoBooking.client_phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground">
                      {clientInfoBooking.street_number || clientInfoBooking.street_name ? (
                        <>
                          {clientInfoBooking.street_number && <span className="font-medium">{clientInfoBooking.street_number}</span>}
                          {clientInfoBooking.street_name && <span> {clientInfoBooking.street_name}</span>}
                          {clientInfoBooking.client_postal_code && <span className="text-muted-foreground">, {clientInfoBooking.client_postal_code}</span>}
                        </>
                      ) : (
                        <>
                          {clientInfoBooking.client_address}
                          {clientInfoBooking.client_postal_code && <span className="text-muted-foreground">, {clientInfoBooking.client_postal_code}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Patient
                </h4>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">{clientInfoBooking.patient_name}</span>
                    {clientInfoBooking.patient_relationship && (
                      <Badge variant="outline" className="text-xs">
                        {clientInfoBooking.patient_relationship}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground">
                      {clientInfoBooking.street_number || clientInfoBooking.street_name ? (
                        <>
                          {clientInfoBooking.street_number && <span className="font-medium">{clientInfoBooking.street_number}</span>}
                          {clientInfoBooking.street_name && <span> {clientInfoBooking.street_name}</span>}
                          {clientInfoBooking.patient_postal_code && <span className="text-muted-foreground">, {clientInfoBooking.patient_postal_code}</span>}
                        </>
                      ) : (
                        <>
                          {clientInfoBooking.patient_address}
                          {clientInfoBooking.patient_postal_code && <span className="text-muted-foreground">, {clientInfoBooking.patient_postal_code}</span>}
                        </>
                      )}
                    </div>
                  </div>
                  {clientInfoBooking.preferred_languages && clientInfoBooking.preferred_languages.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {clientInfoBooking.preferred_languages.map((lang, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {clientInfoBooking.preferred_gender && (
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">Preferred gender: <span className="text-foreground">{clientInfoBooking.preferred_gender}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Service Details
                </h4>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-medium text-foreground">{formatDate(clientInfoBooking.scheduled_date)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Scheduled Time:</span>
                      <p className="font-medium text-foreground">{formatTime(clientInfoBooking.start_time)} – {formatTime(clientInfoBooking.end_time)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hours:</span>
                      <p className="font-medium text-foreground">{clientInfoBooking.hours}h</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <p className="font-medium text-foreground">${clientInfoBooking.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PSW:</span>
                      <p className="font-medium text-foreground">{clientInfoBooking.psw_first_name || "Unassigned"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <BookingStatusIcon status={clientInfoBooking.status} pswAssigned={clientInfoBooking.psw_assigned} paymentStatus={clientInfoBooking.payment_status} size="sm" />
                        {getStatusBadge(clientInfoBooking.status, clientInfoBooking.psw_assigned, clientInfoBooking.payment_status)}
                      </div>
                    </div>
                  </div>

                  {/* Actual Clock-In / Clock-Out */}
                  {(clientInfoBooking.checked_in_at || clientInfoBooking.signed_out_at) && (
                    <div className="pt-2 border-t border-border/50 mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Actual Shift Times
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Clock-In:</span>
                          <p className="font-medium text-foreground">
                            {clientInfoBooking.checked_in_at 
                              ? format(new Date(clientInfoBooking.checked_in_at), "MMM d, h:mm a")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Clock-Out:</span>
                          <p className="font-medium text-foreground">
                            {clientInfoBooking.signed_out_at 
                              ? format(new Date(clientInfoBooking.signed_out_at), "MMM d, h:mm a")
                              : "—"}
                          </p>
                        </div>
                        {clientInfoBooking.checked_in_at && clientInfoBooking.signed_out_at && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Actual Duration:</span>
                            <p className="font-medium text-foreground">
                              {(() => {
                                const mins = Math.round((new Date(clientInfoBooking.signed_out_at!).getTime() - new Date(clientInfoBooking.checked_in_at!).getTime()) / 60000);
                                const h = Math.floor(mins / 60);
                                const m = mins % 60;
                                return `${h}h ${m}m`;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 pt-1">
                    {clientInfoBooking.service_type.map((svc, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{svc}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Care Conditions */}
              {clientInfoBooking.care_conditions && clientInfoBooking.care_conditions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">Care Conditions</h4>
                  <div className="flex flex-wrap gap-1">
                    {clientInfoBooking.care_conditions.map((cond, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{cond}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Notes */}
              {clientInfoBooking.special_notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Special Notes</h4>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg leading-relaxed">
                    {clientInfoBooking.special_notes}
                  </p>
                </div>
              )}

              {/* Cancel Order Button - visible for non-completed, non-cancelled orders */}
              {clientInfoBooking.status !== "completed" && clientInfoBooking.status !== "cancelled" && clientInfoBooking.status !== "archived" && (
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setCancelBooking(clientInfoBooking)}
                    className="gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Order
                  </Button>
                </div>
              )}

              {/* Adjust Time Button */}
              {(clientInfoBooking.status === "active" || clientInfoBooking.status === "in-progress" || clientInfoBooking.status === "completed") && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimeAdjustBooking(clientInfoBooking)}
                    className="gap-2"
                  >
                    <Timer className="w-4 h-4" />
                    Adjust Time
                  </Button>
                </div>
              )}

              {/* Invoice / Refund / Dispatch Panel */}
              <Separator />
              <BookingInvoicePanel
                bookingId={clientInfoBooking.id}
                bookingCode={clientInfoBooking.booking_code}
                clientEmail={clientInfoBooking.client_email}
                paymentStatus={clientInfoBooking.payment_status}
                status={clientInfoBooking.status}
                wasRefunded={clientInfoBooking.was_refunded ?? false}
                refundAmount={clientInfoBooking.refund_amount ?? undefined}
                refundReason={clientInfoBooking.refund_reason ?? undefined}
                careSheetStatus={clientInfoBooking.care_sheet_status ?? undefined}
                careSheetSubmittedAt={clientInfoBooking.care_sheet_submitted_at ?? undefined}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shift Time Adjustment Dialog */}
      {timeAdjustBooking && (
        <ShiftTimeAdjustmentDialog
          isOpen={!!timeAdjustBooking}
          onClose={() => setTimeAdjustBooking(null)}
          bookingId={timeAdjustBooking.id}
          bookingCode={timeAdjustBooking.booking_code}
          pswName={timeAdjustBooking.psw_first_name || "PSW"}
          clientName={timeAdjustBooking.client_name}
          originalClockIn={timeAdjustBooking.checked_in_at || undefined}
          originalClockOut={timeAdjustBooking.signed_out_at || undefined}
          onAdjusted={() => {
            setTimeAdjustBooking(null);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
};
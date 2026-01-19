// Order List Section - Displays orders with time filtering
// Weekly, Monthly, Yearly tabs with date selectors

import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, DollarSign, FileText, Search, User, ChevronLeft, ChevronRight } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears, addWeeks, addMonths, addYears } from "date-fns";

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
  client_email: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total: number;
  service_type: string[];
  psw_first_name: string | null;
  care_sheet: CareSheetData | null;
  care_sheet_submitted_at: string | null;
  care_sheet_psw_name: string | null;
}

type TimeFilter = "weekly" | "monthly" | "yearly";

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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    case "confirmed":
      return <Badge className="bg-blue-100 text-blue-700">Confirmed</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const OrderListSection = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("weekly");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCareSheet, setSelectedCareSheet] = useState<CareSheetData | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [timeFilter, selectedDate]);

  const getDateRange = () => {
    switch (timeFilter) {
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
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    
    const { data, error } = await supabase
      .from("bookings")
      .select("id, booking_code, client_name, client_email, scheduled_date, start_time, end_time, status, total, service_type, psw_first_name, care_sheet, care_sheet_submitted_at, care_sheet_psw_name")
      .gte("scheduled_date", format(start, "yyyy-MM-dd"))
      .lte("scheduled_date", format(end, "yyyy-MM-dd"))
      .order("scheduled_date", { ascending: false });

    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      // Type assertion for care_sheet since it's JSONB
      const typedBookings = (data || []).map(booking => ({
        ...booking,
        care_sheet: booking.care_sheet as unknown as CareSheetData | null,
      }));
      setBookings(typedBookings);
    }
    setLoading(false);
  };

  const navigatePeriod = (direction: "prev" | "next") => {
    const modifier = direction === "prev" ? -1 : 1;
    switch (timeFilter) {
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

  const getPeriodLabel = () => {
    const { start, end } = getDateRange();
    switch (timeFilter) {
      case "weekly":
        return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
      case "monthly":
        return format(selectedDate, "MMMM yyyy");
      case "yearly":
        return format(selectedDate, "yyyy");
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
    const completed = filteredBookings.filter(b => b.status === "completed").length;
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.total || 0), 0);
    const withCareSheet = filteredBookings.filter(b => b.care_sheet !== null).length;
    
    return { completed, totalRevenue, withCareSheet, total: filteredBookings.length };
  }, [filteredBookings]);

  const viewCareSheet = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedCareSheet(booking.care_sheet);
  };

  return (
    <div className="space-y-6">
      {/* Time Filter Tabs */}
      <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Period Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => navigatePeriod("prev")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">{getPeriodLabel()}</h3>
        <Button variant="outline" size="icon" onClick={() => navigatePeriod("next")}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by client name, order ID, or PSW..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Orders Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
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
                    <TableHead className="text-right">Care Sheet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-sm">
                        {booking.booking_code}
                      </TableCell>
                      <TableCell>{formatDate(booking.scheduled_date)}</TableCell>
                      <TableCell>
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </TableCell>
                      <TableCell>{booking.client_name}</TableCell>
                      <TableCell>{booking.psw_first_name || "-"}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>${booking.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {booking.care_sheet ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewCareSheet(booking)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
};
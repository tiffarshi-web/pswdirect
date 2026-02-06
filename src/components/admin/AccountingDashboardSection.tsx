import { useState, useEffect, useMemo } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from "date-fns";
import { DollarSign, TrendingUp, Receipt, Calculator, RefreshCw, Download, Calendar, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// HST rate for Ontario
const HST_RATE = 0.13;
// Platform commission rate (what platform keeps from booking total)
const PLATFORM_FEE_RATE = 0.20; // 20% platform fee

interface BookingRecord {
  id: string;
  booking_code: string;
  client_name: string;
  client_email: string;
  psw_first_name: string | null;
  scheduled_date: string;
  total: number;
  subtotal: number;
  surge_amount: number | null;
  payment_status: string;
  status: string;
  was_refunded: boolean | null;
  refund_amount: number | null;
  refunded_at: string | null;
  created_at: string;
  service_type: string[];
}

interface PayrollRecord {
  id: string;
  psw_name: string;
  total_owed: number;
  scheduled_date: string;
  status: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  bookingCode: string;
  customerName: string;
  pswName: string;
  grossAmount: number;
  taxAmount: number;
  pswPayout: number;
  platformFee: number;
  status: "completed" | "refunded" | "pending";
  refundAmount?: number;
}

type DatePreset = "today" | "this-week" | "this-month" | "this-year" | "custom";

export const AccountingDashboardSection = () => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("this-month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeView, setActiveView] = useState<"summary" | "ledger">("summary");

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "this-week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "this-month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "this-year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "custom":
        return {
          start: customStartDate ? parseISO(customStartDate) : startOfMonth(now),
          end: customEndDate ? parseISO(customEndDate) : endOfMonth(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [datePreset, customStartDate, customEndDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("scheduled_date", { ascending: false });

      if (bookingsError) throw bookingsError;
      setBookings((bookingsData as BookingRecord[]) || []);

      // Load payroll entries
      const { data: payrollData, error: payrollError } = await supabase
        .from("payroll_entries")
        .select("*")
        .order("scheduled_date", { ascending: false });

      if (payrollError) throw payrollError;
      setPayrollEntries((payrollData as PayrollRecord[]) || []);
    } catch (error) {
      console.error("Failed to load accounting data:", error);
      toast.error("Failed to load accounting data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter data by date range
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.scheduled_date);
      return isWithinInterval(bookingDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [bookings, dateRange]);

  const filteredPayroll = useMemo(() => {
    return payrollEntries.filter(entry => {
      const entryDate = parseISO(entry.scheduled_date);
      return isWithinInterval(entryDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [payrollEntries, dateRange]);

  // Calculate financial metrics
  const financialSummary = useMemo(() => {
    // Only count paid bookings
    const paidBookings = filteredBookings.filter(b => 
      b.payment_status === "paid" || b.payment_status === "completed"
    );

    // Gross revenue before any deductions
    const grossRevenue = paidBookings.reduce((sum, b) => sum + b.total, 0);

    // Calculate refunds
    const refundedBookings = paidBookings.filter(b => b.was_refunded);
    const totalRefunds = refundedBookings.reduce((sum, b) => sum + (b.refund_amount || b.total), 0);

    // Net revenue after refunds
    const netRevenue = grossRevenue - totalRefunds;

    // Tax calculations (HST is included in total, so we extract it)
    const taxCollected = paidBookings.reduce((sum, b) => {
      // Tax = total - (total / 1.13) = subtotal that includes tax - subtotal without tax
      const taxOnBooking = b.total - (b.total / (1 + HST_RATE));
      return sum + taxOnBooking;
    }, 0);

    // Refunded tax
    const refundedTax = refundedBookings.reduce((sum, b) => {
      const refundAmt = b.refund_amount || b.total;
      const taxOnRefund = refundAmt - (refundAmt / (1 + HST_RATE));
      return sum + taxOnRefund;
    }, 0);

    const netTaxCollected = taxCollected - refundedTax;

    // PSW Payouts from payroll entries
    const totalPayouts = filteredPayroll.reduce((sum, p) => sum + p.total_owed, 0);

    // Platform fee (what we keep after PSW payout)
    // Revenue (excluding tax) - PSW payouts = Platform profit
    const revenueExcludingTax = netRevenue / (1 + HST_RATE);
    const platformProfit = revenueExcludingTax - totalPayouts;

    return {
      grossRevenue,
      totalRefunds,
      netRevenue,
      taxCollected,
      refundedTax,
      netTaxCollected,
      totalPayouts,
      platformProfit,
      totalBookings: paidBookings.length,
      refundedCount: refundedBookings.length,
    };
  }, [filteredBookings, filteredPayroll]);

  // Generate ledger entries
  const ledgerEntries = useMemo((): LedgerEntry[] => {
    return filteredBookings
      .filter(b => b.payment_status === "paid" || b.payment_status === "completed" || b.was_refunded)
      .map(booking => {
        const grossAmount = booking.total;
        const taxAmount = grossAmount - (grossAmount / (1 + HST_RATE));
        const subtotalWithoutTax = grossAmount - taxAmount;
        
        // Find matching payroll entry for PSW payout
        const matchingPayroll = filteredPayroll.find(p => 
          p.scheduled_date === booking.scheduled_date && 
          p.psw_name?.toLowerCase().includes(booking.psw_first_name?.toLowerCase() || "")
        );
        const pswPayout = matchingPayroll?.total_owed || (subtotalWithoutTax * (1 - PLATFORM_FEE_RATE));
        const platformFee = subtotalWithoutTax - pswPayout;

        let status: "completed" | "refunded" | "pending" = "completed";
        if (booking.was_refunded) status = "refunded";
        else if (booking.status === "pending") status = "pending";

        return {
          id: booking.id,
          date: booking.scheduled_date,
          bookingCode: booking.booking_code,
          customerName: booking.client_name,
          pswName: booking.psw_first_name || "Unassigned",
          grossAmount,
          taxAmount,
          pswPayout,
          platformFee,
          status,
          refundAmount: booking.refund_amount || undefined,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredBookings, filteredPayroll]);

  const exportCSV = () => {
    const headers = ["Date", "Booking Code", "Customer", "PSW", "Gross", "Tax", "PSW Payout", "Platform Fee", "Status"];
    const rows = ledgerEntries.map(entry => [
      format(parseISO(entry.date), "yyyy-MM-dd"),
      entry.bookingCode,
      entry.customerName,
      entry.pswName,
      entry.grossAmount.toFixed(2),
      entry.taxAmount.toFixed(2),
      entry.pswPayout.toFixed(2),
      entry.platformFee.toFixed(2),
      entry.status,
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accounting-ledger-${format(dateRange.start, "yyyy-MM-dd")}-to-${format(dateRange.end, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ledger exported successfully!");
  };

  const getStatusBadge = (status: LedgerEntry["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case "refunded":
        return <Badge variant="destructive">Refunded</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Accounting Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Financial overview, tax tracking, and payment ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="brand" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Preset</Label>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {datePreset === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
              </>
            )}

            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {format(dateRange.start, "MMM d, yyyy")} – {format(dateRange.end, "MMM d, yyyy")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              ${financialSummary.netRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Gross: ${financialSummary.grossRevenue.toFixed(2)}
              {financialSummary.totalRefunds > 0 && (
                <span className="text-red-500"> (-${financialSummary.totalRefunds.toFixed(2)})</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Receipt className="w-4 h-4" />
              <span className="text-xs font-medium">Total PSW Payouts</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              ${financialSummary.totalPayouts.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredPayroll.length} payroll entries
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <Calculator className="w-4 h-4" />
              <span className="text-xs font-medium">Tax Collected (HST)</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              ${financialSummary.netTaxCollected.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {financialSummary.refundedTax > 0 && (
                <span>Refunded: -${financialSummary.refundedTax.toFixed(2)}</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Net Platform Profit</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              ${financialSummary.platformProfit.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              After payouts & taxes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-muted rounded-lg text-center">
          <p className="text-xl font-bold text-foreground">{financialSummary.totalBookings}</p>
          <p className="text-xs text-muted-foreground">Total Orders</p>
        </div>
        <div className="p-3 bg-muted rounded-lg text-center">
          <p className="text-xl font-bold text-foreground">{filteredPayroll.length}</p>
          <p className="text-xs text-muted-foreground">Payroll Entries</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-center">
          <p className="text-xl font-bold text-red-600">{financialSummary.refundedCount}</p>
          <p className="text-xs text-muted-foreground">Refunded</p>
        </div>
        <div className="p-3 bg-muted rounded-lg text-center">
          <p className="text-xl font-bold text-foreground">
            {financialSummary.totalBookings > 0 
              ? `$${(financialSummary.netRevenue / financialSummary.totalBookings).toFixed(2)}`
              : "$0.00"
            }
          </p>
          <p className="text-xs text-muted-foreground">Avg Order Value</p>
        </div>
      </div>

      {/* Payment Ledger */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Payment Ledger
          </CardTitle>
          <CardDescription>
            Detailed transaction log with tax breakdown and refund tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {ledgerEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No transactions found for selected period</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>PSW</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Tax (HST)</TableHead>
                    <TableHead className="text-right">PSW Payout</TableHead>
                    <TableHead className="text-right">Platform Fee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry) => (
                    <TableRow 
                      key={entry.id}
                      className={entry.status === "refunded" ? "bg-red-50/50 dark:bg-red-950/10" : ""}
                    >
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(parseISO(entry.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.bookingCode}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.customerName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.pswName}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${entry.grossAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        ${entry.taxAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        ${entry.pswPayout.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${entry.platformFee.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry.status)}
                        {entry.status === "refunded" && entry.refundAmount && (
                          <span className="text-xs text-red-500 ml-1">
                            -${entry.refundAmount.toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Refund Summary */}
      {financialSummary.refundedCount > 0 && (
        <Card className="shadow-card border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-red-600 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Refund Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{financialSummary.refundedCount}</p>
                <p className="text-xs text-muted-foreground">Refunded Orders</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">-${financialSummary.totalRefunds.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Refunded</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">-${financialSummary.refundedTax.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Tax Returned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Order Statistics Dashboard
import { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Calendar,
  BarChart3,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  format,
  parseISO
} from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageValue: number;
  pendingOrders: number;
  confirmedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  serviceBreakdown: { service: string; count: number }[];
}

const COLORS = ["#16a34a", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export const OrderStatisticsSection = () => {
  const [weeklyStats, setWeeklyStats] = useState<OrderStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<OrderStats | null>(null);
  const [yearlyStats, setYearlyStats] = useState<OrderStats | null>(null);
  const [previousWeekStats, setPreviousWeekStats] = useState<OrderStats | null>(null);
  const [previousMonthStats, setPreviousMonthStats] = useState<OrderStats | null>(null);
  const [previousYearStats, setPreviousYearStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  const calculateStats = (bookings: any[]): OrderStats => {
    const totalOrders = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
    const averageValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const pendingOrders = bookings.filter(b => b.status === "pending").length;
    const confirmedOrders = bookings.filter(b => b.status === "confirmed").length;
    const completedOrders = bookings.filter(b => b.status === "completed").length;
    const cancelledOrders = bookings.filter(b => b.status === "cancelled").length;
    
    // Service breakdown
    const serviceCounts: Record<string, number> = {};
    bookings.forEach(b => {
      (b.service_type || []).forEach((service: string) => {
        serviceCounts[service] = (serviceCounts[service] || 0) + 1;
      });
    });
    
    const serviceBreakdown = Object.entries(serviceCounts)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalOrders,
      totalRevenue,
      averageValue,
      pendingOrders,
      confirmedOrders,
      completedOrders,
      cancelledOrders,
      serviceBreakdown,
    };
  };

  const fetchStats = async () => {
    setLoading(true);
    const now = new Date();

    try {
      // Current periods
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);

      // Previous periods
      const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const prevMonthEnd = endOfMonth(subMonths(now, 1));
      const prevYearStart = startOfYear(subYears(now, 1));
      const prevYearEnd = endOfYear(subYears(now, 1));

      // Fetch all bookings
      const { data: allBookings, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const bookings = allBookings || [];

      // Filter by date ranges
      const filterByDate = (start: Date, end: Date) => 
        bookings.filter(b => {
          const date = parseISO(b.scheduled_date);
          return date >= start && date <= end;
        });

      setWeeklyStats(calculateStats(filterByDate(weekStart, weekEnd)));
      setMonthlyStats(calculateStats(filterByDate(monthStart, monthEnd)));
      setYearlyStats(calculateStats(filterByDate(yearStart, yearEnd)));
      setPreviousWeekStats(calculateStats(filterByDate(prevWeekStart, prevWeekEnd)));
      setPreviousMonthStats(calculateStats(filterByDate(prevMonthStart, prevMonthEnd)));
      setPreviousYearStats(calculateStats(filterByDate(prevYearStart, prevYearEnd)));

    } catch (error) {
      console.error("Failed to fetch order stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getPercentChange = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const renderStatsCard = (
    title: string,
    stats: OrderStats | null,
    previousStats: OrderStats | null
  ) => {
    if (!stats) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No data available
        </div>
      );
    }

    const revenueChange = previousStats 
      ? getPercentChange(stats.totalRevenue, previousStats.totalRevenue) 
      : null;
    const ordersChange = previousStats 
      ? getPercentChange(stats.totalOrders, previousStats.totalOrders) 
      : null;

    const statusData = [
      { name: "Pending", value: stats.pendingOrders, color: "#f59e0b" },
      { name: "Confirmed", value: stats.confirmedOrders, color: "#3b82f6" },
      { name: "Completed", value: stats.completedOrders, color: "#16a34a" },
      { name: "Cancelled", value: stats.cancelledOrders, color: "#ef4444" },
    ].filter(d => d.value > 0);

    return (
      <div className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm">Total Orders</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
              {ordersChange && (
                <div className={`flex items-center gap-1 text-xs ${ordersChange.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                  {ordersChange.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {ordersChange.value.toFixed(1)}% vs previous
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              {revenueChange && (
                <div className={`flex items-center gap-1 text-xs ${revenueChange.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                  {revenueChange.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {revenueChange.value.toFixed(1)}% vs previous
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Avg Order Value</span>
              </div>
              <p className="text-2xl font-bold">${stats.averageValue.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Completed</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.completedOrders}</p>
              <p className="text-xs text-muted-foreground">
                {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(0) : 0}% completion rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No orders</p>
              )}
            </CardContent>
          </Card>

          {/* Service Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Services Booked</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.serviceBreakdown.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.serviceBreakdown.slice(0, 5)} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="service" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No services</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Order Statistics
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revenue and order analytics by time period
        </p>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">This Week</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
          <TabsTrigger value="yearly">This Year</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-6">
          {renderStatsCard("Weekly", weeklyStats, previousWeekStats)}
        </TabsContent>

        <TabsContent value="monthly" className="mt-6">
          {renderStatsCard("Monthly", monthlyStats, previousMonthStats)}
        </TabsContent>

        <TabsContent value="yearly" className="mt-6">
          {renderStatsCard("Yearly", yearlyStats, previousYearStats)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

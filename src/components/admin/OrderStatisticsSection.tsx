// Order Statistics Dashboard
import { useState, useEffect } from "react";
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Calendar,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Ban
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export const OrderStatisticsSection = () => {
  const [weeklyStats, setWeeklyStats] = useState<OrderStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<OrderStats | null>(null);
  const [yearlyStats, setYearlyStats] = useState<OrderStats | null>(null);
  const [previousWeekStats, setPreviousWeekStats] = useState<OrderStats | null>(null);
  const [previousMonthStats, setPreviousMonthStats] = useState<OrderStats | null>(null);
  const [previousYearStats, setPreviousYearStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  const calculateStats = (bookings: any[]): OrderStats => {
    // Separate cancelled from operational bookings
    const cancelledOrders = bookings.filter(b => b.status === "cancelled").length;
    const operationalBookings = bookings.filter(b => b.status !== "cancelled");

    const totalOrders = operationalBookings.length;
    const totalRevenue = operationalBookings.reduce((sum, b) => sum + (b.total || 0), 0);
    const averageValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const pendingOrders = operationalBookings.filter(b => b.status === "pending").length;
    const confirmedOrders = operationalBookings.filter(b => b.status === "confirmed").length;
    const completedOrders = operationalBookings.filter(b => b.status === "completed").length;
    
    // Service breakdown — operational only
    const serviceCounts: Record<string, number> = {};
    operationalBookings.forEach(b => {
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
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);

      const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const prevMonthEnd = endOfMonth(subMonths(now, 1));
      const prevYearStart = startOfYear(subYears(now, 1));
      const prevYearEnd = endOfYear(subYears(now, 1));

      const { data: allBookings, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const bookings = allBookings || [];

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
    _title: string,
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

    // Pie chart shows only operational statuses (no cancelled)
    const statusData = [
      { name: "Pending", value: stats.pendingOrders, color: "#f59e0b" },
      { name: "Confirmed", value: stats.confirmedOrders, color: "#3b82f6" },
      { name: "Completed", value: stats.completedOrders, color: "#16a34a" },
    ].filter(d => d.value > 0);

    return (
      <div className="space-y-6">
        {/* Main Operational Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm">Active Orders</span>
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
                <span className="text-sm">Revenue</span>
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

        {/* Cancelled — secondary metric */}
        {stats.cancelledOrders > 0 && (
          <Card className="border-dashed border-red-200 bg-red-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Ban className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-600">
                    {stats.cancelledOrders} cancelled order{stats.cancelledOrders !== 1 ? "s" : ""} (excluded from stats above)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Breakdown — operational only */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Order Status (Operational)</CardTitle>
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
                        {statusData.map((entry) => (
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
          Revenue and order analytics by time period (excludes cancelled orders)
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

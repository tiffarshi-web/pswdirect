import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Calendar, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isAfter } from "date-fns";

interface UnservedOrder {
  id: string;
  created_at: string;
  service_type: string | null;
  requested_start_time: string | null;
  city: string | null;
  postal_code_raw: string | null;
  postal_fsa: string | null;
  radius_checked_km: number | null;
  psw_count_found: number;
  reason: string;
}

export const UnservedRequestsSection = () => {
  const [orders, setOrders] = useState<UnservedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("30");
  const [cityFilter, setCityFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  const loadData = async () => {
    setLoading(true);
    const since = subDays(new Date(), 90).toISOString();
    const { data, error } = await (supabase as any)
      .from("unserved_orders")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(dateFilter));
    return orders.filter(o => {
      if (!isAfter(new Date(o.created_at), cutoff)) return false;
      if (cityFilter !== "all" && o.city !== cityFilter) return false;
      if (serviceFilter !== "all" && o.service_type !== serviceFilter) return false;
      return true;
    });
  }, [orders, dateFilter, cityFilter, serviceFilter]);

  const last7 = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return orders.filter(o => isAfter(new Date(o.created_at), cutoff)).length;
  }, [orders]);

  const last30 = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return orders.filter(o => isAfter(new Date(o.created_at), cutoff)).length;
  }, [orders]);

  const topCity = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.city) counts[o.city] = (counts[o.city] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1]})` : "—";
  }, [orders]);

  const topFSA = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.postal_fsa) counts[o.postal_fsa] = (counts[o.postal_fsa] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1]})` : "—";
  }, [orders]);

  const uniqueCities = useMemo(() => {
    const cities = [...new Set(orders.map(o => o.city).filter(Boolean))] as string[];
    return cities.sort();
  }, [orders]);

  const uniqueServices = useMemo(() => {
    const services = [...new Set(orders.map(o => o.service_type).filter(Boolean))] as string[];
    return services.sort();
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              Last 7 Days
            </div>
            <p className="text-2xl font-bold text-destructive">{last7}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              Last 30 Days
            </div>
            <p className="text-2xl font-bold text-foreground">{last30}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="w-4 h-4" />
              Top City
            </div>
            <p className="text-lg font-semibold text-foreground truncate">{topCity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              Top FSA
            </div>
            <p className="text-lg font-semibold text-foreground truncate">{topFSA}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {uniqueCities.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {uniqueServices.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Unserved Requests ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>FSA</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Radius (km)</TableHead>
                  <TableHead>PSWs Found</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No unserved requests in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(order.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{order.city || "—"}</TableCell>
                      <TableCell>
                        {order.postal_fsa ? (
                          <Badge variant="outline">{order.postal_fsa}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{order.service_type || "—"}</TableCell>
                      <TableCell>{order.radius_checked_km ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{order.psw_count_found}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.reason}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Clock, DollarSign, CheckCircle, Banknote, ArrowRight } from "lucide-react";
import { useUpcomingEarnings, type UpcomingShift } from "@/hooks/useUpcomingEarnings";
import { type PayrollEntryRow } from "@/hooks/usePayoutRequests";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Toronto now helper */
const torontoNow = (): Date => {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Toronto" });
  return new Date(s);
};

interface EarningsForecastProps {
  pswId: string | undefined;
  eligibleTotal: number;
  eligibleCount: number;
  pendingTotal: number;
  pendingCount: number;
  paidThisMonth: number;
  paidYTD: number;
  entries: PayrollEntryRow[];
}

export const EarningsForecast = ({
  pswId, eligibleTotal, eligibleCount, pendingTotal, pendingCount,
  paidThisMonth, paidYTD, entries,
}: EarningsForecastProps) => {
  const { next7, next30, total7, total30, shifts, loading } = useUpcomingEarnings(pswId);
  const [shiftView, setShiftView] = useState<"7" | "30">("7");

  // Payday countdown
  const now = torontoNow();
  const dow = now.getDay(); // 0=Sun, 4=Thu
  const daysUntilThursday = dow <= 4 ? 4 - dow : 7 - dow + 4;
  const isThursday = dow === 4;

  // Becoming eligible soon: entries completed but not yet 14 days old
  const soonEligibleTotal = entries.filter(e => {
    if (e.payout_request_id || e.status === "cleared" || !e.completed_at) return false;
    const completedAt = new Date(e.completed_at);
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 14);
    return completedAt > cutoff;
  }).reduce((s, e) => s + e.total_owed, 0);

  const displayShifts = shiftView === "7" ? next7 : next30;

  return (
    <div className="space-y-4">
      {/* Payday Countdown */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {isThursday ? "🎉 Today is Payday!" : `Next request day: Thursday`}
              </p>
              {!isThursday && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {daysUntilThursday} day{daysUntilThursday !== 1 ? "s" : ""} away
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Eligible now</p>
              <p className="text-lg font-bold text-foreground">${eligibleTotal.toFixed(2)}</p>
              {soonEligibleTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  +${soonEligibleTotal.toFixed(2)} in next 14 days
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6-card summary grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-medium text-indigo-700">Next 7 Days</span>
            </div>
            <p className="text-lg font-bold text-indigo-800">${total7.toFixed(2)}</p>
            <p className="text-[10px] text-indigo-600">{next7.length} shifts</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-[11px] font-medium text-violet-700">Next 30 Days</span>
            </div>
            <p className="text-lg font-bold text-violet-800">${total30.toFixed(2)}</p>
            <p className="text-[10px] text-violet-600">{next30.length} shifts</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-medium text-emerald-700">Available to Request</span>
            </div>
            <p className="text-lg font-bold text-emerald-800">${eligibleTotal.toFixed(2)}</p>
            <p className="text-[10px] text-emerald-600">{eligibleCount} shifts</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-medium text-amber-700">In Payout Processing</span>
            </div>
            <p className="text-lg font-bold text-amber-800">${pendingTotal.toFixed(2)}</p>
            <p className="text-[10px] text-amber-600">{pendingCount} shifts</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-medium text-blue-700">Paid This Month</span>
            </div>
            <p className="text-lg font-bold text-blue-800">${paidThisMonth.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Banknote className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-[11px] font-medium text-purple-700">Paid YTD</span>
            </div>
            <p className="text-lg font-bold text-purple-800">${paidYTD.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts Table */}
      {!loading && shifts.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 pb-2">
              <h3 className="text-sm font-semibold text-foreground">Upcoming Shift Earnings</h3>
              <div className="flex gap-1">
                <Button
                  variant={shiftView === "7" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setShiftView("7")}
                >7 days</Button>
                <Button
                  variant={shiftView === "30" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setShiftView("30")}
                >30 days</Button>
              </div>
            </div>
            {displayShifts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No shifts in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Client</TableHead>
                      <TableHead className="text-xs">Hrs</TableHead>
                      <TableHead className="text-xs">Est.</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayShifts.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs">{s.scheduledDate}</TableCell>
                        <TableCell className="text-xs">{s.clientName}</TableCell>
                        <TableCell className="text-xs">{s.hours}h</TableCell>
                        <TableCell className="text-xs font-medium">${s.estimatedTotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge>
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
    </div>
  );
};

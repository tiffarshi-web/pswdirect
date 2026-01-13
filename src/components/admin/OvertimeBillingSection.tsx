import { useState, useEffect } from "react";
import { Clock, AlertTriangle, User, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOvertimeShifts, type ShiftRecord } from "@/lib/shiftStore";
import { toast } from "sonner";

export const OvertimeBillingSection = () => {
  const [overtimeShifts, setOvertimeShifts] = useState<ShiftRecord[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadOvertimeShifts = () => {
      const shifts = getOvertimeShifts();
      setOvertimeShifts(shifts);
    };

    loadOvertimeShifts();
    // Refresh every 10 seconds
    const interval = setInterval(loadOvertimeShifts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkBilled = (shiftId: string) => {
    setProcessedIds(prev => new Set([...prev, shiftId]));
    toast.success("Shift marked as billed for overtime");
  };

  const pendingShifts = overtimeShifts.filter(s => !processedIds.has(s.id));

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Overtime Billing Queue
          </CardTitle>
          <CardDescription>
            Shifts that ran 15+ minutes over scheduled time are automatically flagged here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingShifts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No overtime shifts to process</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="p-4 border border-amber-200 bg-amber-50 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono font-bold text-amber-800">{shift.id}</p>
                      <p className="text-sm text-amber-700">{shift.clientName}</p>
                    </div>
                    <Badge className="bg-amber-500 text-white">
                      +{shift.overtimeMinutes} min overtime
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-amber-700">
                      <Calendar className="w-3 h-3" />
                      {shift.scheduledDate}
                    </div>
                    <div className="flex items-center gap-1 text-amber-700">
                      <Clock className="w-3 h-3" />
                      Ended {shift.overtimeMinutes}min late
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-800">{shift.pswName}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-amber-700 border-amber-300 hover:bg-amber-100"
                      onClick={() => handleMarkBilled(shift.id)}
                    >
                      <DollarSign className="w-3.5 h-3.5 mr-1" />
                      Mark as Billed
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

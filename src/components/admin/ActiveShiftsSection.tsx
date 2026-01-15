import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { getShifts, type ShiftRecord, type CareSheetData } from "@/lib/shiftStore";
import { format } from "date-fns";

export const ActiveShiftsSection = () => {
  const [activeShifts, setActiveShifts] = useState<ShiftRecord[]>([]);
  const [claimedShifts, setClaimedShifts] = useState<ShiftRecord[]>([]);
  const [completedShifts, setCompletedShifts] = useState<ShiftRecord[]>([]);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});
  const [selectedCareSheet, setSelectedCareSheet] = useState<{ shift: ShiftRecord; data: CareSheetData } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadShifts = () => {
    const shifts = getShifts();
    setActiveShifts(shifts.filter(s => s.status === "checked-in"));
    setClaimedShifts(shifts.filter(s => s.status === "claimed"));
    // Show recently completed shifts (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    setCompletedShifts(shifts.filter(s => s.status === "completed" && s.signedOutAt && s.signedOutAt > oneDayAgo));
  };

  useEffect(() => {
    loadShifts();
    const interval = setInterval(loadShifts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Update elapsed times every second
  useEffect(() => {
    const updateElapsed = () => {
      const now = Date.now();
      const newElapsed: Record<string, number> = {};
      activeShifts.forEach(shift => {
        if (shift.checkedInAt) {
          const startTime = new Date(shift.checkedInAt).getTime();
          newElapsed[shift.id] = Math.floor((now - startTime) / 1000);
        }
      });
      setElapsedTimes(newElapsed);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeShifts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadShifts();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (isoString: string): string => {
    return format(new Date(isoString), "MMM d, h:mm a");
  };

  const ShiftCard = ({ shift, type }: { shift: ShiftRecord; type: "active" | "claimed" | "completed" }) => (
    <Card className={`${type === "active" ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : type === "completed" ? "border-muted" : "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {type === "active" && (
              <Badge variant="default" className="bg-green-600 animate-pulse">
                <Play className="w-3 h-3 mr-1" />
                In Progress
              </Badge>
            )}
            {type === "claimed" && (
              <Badge variant="secondary" className="bg-yellow-500 text-white">
                <Clock className="w-3 h-3 mr-1" />
                Pending Check-in
              </Badge>
            )}
            {type === "completed" && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
            {shift.flaggedForOvertime && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                +{shift.overtimeMinutes}min OT
              </Badge>
            )}
          </div>
          {type === "active" && elapsedTimes[shift.id] !== undefined && (
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Elapsed</span>
              <p className="font-mono text-lg font-bold text-green-600">
                {formatTime(elapsedTimes[shift.id])}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">PSW: {shift.pswName || "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span>Client: {shift.clientName}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{shift.patientAddress}</span>
          </div>
          {shift.clientPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{shift.clientPhone}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {shift.scheduledDate} • {shift.scheduledStart} - {shift.scheduledEnd}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {shift.services.map((service, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {service}
            </Badge>
          ))}
        </div>

        {type === "active" && shift.checkedInAt && (
          <p className="text-xs text-muted-foreground mt-3">
            Checked in: {formatDateTime(shift.checkedInAt)}
          </p>
        )}

        {type === "completed" && shift.careSheet && (
          <div className="mt-3 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setSelectedCareSheet({ shift, data: shift.careSheet! })}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Care Sheet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CareSheetDialog = () => {
    if (!selectedCareSheet) return null;
    const { shift, data } = selectedCareSheet;

    return (
      <Dialog open={!!selectedCareSheet} onOpenChange={() => setSelectedCareSheet(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Care Sheet - {shift.clientName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">PSW</p>
                <p className="font-medium">{shift.pswName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{shift.scheduledDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Signed Out</p>
                <p className="font-medium">{shift.signedOutAt ? formatDateTime(shift.signedOutAt) : "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{shift.scheduledStart} - {shift.scheduledEnd}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Mood Assessment</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-muted-foreground text-xs">On Arrival</p>
                  <p className="font-medium capitalize">{data.moodOnArrival}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-muted-foreground text-xs">On Departure</p>
                  <p className="font-medium capitalize">{data.moodOnDeparture}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Tasks Completed</h4>
              <div className="flex flex-wrap gap-1">
                {data.tasksCompleted.map((task, i) => (
                  <Badge key={i} variant="secondary">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {task}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Observations</h4>
              <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
                {data.observations || "No observations recorded"}
              </p>
            </div>

            {data.isHospitalDischarge && (
              <>
                <Separator />
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <FileText className="w-4 h-4" />
                    Hospital Discharge Protocol
                  </h4>
                  {data.dischargeDocuments && (
                    <p className="text-sm text-muted-foreground mb-2">
                      📎 Discharge documents attached
                    </p>
                  )}
                  {data.dischargeNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notes:</p>
                      <p className="text-sm">{data.dischargeNotes}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {shift.flaggedForOvertime && (
              <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
                <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Overtime: {shift.overtimeMinutes} minutes past scheduled end
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Active Shifts</h2>
          <p className="text-muted-foreground">Real-time monitoring of all in-progress shifts</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Active Shifts - In Progress */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Play className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold">In Progress ({activeShifts.length})</h3>
        </div>
        {activeShifts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              No active shifts at the moment
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeShifts.map(shift => (
              <ShiftCard key={shift.id} shift={shift} type="active" />
            ))}
          </div>
        )}
      </div>

      {/* Claimed Shifts - Pending Check-in */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold">Pending Check-in ({claimedShifts.length})</h3>
        </div>
        {claimedShifts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              No shifts pending check-in
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {claimedShifts.map(shift => (
              <ShiftCard key={shift.id} shift={shift} type="claimed" />
            ))}
          </div>
        )}
      </div>

      {/* Recently Completed Shifts */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Recently Completed ({completedShifts.length})</h3>
          <span className="text-xs text-muted-foreground">(Last 24 hours)</span>
        </div>
        {completedShifts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              No recently completed shifts
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid gap-4 md:grid-cols-2 pr-4">
              {completedShifts.map(shift => (
                <ShiftCard key={shift.id} shift={shift} type="completed" />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <CareSheetDialog />
    </div>
  );
};

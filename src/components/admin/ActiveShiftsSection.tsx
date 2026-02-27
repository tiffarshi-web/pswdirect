import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, Clock, MapPin, Phone, User, FileText, CheckCircle,
  AlertTriangle, RefreshCw, Square, LogIn, LogOut, ShieldAlert, Navigation
} from "lucide-react";
import { 
  getAllActiveShiftsAsync, adminStopShift, adminManualCheckIn, adminManualSignOut, 
  type ShiftRecord, type CareSheetData 
} from "@/lib/shiftStore";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { PSWLiveMapDialog } from "./PSWLiveMapDialog";

export const ActiveShiftsSection = () => {
  const { user } = useAuth();
  const [activeShifts, setActiveShifts] = useState<ShiftRecord[]>([]);
  const [claimedShifts, setClaimedShifts] = useState<ShiftRecord[]>([]);
  const [completedShifts, setCompletedShifts] = useState<ShiftRecord[]>([]);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});
  const [selectedCareSheet, setSelectedCareSheet] = useState<{ shift: ShiftRecord; data: CareSheetData } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stopShiftDialog, setStopShiftDialog] = useState<ShiftRecord | null>(null);
  const [stopReason, setStopReason] = useState("");
  
  const [manualCheckInDialog, setManualCheckInDialog] = useState<ShiftRecord | null>(null);
  const [manualCheckOutDialog, setManualCheckOutDialog] = useState<ShiftRecord | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [liveMapShift, setLiveMapShift] = useState<ShiftRecord | null>(null);
  
  const { toast } = useToast();

  const loadShifts = async () => {
    const result = await getAllActiveShiftsAsync();
    setActiveShifts(result.active);
    setClaimedShifts(result.claimed);
    setCompletedShifts(result.completed);
  };

  useEffect(() => {
    loadShifts();
    const interval = setInterval(loadShifts, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadShifts();
    setIsRefreshing(false);
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

  const isRushShift = (shift: ShiftRecord): boolean => {
    return (shift as any).isAsap === true || 
           (shift as any).is_asap === true ||
           shift.services.some(s => s.toLowerCase().includes("rush") || s.toLowerCase().includes("asap"));
  };

  const isUrbanShift = (shift: ShiftRecord): boolean => {
    const hasUrbanService = shift.services.some(s => 
      s.toLowerCase().includes("hospital") || s.toLowerCase().includes("doctor")
    );
    const isToronto = shift.patientAddress?.toLowerCase().includes("toronto") ||
                      shift.patientAddress?.match(/^M[0-9]/i) !== null;
    return hasUrbanService && isToronto;
  };

  const handleStopShift = async () => {
    if (!stopShiftDialog) return;
    const result = await adminStopShift(stopShiftDialog.id, stopReason);
    if (result) {
      toast({ title: "Shift stopped", description: `Shift for ${stopShiftDialog.clientName} has been stopped.` });
      loadShifts();
    } else {
      toast({ title: "Error", description: "Failed to stop shift.", variant: "destructive" });
    }
    setStopShiftDialog(null);
    setStopReason("");
  };

  const handleManualCheckIn = async () => {
    if (!manualCheckInDialog || !confirmOverride) return;
    const result = await adminManualCheckIn(manualCheckInDialog.id, user?.email || "admin", overrideReason);
    if (result) {
      toast({ title: "Manual check-in completed", description: `${manualCheckInDialog.pswName} has been checked in.` });
      loadShifts();
    } else {
      toast({ title: "Error", description: "Failed to perform manual check-in.", variant: "destructive" });
    }
    setManualCheckInDialog(null);
    setOverrideReason("");
    setConfirmOverride(false);
  };

  const handleManualCheckOut = async () => {
    if (!manualCheckOutDialog || !confirmOverride) return;
    const result = await adminManualSignOut(manualCheckOutDialog.id, user?.email || "admin", overrideReason);
    if (result) {
      toast({ title: "Manual sign-out completed", description: `${manualCheckOutDialog.pswName} has been signed out.` });
      loadShifts();
    } else {
      toast({ title: "Error", description: "Failed to perform manual sign-out.", variant: "destructive" });
    }
    setManualCheckOutDialog(null);
    setOverrideReason("");
    setConfirmOverride(false);
  };

  const ShiftCard = ({ shift, type }: { shift: ShiftRecord; type: "active" | "claimed" | "completed" }) => {
    const rushShift = isRushShift(shift);
    const urbanShift = isUrbanShift(shift);

    return (
      <Card className={`${type === "active" ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : type === "completed" ? "border-muted" : "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20"}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {type === "active" && (
                <Badge variant="default" className="bg-green-600 animate-pulse">
                  <Play className="w-3 h-3 mr-1" />In Progress
                </Badge>
              )}
              {type === "claimed" && (
                <Badge variant="secondary" className="bg-yellow-500 text-white">
                  <Clock className="w-3 h-3 mr-1" />Pending Check-in
                </Badge>
              )}
              {type === "completed" && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />Completed
                </Badge>
              )}
              {rushShift && <Badge className="bg-red-100 text-red-700 border-red-300">⚡ Rush</Badge>}
              {urbanShift && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">🏙️ Urban</Badge>}
              {shift.flaggedForOvertime && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />+{shift.overtimeMinutes}min OT
                </Badge>
              )}
            </div>
            {type === "active" && elapsedTimes[shift.id] !== undefined && (
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Elapsed</span>
                <p className="font-mono text-lg font-bold text-green-600">{formatTime(elapsedTimes[shift.id])}</p>
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
              <span className="text-sm">{shift.scheduledDate} • {shift.scheduledStart} - {shift.scheduledEnd}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-3">
            {shift.services.map((service, i) => (
              <Badge key={i} variant="outline" className="text-xs">{service}</Badge>
            ))}
          </div>

          {type === "claimed" && shift.pswName && (
            <div className="mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" className="w-full text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={() => setManualCheckInDialog(shift)}>
                <LogIn className="w-4 h-4 mr-2" />Manual Sign-In
              </Button>
            </div>
          )}

          {type === "active" && shift.checkedInAt && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">Checked in: {formatDateTime(shift.checkedInAt)}</p>
              <Button variant="outline" size="sm" className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                onClick={() => setLiveMapShift(shift)}>
                <Navigation className="w-4 h-4 mr-2" />View Live Map
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                  onClick={() => setManualCheckOutDialog(shift)}>
                  <LogOut className="w-4 h-4 mr-1" />Manual Sign-Out
                </Button>
                <Button variant="destructive" size="sm" className="flex-1"
                  onClick={() => setStopShiftDialog(shift)}>
                  <Square className="w-4 h-4 mr-1" />Stop Shift
                </Button>
              </div>
            </div>
          )}

          {type === "completed" && shift.careSheet && (
            <div className="mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" className="w-full"
                onClick={() => setSelectedCareSheet({ shift, data: shift.careSheet! })}>
                <FileText className="w-4 h-4 mr-2" />View Care Sheet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
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
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Active Shifts */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Play className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold">In Progress ({activeShifts.length})</h3>
        </div>
        {activeShifts.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-muted-foreground">No active shifts at the moment</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeShifts.map(shift => <ShiftCard key={shift.id} shift={shift} type="active" />)}
          </div>
        )}
      </div>

      {/* Claimed Shifts */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold">Pending Check-in ({claimedShifts.length})</h3>
        </div>
        {claimedShifts.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-muted-foreground">No shifts pending check-in</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {claimedShifts.map(shift => <ShiftCard key={shift.id} shift={shift} type="claimed" />)}
          </div>
        )}
      </div>

      {/* Recently Completed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Recently Completed ({completedShifts.length})</h3>
          <span className="text-xs text-muted-foreground">(Last 24 hours)</span>
        </div>
        {completedShifts.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-muted-foreground">No recently completed shifts</CardContent></Card>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid gap-4 md:grid-cols-2 pr-4">
              {completedShifts.map(shift => <ShiftCard key={shift.id} shift={shift} type="completed" />)}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Care Sheet Dialog */}
      <Dialog open={!!selectedCareSheet} onOpenChange={() => setSelectedCareSheet(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />Care Sheet - {selectedCareSheet?.shift.clientName}
            </DialogTitle>
          </DialogHeader>
          {selectedCareSheet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">PSW</p><p className="font-medium">{selectedCareSheet.shift.pswName}</p></div>
                <div><p className="text-muted-foreground">Date</p><p className="font-medium">{selectedCareSheet.shift.scheduledDate}</p></div>
                <div><p className="text-muted-foreground">Signed Out</p><p className="font-medium">{selectedCareSheet.shift.signedOutAt ? formatDateTime(selectedCareSheet.shift.signedOutAt) : "-"}</p></div>
                <div><p className="text-muted-foreground">Duration</p><p className="font-medium">{selectedCareSheet.shift.scheduledStart} - {selectedCareSheet.shift.scheduledEnd}</p></div>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Mood Assessment</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground text-xs">On Arrival</p><p className="font-medium capitalize">{selectedCareSheet.data.moodOnArrival}</p></div>
                  <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground text-xs">On Departure</p><p className="font-medium capitalize">{selectedCareSheet.data.moodOnDeparture}</p></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Tasks Completed</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedCareSheet.data.tasksCompleted.map((task, i) => (
                    <Badge key={i} variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />{task}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Observations</h4>
                <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">{selectedCareSheet.data.observations || "No observations recorded"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stop Shift Dialog */}
      <Dialog open={!!stopShiftDialog} onOpenChange={() => { setStopShiftDialog(null); setStopReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Square className="w-5 h-5" />Stop Shift
            </DialogTitle>
            <DialogDescription>This will immediately end the shift for {stopShiftDialog?.pswName}.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for stopping shift..." value={stopReason} onChange={(e) => setStopReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopShiftDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleStopShift}>Stop Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Check-In Dialog */}
      <Dialog open={!!manualCheckInDialog} onOpenChange={() => { setManualCheckInDialog(null); setOverrideReason(""); setConfirmOverride(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />Manual Sign-In Override
            </DialogTitle>
            <DialogDescription>This bypasses GPS geofencing for {manualCheckInDialog?.pswName}.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for manual check-in..." value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
          <div className="flex items-center space-x-2">
            <Switch id="confirm-checkin" checked={confirmOverride} onCheckedChange={setConfirmOverride} />
            <Label htmlFor="confirm-checkin">I confirm this override is authorized</Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualCheckInDialog(null)}>Cancel</Button>
            <Button onClick={handleManualCheckIn} disabled={!confirmOverride}>Confirm Check-In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Check-Out Dialog */}
      <Dialog open={!!manualCheckOutDialog} onOpenChange={() => { setManualCheckOutDialog(null); setOverrideReason(""); setConfirmOverride(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />Manual Sign-Out Override
            </DialogTitle>
            <DialogDescription>This will complete the shift for {manualCheckOutDialog?.pswName} without a care sheet.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for manual sign-out..." value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
          <div className="flex items-center space-x-2">
            <Switch id="confirm-checkout" checked={confirmOverride} onCheckedChange={setConfirmOverride} />
            <Label htmlFor="confirm-checkout">I confirm this override is authorized</Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualCheckOutDialog(null)}>Cancel</Button>
            <Button onClick={handleManualCheckOut} disabled={!confirmOverride}>Confirm Sign-Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Map Dialog */}
      {liveMapShift && (
        <PSWLiveMapDialog
          open={!!liveMapShift}
          onOpenChange={(open) => { if (!open) setLiveMapShift(null); }}
          bookingId={liveMapShift.bookingId || liveMapShift.id}
          pswName={liveMapShift.pswName}
          clientName={liveMapShift.clientName}
          clientAddress={liveMapShift.patientAddress}
        />
      )}
    </div>
  );
};

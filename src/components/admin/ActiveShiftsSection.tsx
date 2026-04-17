import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CancelOrderDialog } from "./CancelOrderDialog";
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
  AlertTriangle, RefreshCw, Square, LogIn, LogOut, ShieldAlert, Navigation, UserPlus, XCircle, Edit, UserMinus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { 
  getAllActiveShiftsAsync, adminStopShift, adminManualCheckIn, adminManualSignOut, 
  type ShiftRecord, type CareSheetData 
} from "@/lib/shiftStore";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { PSWLiveMapDialog } from "./PSWLiveMapDialog";
import { AssignPSWDialog } from "./AssignPSWDialog";
import { ShiftTimeAdjustmentDialog } from "./ShiftTimeAdjustmentDialog";
import { EditOrderDialog } from "./EditOrderDialog";
import { Timer } from "lucide-react";

export const ActiveShiftsSection = () => {
  const { user } = useAuth();
  const [activeShifts, setActiveShifts] = useState<ShiftRecord[]>([]);
  const [claimedShifts, setClaimedShifts] = useState<ShiftRecord[]>([]);
  const [completedShifts, setCompletedShifts] = useState<ShiftRecord[]>([]);
  const [completedAllTime, setCompletedAllTime] = useState(0);
  const [pendingShifts, setPendingShifts] = useState<ShiftRecord[]>([]);
  const [cancelledShifts, setCancelledShifts] = useState<ShiftRecord[]>([]);
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
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignJob, setAssignJob] = useState<{ id: string; clientFirstName: string; serviceType: string[]; scheduledDate: string; startTime: string; endTime: string; city: string } | null>(null);
  const [timeAdjustShift, setTimeAdjustShift] = useState<ShiftRecord | null>(null);
  const [cancelShift, setCancelShift] = useState<ShiftRecord | null>(null);
  const [removePswShift, setRemovePswShift] = useState<ShiftRecord | null>(null);
  const [removingPsw, setRemovingPsw] = useState(false);
  const [editOrderShift, setEditOrderShift] = useState<{ shift: ShiftRecord; isActive: boolean } | null>(null);

  // Admin care sheet editor
  const [careSheetEditShift, setCareSheetEditShift] = useState<ShiftRecord | null>(null);
  const [csNotes, setCsNotes] = useState("");
  const [csMood, setCsMood] = useState("");
  const [csMobility, setCsMobility] = useState("");
  const [csAppetite, setCsAppetite] = useState("");
  const [csSaving, setCsSaving] = useState(false);
  
  const { toast } = useToast();

  const openCareSheetEditor = (shift: ShiftRecord) => {
    setCareSheetEditShift(shift);
    const existing = shift.careSheet;
    setCsNotes(existing?.observations || "");
    setCsMood(existing?.moodOnArrival || "");
    setCsMobility("");
    setCsAppetite("");
  };

  const saveCareSheetFromAdmin = async () => {
    if (!careSheetEditShift) return;
    setCsSaving(true);
    try {
      const careSheetData = {
        observations: csNotes,
        notes: csNotes,
        mood: csMood,
        mobility: csMobility,
        appetite: csAppetite,
        pswFirstName: "Admin",
        submittedByAdmin: true,
      };
      const { error } = await supabase
        .from("bookings")
        .update({
          care_sheet: careSheetData as any,
          care_sheet_status: "submitted",
          care_sheet_submitted_at: new Date().toISOString(),
          care_sheet_psw_name: "Admin",
        })
        .eq("id", careSheetEditShift.id);
      if (error) throw error;
      sonnerToast.success("Care sheet saved successfully");
      setCareSheetEditShift(null);
      loadShifts();
    } catch (err: any) {
      sonnerToast.error("Failed to save care sheet: " + err.message);
    } finally {
      setCsSaving(false);
    }
  };

  const loadShifts = async () => {
    const result = await getAllActiveShiftsAsync();
    setActiveShifts(result.active);
    setClaimedShifts(result.claimed);
    setCompletedShifts(result.completed);
    setCompletedAllTime(result.completedAllTime);
    setPendingShifts(result.pending);
    setCancelledShifts(result.cancelled);
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

  const getUnassignedLabel = (shift: ShiftRecord): string => {
    const now = new Date();
    const scheduledDate = new Date(shift.scheduledDate + "T" + shift.scheduledStart);
    const diffMs = scheduledDate.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return `Scheduled in ${diffDays} day${diffDays !== 1 ? "s" : ""} — No PSW assigned`;
    if (diffDays === 0) return "Scheduled today — No PSW assigned";
    return `Unassigned for ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`;
  };

  const ShiftCard = ({ shift, type }: { shift: ShiftRecord; type: "active" | "claimed" | "completed" | "pending" | "cancelled" }) => {
    const rushShift = isRushShift(shift);
    const urbanShift = isUrbanShift(shift);

    const cardStyles = {
      active: "border-green-500 bg-green-50/50 dark:bg-green-950/20",
      claimed: "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
      completed: "border-muted",
      pending: "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
      cancelled: "border-destructive/30 bg-destructive/5 opacity-70",
    };

    return (
      <Card className={cardStyles[type]}>
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
              {type === "pending" && (
                <Badge variant="secondary" className="bg-blue-500 text-white">
                  <Clock className="w-3 h-3 mr-1" />Needs PSW
                </Badge>
              )}
              {type === "cancelled" && (
                <Badge variant="destructive">
                  Cancelled
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
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm font-semibold">{shift.bookingId}</span>
              {shift.isRecurring && (
                <Badge variant="secondary" className="text-xs">Recurring</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">PSW: {shift.pswName || "Unassigned"}</span>
            </div>
            {type === "pending" && (
              <div className="space-y-2">
                {shift.pswCancelledAt && (
                  <div className="ml-6 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">🔄 Released by PSW</p>
                    {shift.pswCancelReason && (
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Reason: {shift.pswCancelReason}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(shift.pswCancelledAt).toLocaleString()}
                    </p>
                  </div>
                )}
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium ml-6">
                  {getUnassignedLabel(shift)}
                </p>
                <Button
                  size="sm"
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    const addr = shift.patientAddress || "";
                    const parts = addr.split(",").map(s => s.trim());
                    const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "Unknown";
                    setAssignJob({
                      id: shift.id,
                      clientFirstName: shift.clientFirstName || shift.clientName,
                      serviceType: shift.services,
                      scheduledDate: shift.scheduledDate,
                      startTime: shift.scheduledStart,
                      endTime: shift.scheduledEnd,
                      city,
                    });
                    setAssignDialogOpen(true);
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />Assign PSW
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => setCancelShift(shift)}
                >
                  <XCircle className="w-4 h-4 mr-2" />Cancel Order
                </Button>
              </div>
            )}
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

            {/* Client Preferences (always visible to admin) */}
            {(type === "pending" || type === "claimed" || type === "active") && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="outline" className="text-xs">
                  Lang: {shift.preferredLanguages?.length ? shift.preferredLanguages.join(", ") : "Any"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Gender: {shift.preferredGender || "No preference"}
                </Badge>
                {shift.careConditions && shift.careConditions.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {shift.careConditions.length} condition{shift.careConditions.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-3">
            {shift.services.map((service, i) => (
              <Badge key={i} variant="outline" className="text-xs">{service}</Badge>
            ))}
          </div>

          {/* Permanent Edit Order action (admins can edit any non-completed/non-cancelled order) */}
          {(type === "pending" || type === "claimed" || type === "active") && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setEditOrderShift({ shift, isActive: type === "active" })}
              >
                <Edit className="w-4 h-4 mr-2" />Edit Order
              </Button>
            </div>
          )}

          {type === "claimed" && shift.pswName && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <Button variant="outline" size="sm" className="w-full text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={() => setManualCheckInDialog(shift)}>
                <LogIn className="w-4 h-4 mr-2" />Manual Sign-In
              </Button>
              <Button variant="outline" size="sm" className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={() => setRemovePswShift(shift)}>
                <UserMinus className="w-4 h-4 mr-2" />Remove PSW
              </Button>
              <Button variant="destructive" size="sm" className="w-full"
                onClick={() => setCancelShift(shift)}>
                <XCircle className="w-4 h-4 mr-2" />Cancel Order
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

          {type === "completed" && (
            <div className="mt-3 pt-3 border-t space-y-2">
              {shift.careSheet && (
                <Button variant="outline" size="sm" className="w-full"
                  onClick={() => setSelectedCareSheet({ shift, data: shift.careSheet! })}>
                  <FileText className="w-4 h-4 mr-2" />View Care Sheet
                </Button>
              )}
              <Button variant="outline" size="sm" className="w-full"
                onClick={() => openCareSheetEditor(shift)}>
                <Edit className="w-4 h-4 mr-2" />{shift.careSheet ? "Edit Care Sheet" : "Add Care Sheet"}
              </Button>
              <Button variant="outline" size="sm" className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={() => setTimeAdjustShift(shift)}>
                <Timer className="w-4 h-4 mr-2" />Adjust Time
              </Button>
            </div>
          )}

          {(type === "pending" || type === "claimed" || type === "active") && (
            <div className="mt-2">
              <Button variant="outline" size="sm" className="w-full"
                onClick={() => openCareSheetEditor(shift)}>
                <Edit className="w-4 h-4 mr-2" />{shift.careSheet ? "Edit Care Sheet" : "Add Care Sheet"}
              </Button>
            </div>
          )}

          {type === "active" && shift.checkedInAt && (
            <Button variant="outline" size="sm" className="w-full mt-2 text-orange-600 border-orange-300 hover:bg-orange-50"
              onClick={() => setTimeAdjustShift(shift)}>
              <Timer className="w-4 h-4 mr-2" />Adjust Time
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Orders Pipeline</h2>
          <p className="text-muted-foreground">All operational orders in one view</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Unassigned — Needs PSW */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Unassigned — Needs PSW ({pendingShifts.length})</h3>
        </div>
        {pendingShifts.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-muted-foreground">No unassigned orders</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingShifts.map(shift => <ShiftCard key={shift.id} shift={shift} type="pending" />)}
          </div>
        )}
      </div>

      {/* Assigned — Upcoming */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold">Assigned — Upcoming ({claimedShifts.length})</h3>
        </div>
        {claimedShifts.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-muted-foreground">No upcoming assigned orders</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {claimedShifts.map(shift => <ShiftCard key={shift.id} shift={shift} type="claimed" />)}
          </div>
        )}
      </div>

      {/* In Progress */}
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

      {/* Completed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Completed — Last 24h ({completedShifts.length})</h3>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground font-medium">{completedAllTime} total all-time</span>
        </div>
        {completedShifts.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-muted-foreground">No recently completed orders</CardContent></Card>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid gap-4 md:grid-cols-2 pr-4">
              {completedShifts.map(shift => <ShiftCard key={shift.id} shift={shift} type="completed" />)}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Cancelled */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold">Cancelled ({cancelledShifts.length})</h3>
        </div>
        {cancelledShifts.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center text-muted-foreground">No cancelled orders</CardContent></Card>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="grid gap-4 md:grid-cols-2 pr-4">
              {cancelledShifts.map(shift => <ShiftCard key={shift.id} shift={shift} type="cancelled" />)}
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

      {/* Assign PSW Dialog */}
      <AssignPSWDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        job={assignJob}
        onAssigned={() => loadShifts()}
      />

      {/* Time Adjustment Dialog */}
      {timeAdjustShift && (
        <ShiftTimeAdjustmentDialog
          isOpen={!!timeAdjustShift}
          onClose={() => setTimeAdjustShift(null)}
          bookingId={timeAdjustShift.id}
          pswName={timeAdjustShift.pswName || "Unknown"}
          clientName={timeAdjustShift.clientName}
          bookingCode={timeAdjustShift.bookingId}
          originalClockIn={timeAdjustShift.checkedInAt || null}
          originalClockOut={timeAdjustShift.signedOutAt || null}
          onAdjusted={() => loadShifts()}
        />
      )}

      {/* Cancel Order Dialog */}
      {cancelShift && (
        <CancelOrderDialog
          open={!!cancelShift}
          onOpenChange={(open) => { if (!open) setCancelShift(null); }}
          bookingId={cancelShift.id}
          bookingCode={cancelShift.bookingId || cancelShift.id}
          clientName={cancelShift.clientName}
          clientEmail={cancelShift.clientEmail || ""}
          pswAssigned={cancelShift.pswId || null}
          onCancelled={() => {
            setCancelShift(null);
            loadShifts();
          }}
        />
      )}

      {/* Edit Order Dialog (permanent admin edit access) */}
      <EditOrderDialog
        open={!!editOrderShift}
        onOpenChange={(open) => { if (!open) setEditOrderShift(null); }}
        shift={editOrderShift?.shift ?? null}
        isActive={editOrderShift?.isActive}
        onSaved={() => loadShifts()}
      />

      {/* Remove PSW Confirmation Dialog */}
      <Dialog open={!!removePswShift} onOpenChange={(open) => { if (!open) setRemovePswShift(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-orange-600" />
              Remove PSW from Order
            </DialogTitle>
            <DialogDescription>
              This will unassign <strong>{removePswShift?.pswName}</strong> from the order for <strong>{removePswShift?.clientName}</strong> ({removePswShift?.scheduledDate}) and return the job to &quot;Unassigned&quot; status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovePswShift(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={removingPsw}
              onClick={async () => {
                if (!removePswShift) return;
                setRemovingPsw(true);
                try {
                  const { error } = await supabase
                    .from("bookings")
                    .update({
                      psw_assigned: null,
                      psw_first_name: null,
                      status: "pending",
                      claimed_at: null,
                      checked_in_at: null,
                    })
                    .eq("id", removePswShift.id);
                  if (error) throw error;

                  // Notify the removed PSW
                  if (removePswShift.pswId) {
                    const { data: pswProfile } = await supabase
                      .from("psw_profiles")
                      .select("email")
                      .eq("id", removePswShift.pswId)
                      .single();
                    if (pswProfile?.email) {
                      await supabase.from("notifications").insert({
                        user_email: pswProfile.email,
                        title: "⚠️ Shift Removed",
                        body: `You have been removed from the shift on ${removePswShift.scheduledDate} (${removePswShift.scheduledStart}–${removePswShift.scheduledEnd}) for ${removePswShift.clientName}. Contact admin for details.`,
                        type: "shift_removed",
                      });
                    }
                  }

                  sonnerToast.success(`Removed ${removePswShift.pswName} from order`);
                  setRemovePswShift(null);
                  loadShifts();
                } catch (err: any) {
                  console.error("Remove PSW error:", err);
                  sonnerToast.error("Failed to remove PSW");
                } finally {
                  setRemovingPsw(false);
                }
              }}
            >
              {removingPsw ? "Removing..." : "Remove PSW"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Care Sheet Editor Dialog */}
      <Dialog open={!!careSheetEditShift} onOpenChange={(open) => { if (!open) setCareSheetEditShift(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              {careSheetEditShift?.careSheet ? "Edit Care Sheet" : "Add Care Sheet"} — {careSheetEditShift?.clientName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Observations / Visit Notes *</Label>
              <Textarea
                value={csNotes}
                onChange={(e) => setCsNotes(e.target.value)}
                placeholder="Describe the visit, patient condition, tasks performed..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Mood</Label>
                <Input value={csMood} onChange={(e) => setCsMood(e.target.value)} placeholder="e.g. Good" />
              </div>
              <div>
                <Label>Mobility</Label>
                <Input value={csMobility} onChange={(e) => setCsMobility(e.target.value)} placeholder="e.g. Steady" />
              </div>
              <div>
                <Label>Appetite</Label>
                <Input value={csAppetite} onChange={(e) => setCsAppetite(e.target.value)} placeholder="e.g. Normal" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCareSheetEditShift(null)}>Cancel</Button>
            <Button onClick={saveCareSheetFromAdmin} disabled={csSaving || !csNotes.trim()}>
              {csSaving ? "Saving..." : "Save Care Sheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

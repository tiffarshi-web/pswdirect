// Payroll Approval Dashboard - Admin verification for completed shifts
// PHIPA-compliant with audit logging and GPS verification

import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { 
  CheckCircle, 
  Clock, 
  MapPin, 
  FileText, 
  Shield, 
  DollarSign,
  AlertCircle,
  Download,
  Eye,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getShifts, type ShiftRecord } from "@/lib/shiftStore";
import { calculateShiftPay, getStaffPayRates } from "@/lib/payrollStore";
import { useAuth } from "@/contexts/AuthContext";
import { 
  logSecurityEvent, 
  getPSWBanking,
  revealPSWBanking,
  generateCPA005File,
  downloadBankFile,
  maskAccountNumber,
  type CPAPaymentRecord,
  type BankingInfo
} from "@/lib/securityStore";
import { getPSWProfile } from "@/lib/pswProfileStore";

interface ApprovalRecord {
  shiftId: string;
  pswId: string;
  pswName: string;
  date: string;
  startTime: string;
  endTime: string;
  actualStart: string;
  actualEnd: string;
  hoursWorked: number;
  gpsVerified: boolean;
  gpsLocation?: { lat: number; lng: number };
  hasCareSheet: boolean;
  careSheet?: ShiftRecord["careSheet"];
  services: string[];
  payAmount: number;
  status: "pending" | "approved" | "payout_ready";
}

// Local storage key for approved shifts
const APPROVED_SHIFTS_KEY = "pswdirect_approved_shifts";

const getApprovedShiftIds = (): string[] => {
  const stored = localStorage.getItem(APPROVED_SHIFTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveApprovedShiftIds = (ids: string[]): void => {
  localStorage.setItem(APPROVED_SHIFTS_KEY, JSON.stringify(ids));
};

export const PayrollApprovalSection = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [approvedShiftIds, setApprovedShiftIds] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [careSheetDialog, setCareSheetDialog] = useState<{ open: boolean; careSheet?: ShiftRecord["careSheet"]; pswName: string }>({
    open: false,
    pswName: ""
  });
  const [bankExportDialog, setBankExportDialog] = useState(false);
  const [revealedBanking, setRevealedBanking] = useState<Record<string, BankingInfo | null>>({});
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    setShifts(getShifts());
    setApprovedShiftIds(getApprovedShiftIds());
  }, []);

  // Transform completed shifts into approval records
  const approvalRecords: ApprovalRecord[] = useMemo(() => {
    return shifts
      .filter(s => s.status === "completed" && s.checkedInAt && s.signedOutAt)
      .map(shift => {
        const checkInTime = new Date(shift.checkedInAt!);
        const signOutTime = new Date(shift.signedOutAt!);
        const hoursWorked = (signOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        
        const isHospitalVisit = shift.services.some(s => 
          s.toLowerCase().includes("hospital") || s.toLowerCase().includes("doctor")
        );
        const { totalPay } = calculateShiftPay(hoursWorked, shift.overtimeMinutes, isHospitalVisit);
        
        const isApproved = approvedShiftIds.includes(shift.id);
        
        return {
          shiftId: shift.id,
          pswId: shift.pswId,
          pswName: shift.pswName,
          date: shift.scheduledDate,
          startTime: shift.scheduledStart,
          endTime: shift.scheduledEnd,
          actualStart: format(checkInTime, "HH:mm"),
          actualEnd: format(signOutTime, "HH:mm"),
          hoursWorked,
          gpsVerified: !!shift.checkInLocation,
          gpsLocation: shift.checkInLocation,
          hasCareSheet: !!shift.careSheet,
          careSheet: shift.careSheet,
          services: shift.services,
          payAmount: totalPay,
          status: isApproved ? "payout_ready" : "pending",
        } as ApprovalRecord;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shifts, approvedShiftIds]);

  const pendingRecords = approvalRecords.filter(r => r.status === "pending");
  const payoutReadyRecords = approvalRecords.filter(r => r.status === "payout_ready");

  const handleViewCareSheet = (record: ApprovalRecord) => {
    if (record.careSheet) {
      logSecurityEvent(
        user?.id || "unknown",
        user?.name || "Unknown User",
        "admin",
        "view",
        "health",
        record.shiftId,
        `Viewed care sheet for ${record.pswName}`
      );
      
      setCareSheetDialog({
        open: true,
        careSheet: record.careSheet,
        pswName: record.pswName
      });
    }
  };

  const handleApproveSelected = () => {
    if (selectedShifts.size === 0) {
      toast.error("Please select at least one shift to approve");
      return;
    }
    
    const newApproved = [...approvedShiftIds, ...Array.from(selectedShifts)];
    setApprovedShiftIds(newApproved);
    saveApprovedShiftIds(newApproved);
    
    // Log approval action
    selectedShifts.forEach(shiftId => {
      logSecurityEvent(
        user?.id || "unknown",
        user?.name || "Unknown User",
        "admin",
        "update",
        "payroll",
        shiftId,
        "Approved shift for payment"
      );
    });
    
    setSelectedShifts(new Set());
    toast.success(`${selectedShifts.size} shift(s) approved for payment`);
  };

  const handleSelectAll = (records: ApprovalRecord[]) => {
    if (selectedShifts.size === records.length) {
      setSelectedShifts(new Set());
    } else {
      setSelectedShifts(new Set(records.map(r => r.shiftId)));
    }
  };

  const toggleShiftSelection = (shiftId: string) => {
    const newSelection = new Set(selectedShifts);
    if (newSelection.has(shiftId)) {
      newSelection.delete(shiftId);
    } else {
      newSelection.add(shiftId);
    }
    setSelectedShifts(newSelection);
  };

  const handleRevealBanking = async (pswId: string) => {
    if (!user) return;
    
    const banking = await revealPSWBanking(pswId, user.id, user.name);
    setRevealedBanking(prev => ({ ...prev, [pswId]: banking }));
    
    if (!banking) {
      toast.error("No banking info found for this PSW");
    }
  };

  const handleGenerateBankFile = (type: "cpa005" | "etransfer") => {
    const payments: CPAPaymentRecord[] = [];
    const pswTotals: Record<string, { name: string; amount: number }> = {};
    
    // Aggregate payments by PSW
    payoutReadyRecords.forEach(record => {
      if (!pswTotals[record.pswId]) {
        pswTotals[record.pswId] = { name: record.pswName, amount: 0 };
      }
      pswTotals[record.pswId].amount += record.payAmount;
    });
    
    // Get banking info for each PSW
    Object.entries(pswTotals).forEach(([pswId, { name, amount }]) => {
      const profile = getPSWProfile(pswId);
      const bankingRecord = getPSWBanking(pswId);
      const banking = bankingRecord?.banking;
      
      if (banking) {
        payments.push({
          pswId,
          legalName: profile ? `${profile.firstName} ${profile.lastName}` : name,
          transitNumber: banking.transitNumber,
          institutionNumber: banking.institutionNumber,
          accountNumber: banking.accountNumber,
          amount,
          referenceNumber: `PAY-${Date.now().toString(36).toUpperCase()}`,
        });
      }
    });
    
    if (payments.length === 0) {
      toast.error("No PSWs with banking info found. Please ensure banking details are on file.");
      return;
    }
    
    // Log export action
    logSecurityEvent(
      user?.id || "unknown",
      user?.name || "Unknown User",
      "admin",
      "export",
      "banking",
      undefined,
      `Generated ${type.toUpperCase()} payment file for ${payments.length} PSWs`
    );
    
    const dateStr = format(new Date(), "yyyy-MM-dd");
    
    if (type === "cpa005") {
      const content = generateCPA005File(
        payments,
        "PSADIRECT01",
        "PSA DIRECT INC",
        String(Math.floor(Math.random() * 9999))
      );
      downloadBankFile(content, `psadirect_payment_${dateStr}.txt`, "cpa005");
      toast.success("CPA-005 direct deposit payment file generated");
    }
    
    setBankExportDialog(false);
  };

  const totalPending = pendingRecords.reduce((sum, r) => sum + r.payAmount, 0);
  const totalPayoutReady = payoutReadyRecords.reduce((sum, r) => sum + r.payAmount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Pending Approval</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pendingRecords.length}</p>
            <p className="text-sm text-amber-600">${totalPending.toFixed(2)} owed</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Payout Ready</span>
            </div>
            <p className="text-2xl font-bold text-primary">{payoutReadyRecords.length}</p>
            <p className="text-sm text-primary">${totalPayoutReady.toFixed(2)} ready</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Security Status</span>
            </div>
            <p className="text-sm font-medium text-green-600">AES-256 Encrypted</p>
            <p className="text-xs text-muted-foreground">PHIPA Compliant</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Approval Panel */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Payroll Approval
              </CardTitle>
              <CardDescription>
                Verify and approve completed shifts for payment
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {activeTab === "pending" && selectedShifts.size > 0 && (
                <Button variant="brand" onClick={handleApproveSelected}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Selected ({selectedShifts.size})
                </Button>
              )}
              {activeTab === "payout_ready" && payoutReadyRecords.length > 0 && (
                <Button variant="outline" onClick={() => setBankExportDialog(true)}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Bank File
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingRecords.length})
              </TabsTrigger>
              <TabsTrigger value="payout_ready" className="gap-2">
                <DollarSign className="w-4 h-4" />
                Payout Ready ({payoutReadyRecords.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>All shifts have been approved!</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox 
                            checked={selectedShifts.size === pendingRecords.length && pendingRecords.length > 0}
                            onCheckedChange={() => handleSelectAll(pendingRecords)}
                          />
                        </TableHead>
                        <TableHead>PSW Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Times</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>GPS</TableHead>
                        <TableHead>Care Sheet</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRecords.map(record => (
                        <TableRow key={record.shiftId}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedShifts.has(record.shiftId)}
                              onCheckedChange={() => toggleShiftSelection(record.shiftId)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{record.pswName}</TableCell>
                          <TableCell>{format(parseISO(record.date), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div className="text-muted-foreground">
                                Sched: {record.startTime} - {record.endTime}
                              </div>
                              <div className="text-foreground">
                                Actual: {record.actualStart} - {record.actualEnd}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{record.hoursWorked.toFixed(1)}h</TableCell>
                          <TableCell>
                            {record.gpsVerified ? (
                              <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
                                <MapPin className="w-3 h-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                                <AlertCircle className="w-3 h-3" />
                                No GPS
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.hasCareSheet ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleViewCareSheet(record)}
                                className="gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            ${record.payAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="payout_ready">
              {payoutReadyRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No shifts approved for payout yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PSW Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payoutReadyRecords.map(record => (
                        <TableRow key={record.shiftId}>
                          <TableCell className="font-medium">{record.pswName}</TableCell>
                          <TableCell>{format(parseISO(record.date), "MMM d, yyyy")}</TableCell>
                          <TableCell>{record.hoursWorked.toFixed(1)}h</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {record.services.slice(0, 2).map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {s}
                                </Badge>
                              ))}
                              {record.services.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{record.services.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ${record.payAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Care Sheet Dialog */}
      <Dialog open={careSheetDialog.open} onOpenChange={(open) => setCareSheetDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Care Sheet - {careSheetDialog.pswName}
            </DialogTitle>
          </DialogHeader>
          {careSheetDialog.careSheet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Mood on Arrival</p>
                  <p className="font-medium">{careSheetDialog.careSheet.moodOnArrival}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mood on Departure</p>
                  <p className="font-medium">{careSheetDialog.careSheet.moodOnDeparture}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Tasks Completed</p>
                <div className="flex flex-wrap gap-1">
                  {careSheetDialog.careSheet.tasksCompleted.map((task, i) => (
                    <Badge key={i} variant="secondary">{task}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Observations</p>
                <p className="text-sm bg-muted p-2 rounded">{careSheetDialog.careSheet.observations || "None recorded"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bank Export Dialog */}
      <Dialog open={bankExportDialog} onOpenChange={setBankExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Generate Bank Payment File
            </DialogTitle>
            <DialogDescription>
              Choose your preferred payment format
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleGenerateBankFile("cpa005")}
            >
              <CardContent className="p-4">
                <h4 className="font-medium">CPA-005 Format</h4>
                <p className="text-sm text-muted-foreground">
                  Standard Canadian bank format for direct deposits
                </p>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" />
              All exports are logged for security compliance
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

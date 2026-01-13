import { useState } from "react";
import { Users, Phone, Mail, AlertTriangle, CheckCircle, XCircle, Flag, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PSW_POLICY_TEXT } from "@/lib/businessConfig";

interface PSW {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  status: "active" | "flagged" | "removed";
  shiftsCompleted: number;
  rating: number;
  lateShifts: number;
  missedShifts: number;
  joinedDate: string;
  flagReason?: string;
}

// Mock PSW data
const mockPSWs: PSW[] = [
  {
    id: "PSW001",
    firstName: "Jennifer",
    lastName: "Morrison",
    phone: "(416) 555-1001",
    email: "jennifer.m@pswstaff.com",
    status: "active",
    shiftsCompleted: 47,
    rating: 4.8,
    lateShifts: 1,
    missedShifts: 0,
    joinedDate: "2024-06-15",
  },
  {
    id: "PSW002",
    firstName: "Amanda",
    lastName: "Liu",
    phone: "(416) 555-1002",
    email: "amanda.l@pswstaff.com",
    status: "active",
    shiftsCompleted: 32,
    rating: 4.9,
    lateShifts: 0,
    missedShifts: 0,
    joinedDate: "2024-08-01",
  },
  {
    id: "PSW003",
    firstName: "Patricia",
    lastName: "Kim",
    phone: "(416) 555-1003",
    email: "patricia.k@pswstaff.com",
    status: "flagged",
    shiftsCompleted: 18,
    rating: 4.2,
    lateShifts: 3,
    missedShifts: 1,
    joinedDate: "2024-09-20",
    flagReason: "Multiple late arrivals",
  },
  {
    id: "PSW004",
    firstName: "Maria",
    lastName: "Santos",
    phone: "(416) 555-1004",
    email: "maria.s@pswstaff.com",
    status: "removed",
    shiftsCompleted: 5,
    rating: 3.5,
    lateShifts: 2,
    missedShifts: 2,
    joinedDate: "2024-10-01",
    flagReason: "Missed shifts without notice",
  },
  {
    id: "PSW005",
    firstName: "David",
    lastName: "Thompson",
    phone: "(416) 555-1005",
    email: "david.t@pswstaff.com",
    status: "active",
    shiftsCompleted: 89,
    rating: 4.7,
    lateShifts: 2,
    missedShifts: 0,
    joinedDate: "2024-03-10",
  },
];

export const PSWOversightSection = () => {
  const [pswList, setPswList] = useState<PSW[]>(mockPSWs);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedPSW, setSelectedPSW] = useState<PSW | null>(null);
  const [flagReason, setFlagReason] = useState("");

  const handleFlag = (psw: PSW) => {
    setSelectedPSW(psw);
    setFlagDialogOpen(true);
  };

  const handleRemove = (psw: PSW) => {
    setSelectedPSW(psw);
    setRemoveDialogOpen(true);
  };

  const confirmFlag = () => {
    if (selectedPSW) {
      setPswList(prev =>
        prev.map(p =>
          p.id === selectedPSW.id
            ? { ...p, status: "flagged" as const, flagReason: flagReason || "Admin flagged" }
            : p
        )
      );
      toast.warning(`${selectedPSW.firstName} ${selectedPSW.lastName} has been flagged`);
    }
    setFlagDialogOpen(false);
    setSelectedPSW(null);
    setFlagReason("");
  };

  const confirmRemove = () => {
    if (selectedPSW) {
      setPswList(prev =>
        prev.map(p =>
          p.id === selectedPSW.id
            ? { ...p, status: "removed" as const, flagReason: "Removed from platform per policy" }
            : p
        )
      );
      toast.error(`${selectedPSW.firstName} ${selectedPSW.lastName} has been removed from the platform`);
    }
    setRemoveDialogOpen(false);
    setSelectedPSW(null);
  };

  const reinstatesPSW = (psw: PSW) => {
    setPswList(prev =>
      prev.map(p =>
        p.id === psw.id
          ? { ...p, status: "active" as const, flagReason: undefined }
          : p
      )
    );
    toast.success(`${psw.firstName} ${psw.lastName} has been reinstated`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "flagged":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Flagged
          </Badge>
        );
      case "removed":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Removed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  const activePSWs = pswList.filter(p => p.status === "active");
  const flaggedPSWs = pswList.filter(p => p.status === "flagged");
  const removedPSWs = pswList.filter(p => p.status === "removed");

  return (
    <div className="space-y-6">
      {/* Privacy Note */}
      <Card className="shadow-card border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Privacy Protocol</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clients only see PSW <strong>First Names</strong>. Full contact info is only visible here in the Admin Panel.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policy Reminder */}
      <Card className="shadow-card bg-amber-50 dark:bg-amber-950/20 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">PSW Agreement Policy</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {PSW_POLICY_TEXT.shiftWarning}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{activePSWs.length}</p>
            <p className="text-sm text-muted-foreground">Active PSWs</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{flaggedPSWs.length}</p>
            <p className="text-sm text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{removedPSWs.length}</p>
            <p className="text-sm text-muted-foreground">Removed</p>
          </CardContent>
        </Card>
      </div>

      {/* PSW List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Registered PSWs
          </CardTitle>
          <CardDescription>
            Full contact information visible to admin only
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pswList.map((psw) => (
            <div
              key={psw.id}
              className={`p-4 border rounded-lg space-y-3 ${
                psw.status === "removed" ? "bg-muted/50 opacity-75" : "bg-card"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`
                      ${psw.status === "active" ? "bg-emerald-100 text-emerald-700" : ""}
                      ${psw.status === "flagged" ? "bg-amber-100 text-amber-700" : ""}
                      ${psw.status === "removed" ? "bg-red-100 text-red-700" : ""}
                    `}>
                      {getInitials(psw.firstName, psw.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">
                      {psw.firstName} {psw.lastName}
                      <span className="ml-2 text-xs text-muted-foreground">({psw.id})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Client sees: <strong>{psw.firstName} {psw.lastName.charAt(0)}.</strong>
                    </p>
                  </div>
                </div>
                {getStatusBadge(psw.status)}
              </div>

              {/* Contact Info (Admin Only) */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{psw.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{psw.email}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-xs">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{psw.shiftsCompleted}</strong> shifts
                </span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">⭐ {psw.rating}</strong> rating
                </span>
                <span className={psw.lateShifts > 0 ? "text-amber-600" : "text-muted-foreground"}>
                  <strong>{psw.lateShifts}</strong> late
                </span>
                <span className={psw.missedShifts > 0 ? "text-red-600" : "text-muted-foreground"}>
                  <strong>{psw.missedShifts}</strong> missed
                </span>
              </div>

              {/* Flag Reason */}
              {psw.flagReason && (
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                  <strong>Reason:</strong> {psw.flagReason}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                {psw.status === "active" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFlag(psw)}
                      className="text-amber-600 border-amber-300 hover:bg-amber-50"
                    >
                      <Flag className="w-3.5 h-3.5 mr-1" />
                      Flag
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(psw)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </>
                )}
                {psw.status === "flagged" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reinstatesPSW(psw)}
                      className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Reinstate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(psw)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </>
                )}
                {psw.status === "removed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reinstatesPSW(psw)}
                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Reinstate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Flag Dialog */}
      <AlertDialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flag PSW</AlertDialogTitle>
            <AlertDialogDescription>
              Flag <strong>{selectedPSW?.firstName} {selectedPSW?.lastName}</strong> for review.
              This will mark them for monitoring but they can still take shifts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason for flagging</label>
            <input
              type="text"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="e.g., Multiple late arrivals"
              className="w-full mt-2 px-3 py-2 border border-border rounded-md text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFlag} className="bg-amber-500 hover:bg-amber-600">
              Flag PSW
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Remove PSW from Platform</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{selectedPSW?.firstName} {selectedPSW?.lastName}</strong> from 
              the platform per the agreement: "{PSW_POLICY_TEXT.shiftWarning}"
              <br /><br />
              They will no longer be able to accept shifts. This action can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-red-500 hover:bg-red-600">
              Remove from Platform
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

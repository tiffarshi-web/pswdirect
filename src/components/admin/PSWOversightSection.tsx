import { useState, useEffect } from "react";
import { Users, Phone, Mail, AlertTriangle, CheckCircle, XCircle, Flag, Shield, Clock, Eye, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { 
  PSWProfile, 
  getPSWProfiles, 
  updateVettingStatus,
  initializePSWProfiles 
} from "@/lib/pswProfileStore";
import { getLanguageName } from "@/lib/languageConfig";
import { PSWProfileCard } from "./PSWProfileCard";

// Legacy PSW interface for stats tracking
interface PSWStats {
  shiftsCompleted: number;
  rating: number;
  lateShifts: number;
  missedShifts: number;
  status: "active" | "flagged" | "removed";
  flagReason?: string;
}

// Mock stats data (in real app, this would come from shift tracking)
const mockStats: Record<string, PSWStats> = {
  "PSW001": { shiftsCompleted: 47, rating: 4.8, lateShifts: 1, missedShifts: 0, status: "active" },
  "PSW002": { shiftsCompleted: 32, rating: 4.9, lateShifts: 0, missedShifts: 0, status: "active" },
  "PSW003": { shiftsCompleted: 18, rating: 4.2, lateShifts: 3, missedShifts: 1, status: "flagged", flagReason: "Multiple late arrivals" },
  "PSW004": { shiftsCompleted: 5, rating: 3.5, lateShifts: 2, missedShifts: 2, status: "removed", flagReason: "Missed shifts without notice" },
  "PSW005": { shiftsCompleted: 89, rating: 4.7, lateShifts: 2, missedShifts: 0, status: "active" },
};

export const PSWOversightSection = () => {
  const [profiles, setProfiles] = useState<PSWProfile[]>([]);
  const [pswStats, setPswStats] = useState<Record<string, PSWStats>>(mockStats);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedPSW, setSelectedPSW] = useState<PSWProfile | null>(null);
  const [profileCardOpen, setProfileCardOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  // Load profiles on mount
  useEffect(() => {
    initializePSWProfiles();
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const loaded = getPSWProfiles();
    setProfiles(loaded);
  };

  const handleViewProfile = (psw: PSWProfile) => {
    setSelectedPSW(psw);
    setProfileCardOpen(true);
  };

  const handleProfileUpdate = (updatedProfile: PSWProfile) => {
    setProfiles(prev => 
      prev.map(p => p.id === updatedProfile.id ? updatedProfile : p)
    );
    setSelectedPSW(updatedProfile);
  };

  const handleFlag = (psw: PSWProfile) => {
    setSelectedPSW(psw);
    setFlagDialogOpen(true);
  };

  const handleRemove = (psw: PSWProfile) => {
    setSelectedPSW(psw);
    setRemoveDialogOpen(true);
  };

  const confirmFlag = () => {
    if (selectedPSW) {
      setPswStats(prev => ({
        ...prev,
        [selectedPSW.id]: {
          ...(prev[selectedPSW.id] || { shiftsCompleted: 0, rating: 0, lateShifts: 0, missedShifts: 0 }),
          status: "flagged",
          flagReason: flagReason || "Admin flagged",
        },
      }));
      toast.warning(`${selectedPSW.firstName} ${selectedPSW.lastName} has been flagged`);
    }
    setFlagDialogOpen(false);
    setSelectedPSW(null);
    setFlagReason("");
  };

  const confirmRemove = () => {
    if (selectedPSW) {
      setPswStats(prev => ({
        ...prev,
        [selectedPSW.id]: {
          ...(prev[selectedPSW.id] || { shiftsCompleted: 0, rating: 0, lateShifts: 0, missedShifts: 0 }),
          status: "removed",
          flagReason: "Removed from platform per policy",
        },
      }));
      // Also update vetting status to rejected
      updateVettingStatus(selectedPSW.id, "rejected", "Removed from platform");
      loadProfiles();
      toast.error(`${selectedPSW.firstName} ${selectedPSW.lastName} has been removed from the platform`);
    }
    setRemoveDialogOpen(false);
    setSelectedPSW(null);
  };

  const reinstatesPSW = (psw: PSWProfile) => {
    setPswStats(prev => ({
      ...prev,
      [psw.id]: {
        ...(prev[psw.id] || { shiftsCompleted: 0, rating: 0, lateShifts: 0, missedShifts: 0 }),
        status: "active",
        flagReason: undefined,
      },
    }));
    toast.success(`${psw.firstName} ${psw.lastName} has been reinstated`);
  };

  const getStats = (pswId: string): PSWStats => {
    return pswStats[pswId] || { shiftsCompleted: 0, rating: 0, lateShifts: 0, missedShifts: 0, status: "active" };
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

  const getVettingBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Vetted
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  const approvedProfiles = profiles.filter(p => p.vettingStatus === "approved");
  const pendingProfiles = profiles.filter(p => p.vettingStatus === "pending");
  const rejectedProfiles = profiles.filter(p => p.vettingStatus === "rejected");
  
  const activeCount = approvedProfiles.filter(p => getStats(p.id).status === "active").length;
  const flaggedCount = approvedProfiles.filter(p => getStats(p.id).status === "flagged").length;
  const removedCount = approvedProfiles.filter(p => getStats(p.id).status === "removed").length;

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
                Clients only see PSW <strong>First Name + Photo</strong>. Full contact info is only visible here in the Admin Panel.
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

      {/* Stats Summary - Vetting Status */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{approvedProfiles.length}</p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{pendingProfiles.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{rejectedProfiles.length}</p>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card border-l-4 border-l-emerald-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active PSWs</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-l-4 border-l-amber-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{flaggedCount}</p>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-l-4 border-l-red-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{removedCount}</p>
            <p className="text-xs text-muted-foreground">Removed</p>
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
            Click on a PSW's name to view their full Profile Card
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profiles.map((psw) => {
            const stats = getStats(psw.id);
            
            return (
              <div
                key={psw.id}
                className={`p-4 border rounded-lg space-y-3 ${
                  stats.status === "removed" ? "bg-muted/50 opacity-75" : "bg-card"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-offset-2 ring-primary/20">
                      {psw.profilePhotoUrl ? (
                        <AvatarImage src={psw.profilePhotoUrl} alt={`${psw.firstName} ${psw.lastName}`} />
                      ) : null}
                      <AvatarFallback className={`
                        ${stats.status === "active" ? "bg-emerald-100 text-emerald-700" : ""}
                        ${stats.status === "flagged" ? "bg-amber-100 text-amber-700" : ""}
                        ${stats.status === "removed" ? "bg-red-100 text-red-700" : ""}
                      `}>
                        {getInitials(psw.firstName, psw.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <button
                        onClick={() => handleViewProfile(psw)}
                        className="font-semibold text-foreground hover:text-primary hover:underline text-left"
                      >
                        {psw.firstName} {psw.lastName}
                        <span className="ml-2 text-xs text-muted-foreground font-normal">({psw.id})</span>
                      </button>
                      <p className="text-xs text-muted-foreground">
                        Client sees: <strong>{psw.firstName}</strong> + Photo
                      </p>
                      {psw.hscpoaNumber && (
                        <p className="text-xs text-primary font-mono">{psw.hscpoaNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {getVettingBadge(psw.vettingStatus)}
                    {psw.vettingStatus === "approved" && getStatusBadge(stats.status)}
                  </div>
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

                {/* Languages */}
                {psw.languages.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    {psw.languages.map(lang => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {getLanguageName(lang)}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Stats (only for approved PSWs) */}
                {psw.vettingStatus === "approved" && (
                  <div className="flex gap-4 text-xs">
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{stats.shiftsCompleted}</strong> shifts
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">⭐ {stats.rating.toFixed(1)}</strong> rating
                    </span>
                    <span className={stats.lateShifts > 0 ? "text-amber-600" : "text-muted-foreground"}>
                      <strong>{stats.lateShifts}</strong> late
                    </span>
                    <span className={stats.missedShifts > 0 ? "text-red-600" : "text-muted-foreground"}>
                      <strong>{stats.missedShifts}</strong> missed
                    </span>
                  </div>
                )}

                {/* Flag Reason */}
                {stats.flagReason && (
                  <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                    <strong>Reason:</strong> {stats.flagReason}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewProfile(psw)}
                    className="text-primary"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View Profile
                  </Button>
                  
                  {psw.vettingStatus === "approved" && stats.status === "active" && (
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
                  {psw.vettingStatus === "approved" && stats.status === "flagged" && (
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
                  {(stats.status === "removed" || psw.vettingStatus === "rejected") && (
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
            );
          })}
        </CardContent>
      </Card>

      {/* Profile Card Dialog */}
      {selectedPSW && (
        <PSWProfileCard
          profile={selectedPSW}
          isOpen={profileCardOpen}
          onClose={() => {
            setProfileCardOpen(false);
            setSelectedPSW(null);
          }}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

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
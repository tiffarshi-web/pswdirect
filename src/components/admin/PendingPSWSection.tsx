// Pending PSW Applications Section - For reviewing new applicants
// Shows compliance documents, address, and quick vetting actions
// Includes Archive tab for rejected_final and deactivated PSWs
// rejected_needs_update PSWs stay visible in Awaiting Review with badge

import { useState, useEffect, useMemo } from "react";
import { Check, X, Clock, Mail, Phone, Award, Car, Calendar, MapPin, FileText, Shield, Search, ExternalLink, Globe, AlertCircle, Camera, Archive, Ban, RotateCcw, XCircle, Loader2, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { 
  PSAProfile,
  PSAGender,
  updateVettingStatus,
} from "@/lib/pswProfileStore";
import { getLanguageName } from "@/lib/languageConfig";
import { isValidCanadianPostalCode, getCoordinatesFromPostalCode, calculateDistanceBetweenPostalCodes } from "@/lib/postalCodeUtils";
import { useActiveServiceRadius } from "@/hooks/useActiveServiceRadius";

// Re-export for backward compatibility
type PSWProfile = PSAProfile;
import { SERVICE_RADIUS_KM } from "@/lib/businessConfig";
import { sendPSWApprovedNotification } from "@/lib/notificationService";
import ApprovalEmailPreview from "./ApprovalEmailPreview";
import { supabase } from "@/integrations/supabase/client";
import { RejectionReasonsDialog, type RejectionType } from "./RejectionReasonsDialog";

// Extended profile with rejection fields
interface ExtendedPSWProfile extends PSWProfile {
  rejectionReasons?: string[];
  rejectionNotes?: string;
  rejectedAt?: string;
  resubmittedAt?: string;
  applicationVersion?: number;
  govIdType?: string;
  govIdUrl?: string;
  govIdStatus?: string;
  govIdReviewedAt?: string;
  govIdNotes?: string;
}

// No more mock data — all profiles are fetched from the database

export const PendingPSWSection = () => {
  const [profiles, setProfiles] = useState<ExtendedPSWProfile[]>([]);
  const [archivedProfiles, setArchivedProfiles] = useState<ExtendedPSWProfile[]>([]);
  const [selectedPSW, setSelectedPSW] = useState<ExtendedPSWProfile | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionType, setRejectionType] = useState<RejectionType>("needs_update");
  const [showReinstateDialog, setShowReinstateDialog] = useState<ExtendedPSWProfile | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [vehiclePhotoDialog, setVehiclePhotoDialog] = useState<ExtendedPSWProfile | null>(null);
  const [activeTab, setActiveTab] = useState("awaiting-review");
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [isReinstating, setIsReinstating] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [filterNeedsUpdate, setFilterNeedsUpdate] = useState(false);
  
  // Use the active service radius from database
  const { radius: activeServiceRadius } = useActiveServiceRadius();

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (activeTab === "archived") {
      loadArchivedProfiles();
    }
  }, [activeTab]);

  const mapRowToProfile = (row: any): ExtendedPSWProfile => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || "",
    gender: (row.gender as PSAGender) || undefined,
    languages: row.languages || ["en"],
    homePostalCode: row.home_postal_code || "",
    homeCity: row.home_city || "",
    profilePhotoUrl: row.profile_photo_url || undefined,
    profilePhotoName: row.profile_photo_name || undefined,
    hscpoaNumber: row.hscpoa_number || undefined,
    policeCheckUrl: row.police_check_url || undefined,
    policeCheckName: row.police_check_name || undefined,
    policeCheckDate: row.police_check_date || undefined,
    vehiclePhotoUrl: row.vehicle_photo_url || undefined,
    vehiclePhotoName: row.vehicle_photo_name || undefined,
    yearsExperience: row.years_experience || undefined,
    certifications: row.certifications || undefined,
    hasOwnTransport: row.has_own_transport || undefined,
    licensePlate: row.license_plate || undefined,
    availableShifts: row.available_shifts || undefined,
    vehicleDisclaimer: row.vehicle_disclaimer as unknown as PSWProfile["vehicleDisclaimer"] || undefined,
    vettingStatus: row.vetting_status as PSWProfile["vettingStatus"],
    vettingNotes: row.vetting_notes || undefined,
    vettingUpdatedAt: row.vetting_updated_at || undefined,
    appliedAt: row.applied_at || new Date().toISOString(),
    approvedAt: row.approved_at || undefined,
    expiredDueToPoliceCheck: row.expired_due_to_police_check || false,
    // Gov ID fields
    govIdType: row.gov_id_type || "missing",
    govIdUrl: row.gov_id_url || undefined,
    govIdStatus: row.gov_id_status || "missing",
    govIdReviewedAt: row.gov_id_reviewed_at || undefined,
    govIdNotes: row.gov_id_notes || undefined,
    // Extended fields
    rejectionReasons: row.rejection_reasons || undefined,
    rejectionNotes: row.rejection_notes || undefined,
    rejectedAt: row.rejected_at || undefined,
    resubmittedAt: row.resubmitted_at || undefined,
    applicationVersion: row.application_version || 1,
  });

  const loadProfiles = async () => {
    try {
      // Load both pending AND rejected_needs_update (they stay in Awaiting Review)
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("*")
        .in("vetting_status", ["pending", "rejected_needs_update"])
        .order("applied_at", { ascending: false });

      if (error) throw error;
      setProfiles((data || []).map(mapRowToProfile));
    } catch (error: any) {
      console.error("Error loading pending profiles:", error);
      toast.error("Failed to load pending profiles");
    }
  };

  const loadArchivedProfiles = async () => {
    setIsLoadingArchive(true);
    try {
      // Only rejected_final and deactivated go to Archived
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("*")
        .in("vetting_status", ["rejected", "rejected_final", "deactivated"])
        .order("vetting_updated_at", { ascending: false });

      if (error) throw error;
      setArchivedProfiles((data || []).map(mapRowToProfile));
    } catch (error: any) {
      console.error("Error loading archived profiles:", error);
      toast.error("Failed to load archived profiles");
    } finally {
      setIsLoadingArchive(false);
    }
  };

  // All loaded profiles are already pending or needs_update
  const pendingProfiles = profiles;

  // Search + filter
  const filteredProfiles = useMemo(() => {
    let result = pendingProfiles;
    
    if (filterNeedsUpdate) {
      result = result.filter(p => p.vettingStatus === "rejected_needs_update");
    }
    
    if (!searchQuery.trim()) return result;
    
    const query = searchQuery.toLowerCase();
    return result.filter(psw => {
      const fullName = `${psw.firstName} ${psw.lastName}`.toLowerCase();
      const city = (psw.homeCity || "").toLowerCase();
      const languages = psw.languages.map(l => getLanguageName(l).toLowerCase()).join(" ");
      
      return fullName.includes(query) || 
             city.includes(query) || 
             languages.includes(query) ||
             psw.phone.includes(query);
    });
  }, [pendingProfiles, searchQuery, filterNeedsUpdate]);

  // Filtered archived profiles
  const filteredArchivedProfiles = useMemo(() => {
    if (!archiveSearchQuery.trim()) return archivedProfiles;
    
    const query = archiveSearchQuery.toLowerCase();
    return archivedProfiles.filter(psw => {
      const fullName = `${psw.firstName} ${psw.lastName}`.toLowerCase();
      return fullName.includes(query) || 
             psw.email.toLowerCase().includes(query) ||
             psw.phone.includes(query);
    });
  }, [archivedProfiles, archiveSearchQuery]);

  // Archive stats
  const rejectedCount = archivedProfiles.filter(p => 
    p.vettingStatus === "rejected" || p.vettingStatus === "rejected_final"
  ).length;
  const deactivatedCount = archivedProfiles.filter(p => p.vettingStatus === "deactivated").length;
  const needsUpdateCount = profiles.filter(p => p.vettingStatus === "rejected_needs_update").length;

  const handleApprove = (psw: ExtendedPSWProfile) => {
    setSelectedPSW(psw);
    setShowApproveDialog(true);
  };

  const handleRejectNeedsUpdate = (psw: ExtendedPSWProfile) => {
    setSelectedPSW(psw);
    setRejectionType("needs_update");
    setShowRejectionDialog(true);
  };

  const handleRejectFinal = (psw: ExtendedPSWProfile) => {
    setSelectedPSW(psw);
    setRejectionType("final");
    setShowRejectionDialog(true);
  };

  const confirmApprove = async () => {
    if (!selectedPSW) return;

    // Gov ID gate
    if (selectedPSW.govIdStatus !== "verified") {
      toast.error("Government ID must be verified before approval", {
        description: "Please review and verify the PSW's government ID first.",
      });
      setShowApproveDialog(false);
      return;
    }
    
    try {
      // First, assign PSW number if not already assigned
      let assignedPswNumber: number | null = null;
      
      const { data: currentProfile } = await supabase
        .from("psw_profiles")
        .select("psw_number")
        .eq("id", selectedPSW.id)
        .single();
      
      if (!currentProfile?.psw_number) {
        // Get next PSW number: find max existing + 1
        const { data: maxData } = await supabase
          .from("psw_profiles")
          .select("psw_number")
          .not("psw_number", "is", null)
          .order("psw_number", { ascending: false })
          .limit(1)
          .single();
        
        assignedPswNumber = ((maxData?.psw_number as number) || 1000) + 1;
      } else {
        assignedPswNumber = currentProfile.psw_number as number;
      }

      const { error: updateError } = await supabase
        .from("psw_profiles")
        .update({
          vetting_status: "approved",
          vetting_notes: "Approved by admin",
          vetting_updated_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          last_status_change_at: new Date().toISOString(),
          rejection_reasons: null,
          rejection_notes: null,
          rejected_at: null,
          ...(assignedPswNumber && !currentProfile?.psw_number ? { psw_number: assignedPswNumber } : {}),
        })
        .eq("id", selectedPSW.id);

      if (updateError) throw updateError;

      const pswNumberLabel = assignedPswNumber ? `PSW-${assignedPswNumber}` : "";

      await supabase.from("psw_status_audit").insert({
        psw_id: selectedPSW.id,
        psw_name: `${selectedPSW.firstName} ${selectedPSW.lastName}`,
        psw_email: selectedPSW.email,
        action: "activated",
        reason: `Approved by admin${pswNumberLabel ? ` → assigned ${pswNumberLabel}` : ""}`,
        performed_by: "admin",
      });

      updateVettingStatus(selectedPSW.id, "approved", "Approved by admin");

      try {
        await sendPSWApprovedNotification(
          selectedPSW.email,
          selectedPSW.phone,
          selectedPSW.firstName,
          selectedPSW.lastName,
          assignedPswNumber
        );
      } catch (emailErr) {
        console.warn("Approval email failed (non-blocking):", emailErr);
      }
      
      toast.success(`${selectedPSW.firstName} ${selectedPSW.lastName} has been approved!${pswNumberLabel ? ` (${pswNumberLabel})` : ""}`, {
        description: "Welcome email with QR code has been sent.",
      });
    } catch (error: any) {
      console.error("Approval error:", error);
      toast.error("Failed to approve application", { description: error.message });
    } finally {
      setShowApproveDialog(false);
      setSelectedPSW(null);
      loadProfiles();
    }
  };

  const confirmRejection = async (reasons: string[], notes: string) => {
    if (!selectedPSW) return;
    setIsRejecting(true);
    
    const newStatus = rejectionType === "needs_update" ? "rejected_needs_update" : "rejected_final";
    const reasonText = reasons.join("; ") + (notes ? ` — ${notes}` : "");
    
    try {
      const { error: updateError } = await supabase
        .from("psw_profiles")
        .update({
          vetting_status: newStatus,
          vetting_notes: reasonText,
          vetting_updated_at: new Date().toISOString(),
          rejection_reasons: reasons,
          rejection_notes: notes || null,
          rejected_at: new Date().toISOString(),
          last_status_change_at: new Date().toISOString(),
        })
        .eq("id", selectedPSW.id);

      if (updateError) throw updateError;

      await supabase.from("psw_status_audit").insert({
        psw_id: selectedPSW.id,
        psw_name: `${selectedPSW.firstName} ${selectedPSW.lastName}`,
        psw_email: selectedPSW.email,
        action: rejectionType === "needs_update" ? "rejected_needs_update" : "rejected_final",
        reason: reasonText,
        performed_by: "admin",
      });

      // Send update-required email for needs_update
      if (rejectionType === "needs_update") {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: selectedPSW.email,
              subject: "Your PSA Direct Application Needs Updates",
              html: `<p>Hi ${selectedPSW.firstName},</p>
<p>Your application to join PSA Direct needs some updates before we can proceed:</p>
<ul>${reasons.map(r => `<li>${r}</li>`).join("")}</ul>
${notes ? `<p><strong>Additional notes:</strong> ${notes}</p>` : ""}
<p>Please log in and update your application:</p>
<p><a href="https://psadirect.ca/psw-login" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Update Your Application</a></p>
<p>Once updated, click "Resubmit Application" and our team will review it again.</p>
<p>Questions? Call us at (249) 288-4787</p>`,
            },
          });
        } catch (emailErr) {
          console.warn("Update-required email failed:", emailErr);
        }
      }

      toast.success(
        rejectionType === "needs_update"
          ? `Update request sent to ${selectedPSW.firstName}`
          : `Application from ${selectedPSW.firstName} rejected (final).`
      );
    } catch (error: any) {
      console.error("Rejection error:", error);
      toast.error("Failed to process rejection");
    } finally {
      setIsRejecting(false);
      setShowRejectionDialog(false);
      setSelectedPSW(null);
      loadProfiles();
      if (rejectionType === "final") loadArchivedProfiles();
    }
  };

  const handleReinstate = async (psw: ExtendedPSWProfile) => {
    setIsReinstating(true);
    try {
      // Reinstate always returns to pending
      const { error: updateError } = await supabase
        .from("psw_profiles")
        .update({
          vetting_status: "pending",
          vetting_notes: `Reinstated from ${psw.vettingStatus} for re-review`,
          vetting_updated_at: new Date().toISOString(),
          last_status_change_at: new Date().toISOString(),
          rejection_reasons: null,
          rejection_notes: null,
          rejected_at: null,
        })
        .eq("id", psw.id);

      if (updateError) throw updateError;

      await supabase.from("psw_status_audit").insert({
        psw_id: psw.id,
        psw_name: `${psw.firstName} ${psw.lastName}`,
        psw_email: psw.email,
        action: "reinstated_to_pending",
        reason: `Reinstated from ${psw.vettingStatus}`,
        performed_by: "admin",
      });

      toast.success(`${psw.firstName} ${psw.lastName} moved back to Pending Review`);
      loadProfiles();
      loadArchivedProfiles();
    } catch (error: any) {
      console.error("Reinstatement error:", error);
      toast.error("Failed to reinstate PSW");
    } finally {
      setIsReinstating(false);
      setShowReinstateDialog(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getExperienceLabel = (exp?: string) => {
    switch (exp) {
      case "0-1": return "< 1 year";
      case "1-3": return "1-3 years";
      case "3-5": return "3-5 years";
      case "5+": return "5+ years";
      default: return exp || "Not specified";
    }
  };

  const getTransportLabel = (transport?: string) => {
    switch (transport) {
      case "yes-car": return "Has car";
      case "yes-transit": return "Public transit";
      case "no": return "No transportation";
      default: return transport || "Not specified";
    }
  };

  const getAddress = (pswId: string) => {
    const psw = profiles.find(p => p.id === pswId);
    return { 
      street: "", 
      city: psw?.homeCity || "Unknown", 
      postalCode: psw?.homePostalCode || "" 
    };
  };

  const checkServiceArea = (postalCode: string) => {
    if (!postalCode) return { withinRadius: false, message: "No postal code provided" };
    const approvedPSWs = profiles.filter(p => p.vettingStatus === "approved" && p.homePostalCode);
    if (approvedPSWs.length === 0) {
      return { withinRadius: true, message: "First PSW applicant in this area" };
    }
    let closestDistance: number | null = null;
    let closestCity: string | null = null;
    for (const psw of approvedPSWs) {
      const distance = calculateDistanceBetweenPostalCodes(postalCode, psw.homePostalCode || "");
      if (distance !== null && (closestDistance === null || distance < closestDistance)) {
        closestDistance = distance;
        closestCity = psw.homeCity || null;
      }
    }
    if (closestDistance !== null && closestDistance <= activeServiceRadius) {
      return { withinRadius: true, message: `Within ${Math.round(closestDistance)}km of ${closestCity || "approved PSW"}` };
    }
    if (closestDistance !== null) {
      return { withinRadius: false, message: `${Math.round(closestDistance)}km from nearest PSW coverage` };
    }
    return { withinRadius: false, message: "Unable to verify location" };
  };

  const openGoogleMaps = (pswId: string) => {
    const address = getAddress(pswId);
    const query = encodeURIComponent(`${address.street}, ${address.city}, ON ${address.postalCode}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  const getStatusBadge = (psw: ExtendedPSWProfile) => {
    if (psw.vettingStatus === "rejected_needs_update") {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <RefreshCw className="w-3 h-3 mr-1" />
          Needs Update {psw.applicationVersion && psw.applicationVersion > 1 ? `(v${psw.applicationVersion})` : ""}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        Pending Review
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Pending Review</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review applications and view archived records
        </p>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="awaiting-review" className="gap-2">
            <Clock className="w-4 h-4" />
            Awaiting Review
            {pendingProfiles.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {pendingProfiles.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="w-4 h-4" />
            Archived
            {archivedProfiles.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {archivedProfiles.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Awaiting Review Tab */}
        <TabsContent value="awaiting-review" className="mt-6 space-y-6">
          {pendingProfiles.length === 0 && !searchQuery ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Pending Applications</h3>
                <p className="text-muted-foreground">
                  All PSW applications have been reviewed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Search Bar + Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, city, or language..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {needsUpdateCount > 0 && (
                  <Button
                    variant={filterNeedsUpdate ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterNeedsUpdate(!filterNeedsUpdate)}
                    className="gap-1 whitespace-nowrap"
                  >
                    <Filter className="w-4 h-4" />
                    Needs Update ({needsUpdateCount})
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-card">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {profiles.filter(p => p.vettingStatus === "pending").length}
                        </p>
                        <p className="text-sm text-muted-foreground">New Applications</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{needsUpdateCount}</p>
                        <p className="text-sm text-muted-foreground">Needs Update</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pending List */}
              <div className="space-y-4">
                {filteredProfiles.length === 0 ? (
                  <Card className="shadow-card">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No applicants match your search
                    </CardContent>
                  </Card>
                ) : (
                  filteredProfiles.map((psw) => {
                    const isExpanded = expandedId === psw.id;
                    const address = getAddress(psw.id);
                    const serviceAreaCheck = checkServiceArea(address.postalCode);
                    const isNeedsUpdate = psw.vettingStatus === "rejected_needs_update";
                    
                    return (
                      <Card key={psw.id} className={`shadow-card overflow-hidden ${isNeedsUpdate ? "border-amber-300 bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-14 w-14 ring-2 ring-offset-2 ring-amber-200">
                                {psw.profilePhotoUrl ? (
                                  <AvatarImage src={psw.profilePhotoUrl} alt={psw.firstName} />
                                ) : null}
                                <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">
                                  {getInitials(psw.firstName, psw.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-lg">
                                  {psw.firstName} {psw.lastName}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Applied {formatDate(psw.appliedAt)}
                                  {psw.applicationVersion && psw.applicationVersion > 1 && (
                                    <span className="ml-2 text-xs font-medium text-amber-600">
                                      v{psw.applicationVersion}
                                    </span>
                                  )}
                                </CardDescription>
                              </div>
                            </div>
                            {getStatusBadge(psw)}
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Show rejection reasons if needs_update */}
                          {isNeedsUpdate && psw.rejectionReasons && psw.rejectionReasons.length > 0 && (
                            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                              <CardContent className="p-3 space-y-2">
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                  Items needing update:
                                </p>
                                <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 space-y-0.5">
                                  {psw.rejectionReasons.map((r, i) => (
                                    <li key={i}>{r}</li>
                                  ))}
                                </ul>
                                {psw.rejectionNotes && (
                                  <p className="text-sm text-amber-600 dark:text-amber-400 italic">
                                    Notes: {psw.rejectionNotes}
                                  </p>
                                )}
                                {psw.resubmittedAt && (
                                  <p className="text-xs text-emerald-600 font-medium mt-1">
                                    ✓ Resubmitted {formatShortDate(psw.resubmittedAt)}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {/* Vetting Checklist */}
                          <Card className="border-2 border-primary/20 bg-primary/5">
                            <CardContent className="p-4 space-y-3">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                Vetting Checklist
                              </h4>
                              
                              <div className="flex items-center justify-between p-2 bg-background rounded">
                                <span className="text-sm font-medium">HSCPOA Registration</span>
                                {psw.hscpoaNumber ? (
                                  <Badge variant="outline" className="font-mono text-emerald-600 bg-emerald-50 border-emerald-200">
                                    {psw.hscpoaNumber}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">
                                    Not provided
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center justify-between p-2 bg-background rounded">
                                <span className="text-sm font-medium">Police Check (VSS)</span>
                                {psw.policeCheckUrl ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(psw.policeCheckUrl, "_blank")}
                                    className="gap-1 text-emerald-600 border-emerald-300"
                                  >
                                    <FileText className="w-3 h-3" />
                                    View PDF
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">
                                    Not uploaded
                                  </Badge>
                                )}
                              </div>

                              {psw.hasOwnTransport === "yes-car" && (
                                <>
                                  <div className="flex items-center justify-between p-2 bg-background rounded">
                                    <span className="text-sm font-medium">Vehicle Photo</span>
                                    {psw.vehiclePhotoUrl ? (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setVehiclePhotoDialog(psw)}
                                        className="gap-1 text-emerald-600 border-emerald-300"
                                      >
                                        <Camera className="w-3 h-3" />
                                        View Photo
                                      </Button>
                                    ) : (
                                      <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">
                                        Not uploaded
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between p-2 bg-background rounded">
                                    <span className="text-sm font-medium">License Plate</span>
                                    {psw.licensePlate ? (
                                      <Badge variant="outline" className="font-mono text-emerald-600 bg-emerald-50 border-emerald-200">
                                        {psw.licensePlate}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">
                                        Not provided
                                      </Badge>
                                    )}
                                  </div>
                                </>
                               )}

                              {/* Government ID */}
                              <div className="flex items-center justify-between p-2 bg-background rounded">
                                <span className="text-sm font-medium">Government ID</span>
                                {psw.govIdStatus === "verified" ? (
                                  <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1">
                                    <Check className="w-3 h-3" />
                                    Verified
                                  </Badge>
                                ) : psw.govIdStatus === "uploaded" ? (
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">
                                      Uploaded — Needs Review
                                    </Badge>
                                  </div>
                                ) : psw.govIdStatus === "rejected" ? (
                                  <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200 gap-1">
                                    <X className="w-3 h-3" />
                                    Rejected
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">
                                    Not uploaded
                                  </Badge>
                                )}
                              </div>
                              {psw.govIdType && psw.govIdType !== "missing" && (
                                <div className="flex items-center justify-between p-2 bg-background rounded">
                                  <span className="text-sm font-medium">ID Type</span>
                                  <span className="text-sm text-muted-foreground capitalize">
                                    {psw.govIdType.replace(/_/g, " ")}
                                  </span>
                                </div>
                              )}
                              {(psw.govIdStatus === "uploaded" || psw.govIdStatus === "verified" || psw.govIdStatus === "rejected") && psw.govIdUrl && (
                                <div className="flex items-center gap-2 p-2 bg-background rounded">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      const { data: signedData } = await supabase.storage
                                        .from("psw-documents")
                                        .createSignedUrl(psw.govIdUrl!, 60 * 60);
                                      if (signedData?.signedUrl) {
                                        window.open(signedData.signedUrl, "_blank");
                                      } else {
                                        toast.error("Could not generate viewing link");
                                      }
                                    }}
                                    className="gap-1 text-blue-600 border-blue-300"
                                  >
                                    <FileText className="w-3 h-3" />
                                    View ID
                                  </Button>
                                  {psw.govIdStatus !== "verified" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        await supabase.from("psw_profiles").update({
                                          gov_id_status: "verified",
                                          gov_id_reviewed_at: new Date().toISOString(),
                                        }).eq("id", psw.id);
                                        await supabase.from("psw_status_audit").insert({
                                          psw_id: psw.id,
                                          psw_name: `${psw.firstName} ${psw.lastName}`,
                                          psw_email: psw.email,
                                          action: "gov_id_verified",
                                          reason: "Government ID verified by admin",
                                          performed_by: "admin",
                                        });
                                        toast.success("Government ID verified");
                                        loadProfiles();
                                      }}
                                      className="gap-1 text-emerald-600 border-emerald-300"
                                    >
                                      <Check className="w-3 h-3" />
                                      Verify ID
                                    </Button>
                                  )}
                                  {psw.govIdStatus !== "rejected" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        const note = prompt("Reason for rejecting ID:");
                                        if (note === null) return;
                                        await supabase.from("psw_profiles").update({
                                          gov_id_status: "rejected",
                                          gov_id_reviewed_at: new Date().toISOString(),
                                          gov_id_notes: note || "Rejected by admin",
                                        }).eq("id", psw.id);
                                        await supabase.from("psw_status_audit").insert({
                                          psw_id: psw.id,
                                          psw_name: `${psw.firstName} ${psw.lastName}`,
                                          psw_email: psw.email,
                                          action: "gov_id_rejected",
                                          reason: note || "Rejected by admin",
                                          performed_by: "admin",
                                        });
                                        toast.success("Government ID rejected");
                                        loadProfiles();
                                      }}
                                      className="gap-1 text-red-600 border-red-300"
                                    >
                                      <X className="w-3 h-3" />
                                      Reject ID
                                    </Button>
                                  )}
                                </div>
                              )}
                              {psw.govIdNotes && (
                                <p className="text-xs text-muted-foreground px-2">
                                  ID Note: {psw.govIdNotes}
                                </p>
                              )}
                            </CardContent>
                          </Card>

                          {/* Address with Service Area Check */}
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">{address.street}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {address.city}, ON {address.postalCode}
                                  </p>
                                  <div className="mt-1">
                                    {serviceAreaCheck.withinRadius ? (
                                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        Within service area
                                      </span>
                                    ) : (
                                      <span className="text-xs text-amber-600 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {serviceAreaCheck.message || "Outside service area"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openGoogleMaps(psw.id)}
                                className="shrink-0 gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Map
                              </Button>
                            </div>
                          </div>

                          {/* Contact */}
                          <div className="flex flex-wrap gap-4 text-sm">
                            <a 
                              href={`tel:${psw.phone.replace(/[^\d+]/g, "")}`}
                              className="flex items-center gap-2 text-primary hover:underline font-medium"
                            >
                              <Phone className="w-4 h-4" />
                              {psw.phone}
                            </a>
                            <a 
                              href={`mailto:${psw.email}`}
                              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                            >
                              <Mail className="w-4 h-4" />
                              {psw.email}
                            </a>
                          </div>

                          {/* Languages */}
                          {psw.languages.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              {psw.languages.map(lang => (
                                <Badge key={lang} variant="secondary" className="text-xs">
                                  {getLanguageName(lang)}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Quick Stats */}
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="gap-1">
                              <Award className="w-3 h-3" />
                              {getExperienceLabel(psw.yearsExperience)}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                              <Car className="w-3 h-3" />
                              {getTransportLabel(psw.hasOwnTransport)}
                            </Badge>
                          </div>

                          {/* Expandable Details */}
                          {isExpanded && (
                            <div className="pt-4 border-t border-border space-y-4">
                              {psw.certifications && (
                                <div>
                                  <p className="text-sm font-medium text-foreground mb-1">Certifications</p>
                                  <p className="text-sm text-muted-foreground">{psw.certifications}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedId(isExpanded ? null : psw.id)}
                            >
                              {isExpanded ? "Show Less" : "More Details"}
                            </Button>
                            <div className="flex-1" />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectFinal(psw)}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject Final
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectNeedsUpdate(psw)}
                              className="text-amber-600 hover:text-amber-700 border-amber-300"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Needs Update
                            </Button>
                            <Button
                              variant="brand"
                              size="sm"
                              onClick={() => handleApprove(psw)}
                              disabled={psw.govIdStatus !== "verified"}
                              title={psw.govIdStatus !== "verified" ? "Gov ID must be verified first" : ""}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            {psw.govIdStatus !== "verified" && (
                              <p className="text-xs text-amber-600 w-full mt-1">⚠ Gov ID must be verified before approval</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Archived Tab */}
        <TabsContent value="archived" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
                    <p className="text-sm text-muted-foreground">Rejected (Final)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Ban className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{deactivatedCount}</p>
                    <p className="text-sm text-muted-foreground">Deactivated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search archived PSWs by name, email, or phone..."
              value={archiveSearchQuery}
              onChange={(e) => setArchiveSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoadingArchive ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading archived records...</p>
              </CardContent>
            </Card>
          ) : filteredArchivedProfiles.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <Archive className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Archived Records</h3>
                <p className="text-muted-foreground">
                  {archiveSearchQuery ? "No records match your search" : "Final-rejected and deactivated PSWs will appear here."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PSW</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchivedProfiles.map((psw) => (
                    <TableRow key={psw.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {psw.profilePhotoUrl ? (
                              <AvatarImage src={psw.profilePhotoUrl} alt={psw.firstName} />
                            ) : null}
                            <AvatarFallback className={
                              psw.vettingStatus === "rejected" || psw.vettingStatus === "rejected_final"
                                ? "bg-red-100 text-red-700" 
                                : "bg-gray-100 text-gray-700"
                            }>
                              {getInitials(psw.firstName, psw.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{psw.firstName} {psw.lastName}</p>
                            <p className="text-xs text-muted-foreground">{psw.homeCity || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {psw.vettingStatus === "rejected" || psw.vettingStatus === "rejected_final" ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-700">
                            <Ban className="w-3 h-3" />
                            Deactivated
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <a 
                            href={`mailto:${psw.email}`}
                            className="text-sm text-primary hover:underline block truncate max-w-[180px]"
                          >
                            {psw.email}
                          </a>
                          {psw.phone && (
                            <a 
                              href={`tel:${psw.phone.replace(/[^\d+]/g, "")}`}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              {psw.phone}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatShortDate(psw.vettingUpdatedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {psw.vettingNotes || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowReinstateDialog(psw)}
                          className="gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reinstate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve PSW Application</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Approve <strong>{selectedPSW?.firstName} {selectedPSW?.lastName}</strong> as a PSW?
                </p>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium text-foreground mb-1">This will:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Grant full access to the PSW portal</li>
                    <li>Allow them to view and accept shifts</li>
                    <li>Send automated welcome email with QR code for app install</li>
                    <li>Include professional standards reminder</li>
                  </ul>
                </div>
                
                {selectedPSW && (
                  <ApprovalEmailPreview firstName={selectedPSW.firstName} lastName={selectedPSW.lastName} />
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} className="bg-primary">
              Approve & Send Welcome Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Reasons Dialog */}
      <RejectionReasonsDialog
        open={showRejectionDialog}
        onOpenChange={setShowRejectionDialog}
        rejectionType={rejectionType}
        pswName={selectedPSW ? `${selectedPSW.firstName} ${selectedPSW.lastName}` : ""}
        onConfirm={confirmRejection}
        isLoading={isRejecting}
      />

      {/* Reinstate Dialog */}
      <Dialog open={!!showReinstateDialog} onOpenChange={() => setShowReinstateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-500" />
              Reinstate PSW
            </DialogTitle>
            <DialogDescription>
              Move <strong>{showReinstateDialog?.firstName} {showReinstateDialog?.lastName}</strong> back to 
              <strong> Pending Review</strong> for re-evaluation?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowReinstateDialog(null)} disabled={isReinstating}>
              Cancel
            </Button>
            <Button 
              onClick={() => showReinstateDialog && handleReinstate(showReinstateDialog)}
              disabled={isReinstating}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isReinstating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Move to Pending
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Photo Dialog */}
      <Dialog open={!!vehiclePhotoDialog} onOpenChange={() => setVehiclePhotoDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicle Photo - {vehiclePhotoDialog?.firstName} {vehiclePhotoDialog?.lastName}
            </DialogTitle>
          </DialogHeader>
          {vehiclePhotoDialog?.vehiclePhotoUrl && (
            <img 
              src={vehiclePhotoDialog.vehiclePhotoUrl} 
              alt="Vehicle" 
              className="w-full rounded-lg"
            />
          )}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">License Plate:</span>
            <span className="font-mono font-semibold">
              {vehiclePhotoDialog?.licensePlate || "Not provided"}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

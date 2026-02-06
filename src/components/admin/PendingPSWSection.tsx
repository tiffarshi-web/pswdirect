// Pending PSW Applications Section - For reviewing new applicants
// Shows compliance documents, address, and quick vetting actions
// Includes Archive tab for rejected and deactivated PSWs

import { useState, useEffect, useMemo } from "react";
import { Check, X, Clock, Mail, Phone, Award, Car, Calendar, MapPin, FileText, Shield, Search, ExternalLink, Globe, AlertCircle, Camera, Archive, Ban, RotateCcw, XCircle, Loader2 } from "lucide-react";
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
  getPSWProfiles, 
  updateVettingStatus,
  initializePSWProfiles 
} from "@/lib/pswProfileStore";
import { getLanguageName } from "@/lib/languageConfig";
import { isPostalCodeWithinServiceRadius } from "@/lib/postalCodeUtils";

// Re-export for backward compatibility
type PSWProfile = PSAProfile;
import { SERVICE_RADIUS_KM } from "@/lib/businessConfig";
import { sendPSWApprovedNotification } from "@/lib/notificationService";
import ApprovalEmailPreview from "./ApprovalEmailPreview";
import { supabase } from "@/integrations/supabase/client";

// Mock address data for pending applicants
const mockPendingAddresses: Record<string, { street: string; city: string; postalCode: string }> = {
  "PSW-PENDING-001": { street: "100 Front Street", city: "Toronto", postalCode: "M5J 1E3" },
};

export const PendingPSWSection = () => {
  const [profiles, setProfiles] = useState<PSWProfile[]>([]);
  const [archivedProfiles, setArchivedProfiles] = useState<PSWProfile[]>([]);
  const [selectedPSW, setSelectedPSW] = useState<PSWProfile | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showReinstateDialog, setShowReinstateDialog] = useState<PSWProfile | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [vehiclePhotoDialog, setVehiclePhotoDialog] = useState<PSWProfile | null>(null);
  const [activeTab, setActiveTab] = useState("awaiting-review");
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [isReinstating, setIsReinstating] = useState(false);

  useEffect(() => {
    initializePSWProfiles();
    loadProfiles();
  }, []);

  useEffect(() => {
    if (activeTab === "archived") {
      loadArchivedProfiles();
    }
  }, [activeTab]);

  const loadProfiles = () => {
    const loaded = getPSWProfiles();
    setProfiles(loaded);
  };

  const loadArchivedProfiles = async () => {
    setIsLoadingArchive(true);
    try {
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("*")
        .in("vetting_status", ["rejected", "deactivated"])
        .order("vetting_updated_at", { ascending: false });

      if (error) throw error;

      const mapped: PSWProfile[] = (data || []).map((row) => ({
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
      }));

      setArchivedProfiles(mapped);
    } catch (error: any) {
      console.error("Error loading archived profiles:", error);
      toast.error("Failed to load archived profiles");
    } finally {
      setIsLoadingArchive(false);
    }
  };

  // Filter pending profiles only
  const pendingProfiles = useMemo(() => {
    return profiles.filter(p => p.vettingStatus === "pending");
  }, [profiles]);

  // Search filter for pending
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return pendingProfiles;
    
    const query = searchQuery.toLowerCase();
    return pendingProfiles.filter(psw => {
      const fullName = `${psw.firstName} ${psw.lastName}`.toLowerCase();
      const address = mockPendingAddresses[psw.id];
      const city = address?.city.toLowerCase() || "";
      const languages = psw.languages.map(l => getLanguageName(l).toLowerCase()).join(" ");
      
      return fullName.includes(query) || 
             city.includes(query) || 
             languages.includes(query) ||
             psw.phone.includes(query);
    });
  }, [pendingProfiles, searchQuery]);

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
  const rejectedCount = archivedProfiles.filter(p => p.vettingStatus === "rejected").length;
  const deactivatedCount = archivedProfiles.filter(p => p.vettingStatus === "deactivated").length;

  const handleApprove = (psw: PSWProfile) => {
    setSelectedPSW(psw);
    setShowApproveDialog(true);
  };

  const handleReject = (psw: PSWProfile) => {
    setSelectedPSW(psw);
    setShowRejectDialog(true);
  };

  const confirmApprove = async () => {
    if (!selectedPSW) return;
    
    // Update status in database/store
    updateVettingStatus(selectedPSW.id, "approved", "Approved by admin");
    
    // Send automated approval email with QR code
    await sendPSWApprovedNotification(
      selectedPSW.email,
      selectedPSW.phone,
      selectedPSW.firstName
    );
    
    loadProfiles();
    
    toast.success(`${selectedPSW.firstName} ${selectedPSW.lastName} has been approved!`, {
      description: "Welcome email with QR code has been sent.",
    });
    
    setShowApproveDialog(false);
    setSelectedPSW(null);
  };

  const confirmReject = async () => {
    if (!selectedPSW) return;
    
    try {
      // Update status in database
      const { error: updateError } = await supabase
        .from("psw_profiles")
        .update({
          vetting_status: "rejected",
          vetting_notes: "Application rejected",
          vetting_updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPSW.id);

      if (updateError) throw updateError;

      // Log to audit trail
      const { error: auditError } = await supabase.from("psw_status_audit").insert({
        psw_id: selectedPSW.id,
        psw_name: `${selectedPSW.firstName} ${selectedPSW.lastName}`,
        psw_email: selectedPSW.email,
        action: "rejected",
        reason: "Application rejected",
        performed_by: "admin",
      });

      if (auditError) {
        console.error("Failed to log audit entry:", auditError);
      }

      // Also update local store
      updateVettingStatus(selectedPSW.id, "rejected", "Application rejected");
      loadProfiles();
      
      toast.success(`Application from ${selectedPSW.firstName} ${selectedPSW.lastName} has been rejected.`);
    } catch (error: any) {
      console.error("Rejection error:", error);
      toast.error("Failed to reject application");
    }
    
    setShowRejectDialog(false);
    setSelectedPSW(null);
  };

  const handleReinstate = async (psw: PSWProfile) => {
    setIsReinstating(true);
    try {
      const newStatus = psw.vettingStatus === "rejected" ? "pending" : "approved";
      const actionLabel = psw.vettingStatus === "rejected" ? "reinstated_to_pending" : "reinstated";
      
      // Update status in database
      const { error: updateError } = await supabase
        .from("psw_profiles")
        .update({
          vetting_status: newStatus,
          vetting_notes: `Reinstated for ${psw.vettingStatus === "rejected" ? "re-review" : "active duty"}`,
          vetting_updated_at: new Date().toISOString(),
        })
        .eq("id", psw.id);

      if (updateError) throw updateError;

      // Log to audit trail
      const { error: auditError } = await supabase.from("psw_status_audit").insert({
        psw_id: psw.id,
        psw_name: `${psw.firstName} ${psw.lastName}`,
        psw_email: psw.email,
        action: actionLabel,
        reason: `Reinstated from ${psw.vettingStatus}`,
        performed_by: "admin",
      });

      if (auditError) {
        console.error("Failed to log audit entry:", auditError);
      }

      toast.success(
        psw.vettingStatus === "rejected"
          ? `${psw.firstName} ${psw.lastName} moved back to Pending Review`
          : `${psw.firstName} ${psw.lastName} has been reinstated`
      );

      // Reload both lists
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
    return mockPendingAddresses[pswId] || { street: "Address not provided", city: "Unknown", postalCode: "" };
  };

  const checkServiceArea = (postalCode: string) => {
    if (!postalCode) return { withinRadius: false, message: "No postal code provided" };
    return isPostalCodeWithinServiceRadius(postalCode, 75);
  };

  const openGoogleMaps = (pswId: string) => {
    const address = getAddress(pswId);
    const query = encodeURIComponent(`${address.street}, ${address.city}, ON ${address.postalCode}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

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
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, city, or language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Stats */}
              <Card className="shadow-card">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{pendingProfiles.length}</p>
                      <p className="text-sm text-muted-foreground">Awaiting Review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                    
                    return (
                      <Card key={psw.id} className="shadow-card overflow-hidden">
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
                                </CardDescription>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Pending Review
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Vetting Checklist - Prominent */}
                          <Card className="border-2 border-primary/20 bg-primary/5">
                            <CardContent className="p-4 space-y-3">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                Vetting Checklist
                              </h4>
                              
                              {/* HSCPOA Number */}
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

                              {/* Police Check */}
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

                              {/* Vehicle Photo & License Plate - Only shown if PSW has a car */}
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
                                  {/* Service Area Status */}
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

                          {/* Contact - Click to Call */}
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
                          <div className="flex items-center gap-2 pt-2 border-t border-border">
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
                              onClick={() => handleReject(psw)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              variant="brand"
                              size="sm"
                              onClick={() => handleApprove(psw)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
                    <p className="text-sm text-muted-foreground">Rejected</p>
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

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search archived PSWs by name, email, or phone..."
              value={archiveSearchQuery}
              onChange={(e) => setArchiveSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Archived Table */}
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
                  {archiveSearchQuery ? "No records match your search" : "Rejected and deactivated PSWs will appear here."}
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
                              psw.vettingStatus === "rejected" 
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
                        {psw.vettingStatus === "rejected" ? (
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
                
                {/* Email Preview */}
                {selectedPSW && (
                  <ApprovalEmailPreview firstName={selectedPSW.firstName} />
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

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Reject the application from <strong>{selectedPSW?.firstName} {selectedPSW?.lastName}</strong>?
              They will be notified via email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reject Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reinstate Dialog */}
      <Dialog open={!!showReinstateDialog} onOpenChange={() => setShowReinstateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-500" />
              Reinstate PSW
            </DialogTitle>
            <DialogDescription>
              {showReinstateDialog?.vettingStatus === "rejected" ? (
                <>
                  Move <strong>{showReinstateDialog?.firstName} {showReinstateDialog?.lastName}</strong> back to 
                  <strong> Pending Review</strong> for re-evaluation?
                </>
              ) : (
                <>
                  Reinstate <strong>{showReinstateDialog?.firstName} {showReinstateDialog?.lastName}</strong> as an 
                  <strong> Active PSW</strong>? They will be able to log in and accept shifts again.
                </>
              )}
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
                  {showReinstateDialog?.vettingStatus === "rejected" ? "Move to Pending" : "Reinstate"}
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

// Pending Review Section - For reviewing new PSW applicants
// Shows ONLY pending applicants with Police Check and HSCPOA highlighted

import { useState, useEffect, useMemo } from "react";
import { Check, X, Clock, Mail, Phone, Award, Car, MapPin, FileText, Search, ExternalLink, Globe, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { 
  PSWProfile, 
  getPSWProfiles, 
  updateVettingStatus,
  initializePSWProfiles 
} from "@/lib/pswProfileStore";
import { getLanguageName } from "@/lib/languageConfig";
import { isPostalCodeWithinServiceRadius } from "@/lib/postalCodeUtils";

// Mock address data for pending applicants
const mockPendingAddresses: Record<string, { street: string; city: string; postalCode: string }> = {
  "PSW-PENDING-001": { street: "100 Front Street", city: "Toronto", postalCode: "M5J 1E3" },
};

export const PendingReviewSection = () => {
  const [profiles, setProfiles] = useState<PSWProfile[]>([]);
  const [selectedPSW, setSelectedPSW] = useState<PSWProfile | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    initializePSWProfiles();
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const loaded = getPSWProfiles();
    setProfiles(loaded);
  };

  // Filter pending profiles only
  const pendingProfiles = useMemo(() => {
    return profiles.filter(p => p.vettingStatus === "pending");
  }, [profiles]);

  // Search filter
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

  const handleApprove = (psw: PSWProfile) => {
    setSelectedPSW(psw);
    setShowApproveDialog(true);
  };

  const handleReject = (psw: PSWProfile) => {
    setSelectedPSW(psw);
    setShowRejectDialog(true);
  };

  const confirmApprove = () => {
    if (!selectedPSW) return;
    
    updateVettingStatus(selectedPSW.id, "approved", "Approved by admin");
    loadProfiles();
    
    toast.success(`${selectedPSW.firstName} ${selectedPSW.lastName} has been approved!`, {
      description: "They will now appear in the Active PSWs tab.",
    });
    
    setShowApproveDialog(false);
    setSelectedPSW(null);
  };

  const confirmReject = () => {
    if (!selectedPSW) return;
    
    updateVettingStatus(selectedPSW.id, "rejected", "Application rejected");
    loadProfiles();
    
    toast.success(`Application from ${selectedPSW.firstName} ${selectedPSW.lastName} has been rejected.`);
    
    setShowRejectDialog(false);
    setSelectedPSW(null);
  };

  const formatDate = (dateString: string) => {
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

  if (pendingProfiles.length === 0 && !searchQuery) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
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
      <Card className="shadow-card border-l-4 border-l-amber-500">
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
                  {/* Vetting Checklist - RED HIGHLIGHTED */}
                  <Card className="border-2 border-red-400 bg-red-50/50 dark:bg-red-950/20">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        ⚠️ VETTING REQUIRED
                      </h4>
                      
                      {/* HSCPOA Number - RED highlighted */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-background rounded border border-red-200 dark:border-red-800">
                        <span className="text-sm font-bold text-red-700 dark:text-red-400">HSCPOA Number</span>
                        {psw.hscpoaNumber ? (
                          <Badge className="font-mono text-lg bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300">
                            {psw.hscpoaNumber}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500 text-white animate-pulse">
                            ⚠️ MISSING
                          </Badge>
                        )}
                      </div>

                      {/* Police Check - RED highlighted */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-background rounded border border-red-200 dark:border-red-800">
                        <span className="text-sm font-bold text-red-700 dark:text-red-400">Police Check (VSS)</span>
                        {psw.policeCheckUrl ? (
                          <Button 
                            size="sm"
                            onClick={() => window.open(psw.policeCheckUrl, "_blank")}
                            className="gap-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            <FileText className="w-4 h-4" />
                            VERIFY PDF
                          </Button>
                        ) : (
                          <Badge className="bg-red-500 text-white animate-pulse">
                            ⚠️ NOT UPLOADED
                          </Badge>
                        )}
                      </div>
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
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

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve PSW Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve {selectedPSW?.firstName} {selectedPSW?.lastName} and move them to the Active PSWs tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} className="bg-emerald-600 hover:bg-emerald-700">
              Approve
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
              Are you sure you want to reject the application from {selectedPSW?.firstName} {selectedPSW?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReject} className="bg-destructive hover:bg-destructive/90">
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

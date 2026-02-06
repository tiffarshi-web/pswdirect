// Active Team Section - Displays approved PSWs in a table format
// Includes search, address display, map links, and click-to-call
// Uses database-backed status (vetting_status) for persistence

import { useState, useEffect, useMemo } from "react";
import { Users, Phone, AlertTriangle, CheckCircle, XCircle, Flag, Shield, Eye, MapPin, Search, ExternalLink, Car, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  PSWProfile, 
  getPSWProfiles, 
  initializePSWProfiles 
} from "@/lib/pswProfileStore";
import { getLanguageName } from "@/lib/languageConfig";
import { PSWProfileCard } from "./PSWProfileCard";
import { PSWStatusDialog } from "./PSWStatusDialog";
import { PSWStatusAuditLog } from "./PSWStatusAuditLog";

// Status type from database
type PSWVettingStatus = "pending" | "approved" | "flagged" | "deactivated" | "rejected";


export const PSWOversightSection = () => {
  const [profiles, setProfiles] = useState<PSWProfile[]>([]);
  const [selectedPSW, setSelectedPSW] = useState<PSWProfile | null>(null);
  const [profileCardOpen, setProfileCardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Status dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"flag" | "deactivate" | "reinstate">("flag");

  const loadProfiles = async () => {
    // Fetch from Supabase - include all non-pending statuses for oversight
    const { data, error } = await supabase
      .from("psw_profiles")
      .select("*")
      .in("vetting_status", ["approved", "flagged", "deactivated"])
      .order("first_name");

    if (error) {
      console.error("Error fetching PSW profiles:", error);
      // Fallback to local store
      initializePSWProfiles();
      const loaded = getPSWProfiles();
      setProfiles(loaded.filter(p => ["approved", "flagged", "deactivated"].includes(p.vettingStatus)));
    } else {
      // Map database fields to PSWProfile interface
      const mapped: PSWProfile[] = (data || []).map((p) => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        phone: p.phone || "",
        gender: p.gender as any,
        homePostalCode: p.home_postal_code || undefined,
        homeCity: p.home_city || undefined,
        profilePhotoUrl: p.profile_photo_url || undefined,
        profilePhotoName: p.profile_photo_name || undefined,
        hscpoaNumber: p.hscpoa_number || undefined,
        policeCheckUrl: p.police_check_url || undefined,
        policeCheckName: p.police_check_name || undefined,
        policeCheckDate: p.police_check_date || undefined,
        languages: p.languages || ["en"],
        vettingStatus: p.vetting_status as any,
        vettingNotes: p.vetting_notes || undefined,
        appliedAt: p.applied_at || undefined,
        approvedAt: p.approved_at || undefined,
        yearsExperience: p.years_experience || undefined,
        certifications: p.certifications || undefined,
        hasOwnTransport: p.has_own_transport || undefined,
        licensePlate: p.license_plate || undefined,
        availableShifts: p.available_shifts || undefined,
        vehicleDisclaimer: p.vehicle_disclaimer as any,
        vehiclePhotoUrl: p.vehicle_photo_url || undefined,
        vehiclePhotoName: p.vehicle_photo_name || undefined,
      }));
      setProfiles(mapped);
    }
  };

  useEffect(() => {
    loadProfiles();

    // Auto-refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadProfiles();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', loadProfiles);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', loadProfiles);
    };
  }, []);

  // Search filter - show all statuses
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    
    const query = searchQuery.toLowerCase();
    return profiles.filter(psw => {
      const fullName = `${psw.firstName} ${psw.lastName}`.toLowerCase();
      const city = psw.homeCity?.toLowerCase() || "";
      const postalCode = psw.homePostalCode?.toLowerCase() || "";
      const languages = psw.languages.map(l => getLanguageName(l).toLowerCase()).join(" ");
      
      return fullName.includes(query) || 
             city.includes(query) || 
             postalCode.includes(query) ||
             languages.includes(query) ||
             psw.phone.includes(query) ||
             psw.email.toLowerCase().includes(query) ||
             psw.vettingStatus.includes(query);
    });
  }, [profiles, searchQuery]);

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

  const openStatusDialog = (psw: PSWProfile, action: "flag" | "deactivate" | "reinstate") => {
    setSelectedPSW(psw);
    setStatusAction(action);
    setStatusDialogOpen(true);
  };

  const handleStatusSuccess = () => {
    loadProfiles();
  };

  const openGoogleMaps = (psw: PSWProfile) => {
    const query = encodeURIComponent(`${psw.homeCity || "Toronto"}, ON ${psw.homePostalCode || ""}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  // Get status badge based on vetting_status from database
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
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
      case "deactivated":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Deactivated
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  // Count by vetting_status
  const activeCount = filteredProfiles.filter(p => p.vettingStatus === "approved").length;
  const flaggedCount = filteredProfiles.filter(p => p.vettingStatus === "flagged").length;
  const deactivatedCount = filteredProfiles.filter(p => p.vettingStatus === "deactivated").length;

  return (
    <div className="space-y-6">
      {/* Privacy Note */}
      <Card className="shadow-card border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">PHIPA Privacy Protocol</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clients only see PSW <strong>First Name + Photo</strong>. Full addresses, last names, and phone numbers are <strong>never visible to clients</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
      <div className="grid grid-cols-4 gap-4">
        <Card className="shadow-card border-l-4 border-l-emerald-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
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
            <p className="text-2xl font-bold text-foreground">{deactivatedCount}</p>
            <p className="text-xs text-muted-foreground">Deactivated</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{filteredProfiles.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Active Team
          </CardTitle>
          <CardDescription>
            Approved PSWs ready for shift assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No PSWs match your search" : "No approved PSWs yet"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Photo</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Postal Code</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((psw) => {
                    const status = psw.vettingStatus;
                    
                    return (
                      <TableRow 
                        key={psw.id}
                        className={status === "deactivated" ? "opacity-50" : ""}
                      >
                        {/* Photo */}
                        <TableCell>
                          <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-primary/20">
                            {psw.profilePhotoUrl ? (
                              <AvatarImage src={psw.profilePhotoUrl} alt={psw.firstName} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {getInitials(psw.firstName, psw.lastName)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        
                        {/* First Name */}
                        <TableCell>
                          <button
                            onClick={() => handleViewProfile(psw)}
                            className="font-semibold text-foreground hover:text-primary hover:underline text-left"
                          >
                            {psw.firstName}
                          </button>
                        </TableCell>
                        
                        {/* Last Name */}
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {psw.lastName}
                          </span>
                        </TableCell>
                        
                        {/* Gender */}
                        <TableCell>
                          <span className="text-sm capitalize">
                            {psw.gender || "-"}
                          </span>
                        </TableCell>
                        
                        {/* Transport & Insurance */}
                        <TableCell>
                          {psw.hasOwnTransport === "yes-car" ? (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                <Car className="w-3 h-3 mr-1" />
                                Vehicle
                              </Badge>
                              {psw.vehicleDisclaimer?.accepted ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Insured ✓
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                                  No Disclaimer
                                </Badge>
                              )}
                            </div>
                          ) : psw.hasOwnTransport === "yes-transit" ? (
                            <Badge variant="outline" className="text-xs">Transit</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        
                        {/* Languages */}
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {psw.languages.length > 0 ? (
                              psw.languages.slice(0, 3).map(lang => (
                                <Badge key={lang} variant="secondary" className="text-xs">
                                  {getLanguageName(lang)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                            {psw.languages.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{psw.languages.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        {/* City */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{psw.homeCity || "-"}</span>
                          </div>
                        </TableCell>
                        
                        {/* Postal Code */}
                        <TableCell>
                          <button
                            onClick={() => openGoogleMaps(psw)}
                            className="flex items-center gap-1 text-sm text-primary hover:underline font-mono"
                            title="View on map"
                          >
                            {psw.homePostalCode || "-"}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </TableCell>
                        
                        {/* Phone - Click to Call */}
                        <TableCell>
                          <a 
                            href={`tel:${psw.phone.replace(/[^\d+]/g, "")}`}
                            className="flex items-center gap-1 text-primary hover:underline font-medium text-sm"
                          >
                            <Phone className="w-3 h-3" />
                            {psw.phone}
                          </a>
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell>
                          {getStatusBadge(status)}
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewProfile(psw)}
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {status === "approved" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => openStatusDialog(psw, "flag")}
                                  title="Flag"
                                >
                                  <Flag className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openStatusDialog(psw, "deactivate")}
                                  title="Deactivate"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {status === "flagged" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => openStatusDialog(psw, "reinstate")}
                                  title="Reinstate"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openStatusDialog(psw, "deactivate")}
                                  title="Deactivate"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {status === "deactivated" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => openStatusDialog(psw, "reinstate")}
                                title="Reinstate"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Section */}
      <PSWStatusAuditLog />

      {/* Profile Card Dialog */}
      {selectedPSW && profileCardOpen && (
        <PSWProfileCard
          profile={selectedPSW}
          isOpen={profileCardOpen}
          onClose={() => setProfileCardOpen(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      {/* Status Change Dialog */}
      {selectedPSW && (
        <PSWStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          action={statusAction}
          pswId={selectedPSW.id}
          pswName={`${selectedPSW.firstName} ${selectedPSW.lastName}`}
          pswEmail={selectedPSW.email}
          onSuccess={handleStatusSuccess}
        />
      )}
    </div>
  );
};

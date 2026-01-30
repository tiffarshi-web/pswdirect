// Active Team Section - Displays approved PSWs in a table format
// Includes search, address display, map links, and click-to-call

import { useState, useEffect, useMemo } from "react";
import { Users, Phone, AlertTriangle, CheckCircle, XCircle, Flag, Shield, Eye, Globe, MapPin, Search, ExternalLink, Car } from "lucide-react";
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

// PSW Stats interface
interface PSWStats {
  shiftsCompleted: number;
  rating: number;
  lateShifts: number;
  missedShifts: number;
  status: "active" | "flagged" | "removed";
  flagReason?: string;
}

// Mock stats data
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
  const [searchQuery, setSearchQuery] = useState("");

  const loadProfiles = () => {
    const loaded = getPSWProfiles();
    setProfiles(loaded);
  };

  useEffect(() => {
    initializePSWProfiles();
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

  // Filter approved profiles only
  const approvedProfiles = useMemo(() => {
    return profiles.filter(p => p.vettingStatus === "approved");
  }, [profiles]);

  // Search filter
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return approvedProfiles;
    
    const query = searchQuery.toLowerCase();
    return approvedProfiles.filter(psw => {
      const fullName = `${psw.firstName} ${psw.lastName}`.toLowerCase();
      const city = psw.homeCity?.toLowerCase() || "";
      const postalCode = psw.homePostalCode?.toLowerCase() || "";
      const languages = psw.languages.map(l => getLanguageName(l).toLowerCase()).join(" ");
      
      return fullName.includes(query) || 
             city.includes(query) || 
             postalCode.includes(query) ||
             languages.includes(query) ||
             psw.phone.includes(query) ||
             psw.email.toLowerCase().includes(query);
    });
  }, [approvedProfiles, searchQuery]);

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
      updateVettingStatus(selectedPSW.id, "rejected", "Removed from platform");
      loadProfiles();
      toast.error(`${selectedPSW.firstName} ${selectedPSW.lastName} has been removed`);
    }
    setRemoveDialogOpen(false);
    setSelectedPSW(null);
  };

  const reinstatePSW = (psw: PSWProfile) => {
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

  const openGoogleMaps = (psw: PSWProfile) => {
    const query = encodeURIComponent(`${psw.homeCity || "Toronto"}, ON ${psw.homePostalCode || ""}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
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

  const activeCount = filteredProfiles.filter(p => getStats(p.id).status === "active").length;
  const flaggedCount = filteredProfiles.filter(p => getStats(p.id).status === "flagged").length;

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
      <div className="grid grid-cols-3 gap-4">
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
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{filteredProfiles.length}</p>
            <p className="text-xs text-muted-foreground">Total Active Team</p>
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
                    const stats = getStats(psw.id);
                    
                    return (
                      <TableRow 
                        key={psw.id}
                        className={stats.status === "removed" ? "opacity-50" : ""}
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
                          {getStatusBadge(stats.status)}
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
                            
                            {stats.status === "active" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => handleFlag(psw)}
                                  title="Flag"
                                >
                                  <Flag className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemove(psw)}
                                  title="Remove"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {stats.status === "flagged" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => reinstatePSW(psw)}
                                  title="Reinstate"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemove(psw)}
                                  title="Remove"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
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

      {/* Profile Card Dialog */}
      {selectedPSW && profileCardOpen && (
        <PSWProfileCard
          profile={selectedPSW}
          isOpen={profileCardOpen}
          onClose={() => setProfileCardOpen(false)}
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
              <div className="mt-3">
                <Input
                  placeholder="Reason for flagging..."
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFlag} className="bg-amber-600 hover:bg-amber-700">
              Flag PSW
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove PSW from Platform</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-3">
                This will permanently remove <strong>{selectedPSW?.firstName} {selectedPSW?.lastName}</strong> from the platform.
              </p>
              <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                <p className="font-medium text-destructive">Per policy: {PSW_POLICY_TEXT.shiftWarning}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive hover:bg-destructive/90">
              Remove from Platform
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

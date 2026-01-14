// Active Team Section - Displays approved PSWs with full admin visibility
// Includes search, address display, map links, and click-to-call

import { useState, useEffect, useMemo } from "react";
import { Users, Phone, Mail, AlertTriangle, CheckCircle, XCircle, Flag, Shield, Eye, Globe, MapPin, Search, ExternalLink, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

// Mock address data (would come from profile in real app)
const mockAddresses: Record<string, { street: string; city: string; postalCode: string }> = {
  "PSW001": { street: "123 Queen Street West", city: "Toronto", postalCode: "M5H 2M9" },
  "PSW002": { street: "456 Yonge Street", city: "North York", postalCode: "M2N 5S3" },
  "PSW003": { street: "789 Bloor Street", city: "Etobicoke", postalCode: "M8X 1G4" },
  "PSW004": { street: "321 King Street East", city: "Toronto", postalCode: "M5A 1K7" },
  "PSW005": { street: "654 Dundas Street", city: "Mississauga", postalCode: "L5B 1H7" },
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

  useEffect(() => {
    initializePSWProfiles();
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const loaded = getPSWProfiles();
    setProfiles(loaded);
  };

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
      const address = mockAddresses[psw.id];
      const city = address?.city.toLowerCase() || "";
      const languages = psw.languages.map(l => getLanguageName(l).toLowerCase()).join(" ");
      
      return fullName.includes(query) || 
             city.includes(query) || 
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

  const getAddress = (pswId: string) => {
    return mockAddresses[pswId] || { street: "Address not on file", city: "Unknown", postalCode: "" };
  };

  const openGoogleMaps = (pswId: string) => {
    const address = getAddress(pswId);
    const query = encodeURIComponent(`${address.street}, ${address.city}, ON ${address.postalCode}`);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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

      {/* Team List */}
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
        <CardContent className="space-y-4">
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No PSWs match your search" : "No approved PSWs yet"}
            </div>
          ) : (
            filteredProfiles.map((psw) => {
              const stats = getStats(psw.id);
              const address = getAddress(psw.id);
              
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
                      <Avatar className="h-14 w-14 ring-2 ring-offset-2 ring-primary/20">
                        {psw.profilePhotoUrl ? (
                          <AvatarImage src={psw.profilePhotoUrl} alt={psw.firstName} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(psw.firstName, psw.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <button
                          onClick={() => handleViewProfile(psw)}
                          className="font-semibold text-foreground hover:text-primary hover:underline text-left text-lg"
                        >
                          {psw.firstName} {psw.lastName}
                        </button>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          Approved: {formatDate(psw.approvedAt)}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(stats.status)}
                  </div>

                  {/* Address with Map Link */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{address.street}</p>
                          <p className="text-sm text-muted-foreground">
                            {address.city}, ON {address.postalCode}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openGoogleMaps(psw.id)}
                        className="shrink-0 gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on Map
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

                  {/* Stats */}
                  <div className="flex gap-4 text-xs">
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{stats.shiftsCompleted}</strong> shifts
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">⭐ {stats.rating.toFixed(1)}</strong>
                    </span>
                    <span className={stats.lateShifts > 0 ? "text-amber-600" : "text-muted-foreground"}>
                      <strong>{stats.lateShifts}</strong> late
                    </span>
                    <span className={stats.missedShifts > 0 ? "text-red-600" : "text-muted-foreground"}>
                      <strong>{stats.missedShifts}</strong> missed
                    </span>
                  </div>

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
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Full Profile
                    </Button>
                    
                    {stats.status === "active" && (
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
                    {stats.status === "flagged" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reinstatePSW(psw)}
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
                  </div>
                </div>
              );
            })
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

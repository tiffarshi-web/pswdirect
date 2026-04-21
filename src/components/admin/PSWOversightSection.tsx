// PSW Oversight - Active / Archived / Banned tabs
// Lifecycle status is tracked in psw_profiles.lifecycle_status
// Vetting status remains for flag/warning workflow within Active tab

import { useState, useEffect, useMemo } from "react";
import {
  Users, Phone, AlertTriangle, CheckCircle, XCircle, Flag, Shield, Eye,
  MapPin, Search, ExternalLink, Car, RotateCcw, Archive, Ban, ShieldOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PSWProfile } from "@/lib/pswProfileStore";
import { getLanguageName } from "@/lib/languageConfig";
import { PSWProfileCard } from "./PSWProfileCard";
import { PSWStatusDialog } from "./PSWStatusDialog";
import { PSWLifecycleDialog, LifecycleAction } from "./PSWLifecycleDialog";
import { PSWStatusAuditLog } from "./PSWStatusAuditLog";

type LifecycleStatus = "active" | "archived" | "banned";

export const PSWOversightSection = () => {
  const [profiles, setProfiles] = useState<PSWProfile[]>([]);
  const [selectedPSW, setSelectedPSW] = useState<PSWProfile | null>(null);
  const [profileCardOpen, setProfileCardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<LifecycleStatus>("active");

  // Status dialog (flag / reinstate within active tab)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"flag" | "deactivate" | "reinstate">("flag");

  // Lifecycle dialog (archive / restore / ban / unban)
  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction>("archive");

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("psw_profiles")
      .select("*, psw_number")
      .in("vetting_status", ["approved", "flagged", "deactivated"])
      .order("first_name");

    if (error) {
      console.error("Error fetching PSW profiles:", error);
      setProfiles([]);
      return;
    }

    const mapped: PSWProfile[] = (data || []).map((p: any) => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      phone: p.phone || "",
      gender: p.gender,
      homePostalCode: p.home_postal_code || undefined,
      homeCity: p.home_city || undefined,
      profilePhotoUrl: p.profile_photo_url || undefined,
      profilePhotoName: p.profile_photo_name || undefined,
      hscpoaNumber: p.hscpoa_number || undefined,
      policeCheckUrl: p.police_check_url || undefined,
      policeCheckName: p.police_check_name || undefined,
      policeCheckDate: p.police_check_date || undefined,
      languages: p.languages || ["en"],
      vettingStatus: p.vetting_status,
      vettingNotes: p.vetting_notes || undefined,
      appliedAt: p.applied_at || undefined,
      approvedAt: p.approved_at || undefined,
      yearsExperience: p.years_experience || undefined,
      experienceConditions: p.experience_conditions || [],
      certifications: p.certifications || undefined,
      certificationsList: p.certifications_list || [],
      hasOwnTransport: p.has_own_transport || undefined,
      licensePlate: p.license_plate || undefined,
      availableShifts: p.available_shifts || undefined,
      vehicleDisclaimer: p.vehicle_disclaimer,
      vehiclePhotoUrl: p.vehicle_photo_url || undefined,
      vehiclePhotoName: p.vehicle_photo_name || undefined,
      pswNumber: p.psw_number || undefined,
      flagCount: p.flag_count ?? 0,
      lifecycleStatus: (p.lifecycle_status as LifecycleStatus) || "active",
      archivedAt: p.archived_at || undefined,
      archivedBy: p.archived_by || undefined,
      archiveReason: p.archive_reason || undefined,
    }) as PSWProfile);
    setProfiles(mapped);
  };

  useEffect(() => {
    loadProfiles();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadProfiles();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", loadProfiles);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", loadProfiles);
    };
  }, []);

  // Partition by lifecycle
  const partitioned = useMemo(() => {
    const active: PSWProfile[] = [];
    const archived: PSWProfile[] = [];
    const banned: PSWProfile[] = [];
    for (const p of profiles) {
      const ls = p.lifecycleStatus || "active";
      if (ls === "archived") archived.push(p);
      else if (ls === "banned") banned.push(p);
      else active.push(p);
    }
    return { active, archived, banned };
  }, [profiles]);

  const filterBySearch = (list: PSWProfile[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((psw) => {
      const fullName = `${psw.firstName} ${psw.lastName}`.toLowerCase();
      const city = psw.homeCity?.toLowerCase() || "";
      const postalCode = psw.homePostalCode?.toLowerCase() || "";
      const languages = psw.languages.map((l) => getLanguageName(l).toLowerCase()).join(" ");
      const pswNum = psw.pswNumber ? `PSW-${psw.pswNumber}` : "";
      return (
        fullName.includes(q) ||
        city.includes(q) ||
        postalCode.includes(q) ||
        languages.includes(q) ||
        psw.phone.includes(q) ||
        psw.email.toLowerCase().includes(q) ||
        psw.vettingStatus.includes(q) ||
        pswNum.toLowerCase().includes(q)
      );
    });
  };

  const visibleActive = useMemo(() => filterBySearch(partitioned.active), [partitioned.active, searchQuery]);
  const visibleArchived = useMemo(() => filterBySearch(partitioned.archived), [partitioned.archived, searchQuery]);
  const visibleBanned = useMemo(() => filterBySearch(partitioned.banned), [partitioned.banned, searchQuery]);

  const handleViewProfile = (psw: PSWProfile) => {
    setSelectedPSW(psw);
    setProfileCardOpen(true);
  };

  const handleProfileUpdate = (updatedProfile: PSWProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p)));
    setSelectedPSW(updatedProfile);
  };

  const openStatusDialog = (psw: PSWProfile, action: "flag" | "deactivate" | "reinstate") => {
    setSelectedPSW(psw);
    setStatusAction(action);
    setStatusDialogOpen(true);
  };

  const openLifecycleDialog = (psw: PSWProfile, action: LifecycleAction) => {
    setSelectedPSW(psw);
    setLifecycleAction(action);
    setLifecycleDialogOpen(true);
  };

  const openGoogleMaps = (psw: PSWProfile) => {
    const query = encodeURIComponent(`${psw.homeCity || "Toronto"}, ON ${psw.homePostalCode || ""}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const getStatusBadge = (status: string, flagCount?: number) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" /> Active
          </Badge>
        );
      case "flagged":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1" /> Flagged {flagCount ? `(${flagCount})` : ""}
          </Badge>
        );
      case "deactivated":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Deactivated
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  // Active tab counts (for flag/warning sub-counts)
  const activeApproved = visibleActive.filter((p) => p.vettingStatus === "approved").length;
  const activeFlagged = visibleActive.filter((p) => p.vettingStatus === "flagged").length;

  // ---------- Row renderer (shared) ----------
  const renderRow = (psw: PSWProfile, lifecycle: LifecycleStatus) => (
    <TableRow key={psw.id} className={lifecycle === "banned" ? "opacity-60" : ""}>
      <TableCell>
        <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-primary/20">
          {psw.profilePhotoUrl ? <AvatarImage src={psw.profilePhotoUrl} alt={psw.firstName} /> : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {getInitials(psw.firstName, psw.lastName)}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm font-semibold text-primary">
          {psw.pswNumber ? `PSW-${psw.pswNumber}` : "—"}
        </span>
      </TableCell>
      <TableCell>
        <button
          onClick={() => handleViewProfile(psw)}
          className="font-semibold text-foreground hover:text-primary hover:underline text-left"
        >
          {psw.firstName}
        </button>
      </TableCell>
      <TableCell>
        <span className="text-sm text-foreground">{psw.lastName}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm capitalize">{psw.gender || "-"}</span>
      </TableCell>
      <TableCell>
        {psw.hasOwnTransport === "yes-car" ? (
          <div className="flex flex-col gap-1">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
              <Car className="w-3 h-3 mr-1" /> Vehicle
            </Badge>
            {psw.vehicleDisclaimer?.accepted ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                <Shield className="w-3 h-3 mr-1" /> Insured ✓
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">No Disclaimer</Badge>
            )}
          </div>
        ) : psw.hasOwnTransport === "yes-transit" ? (
          <Badge variant="outline" className="text-xs">Transit</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {psw.languages.length > 0 ? (
            psw.languages.slice(0, 3).map((lang) => (
              <Badge key={lang} variant="secondary" className="text-xs">{getLanguageName(lang)}</Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
          {psw.languages.length > 3 && (
            <Badge variant="outline" className="text-xs">+{psw.languages.length - 3}</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-sm">{psw.homeCity || "-"}</span>
        </div>
      </TableCell>
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
      <TableCell>
        <a
          href={`tel:${psw.phone.replace(/[^\d+]/g, "")}`}
          className="flex items-center gap-1 text-primary hover:underline font-medium text-sm"
        >
          <Phone className="w-3 h-3" /> {psw.phone}
        </a>
      </TableCell>
      <TableCell>
        {getStatusBadge(psw.vettingStatus, psw.flagCount)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewProfile(psw)} title="View Profile">
            <Eye className="w-4 h-4" />
          </Button>

          {lifecycle === "active" && (
            <>
              {psw.vettingStatus === "approved" && (
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  onClick={() => openStatusDialog(psw, "flag")}
                  title="Flag (warning)"
                >
                  <Flag className="w-4 h-4" />
                </Button>
              )}
              {psw.vettingStatus === "flagged" && (
                <>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => openStatusDialog(psw, "flag")}
                    title="Add Another Flag"
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={() => openStatusDialog(psw, "reinstate")}
                    title="Clear Flag"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                onClick={() => openLifecycleDialog(psw, "archive")}
                title="Archive (hide from dispatch, fully restorable)"
              >
                <Archive className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => openLifecycleDialog(psw, "ban")}
                title="Ban (permanent)"
              >
                <Ban className="w-4 h-4" />
              </Button>
            </>
          )}

          {lifecycle === "archived" && (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              onClick={() => openLifecycleDialog(psw, "restore")}
              title="Restore to Active"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}

          {lifecycle === "banned" && (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => openLifecycleDialog(psw, "unban")}
              title="Unban (requires confirmation)"
            >
              <ShieldOff className="w-4 h-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  const renderTable = (rows: PSWProfile[], lifecycle: LifecycleStatus, emptyText: string) => (
    <div className="overflow-x-auto">
      {rows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? "No PSWs match your search" : emptyText}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Photo</TableHead>
              <TableHead>PSW #</TableHead>
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
          <TableBody>{rows.map((psw) => renderRow(psw, lifecycle))}</TableBody>
        </Table>
      )}
    </div>
  );

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, city, PSW number (e.g. PSW-1001), or language..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card border-l-4 border-l-emerald-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{partitioned.active.length}</p>
            <p className="text-xs text-muted-foreground">Active PSWs</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-l-4 border-l-amber-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {partitioned.active.filter((p) => p.vettingStatus === "flagged").length}
            </p>
            <p className="text-xs text-muted-foreground">Flagged (within Active)</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-l-4 border-l-slate-500">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{partitioned.archived.length}</p>
            <p className="text-xs text-muted-foreground">Archived</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-l-4 border-l-red-600">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{partitioned.banned.length}</p>
            <p className="text-xs text-muted-foreground">Banned</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            PSW Lifecycle Management
          </CardTitle>
          <CardDescription>
            Active = eligible for dispatch. Archived = hidden from dispatch but restorable. Banned = permanently blocked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LifecycleStatus)}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">
                Active ({partitioned.active.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived ({partitioned.archived.length})
              </TabsTrigger>
              <TabsTrigger value="banned">
                Banned ({partitioned.banned.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <div className="mb-3 text-sm text-muted-foreground">
                {activeApproved} approved · {activeFlagged} flagged
              </div>
              {renderTable(visibleActive, "active", "No active PSWs")}
            </TabsContent>

            <TabsContent value="archived">
              <div className="mb-3 text-sm text-muted-foreground">
                Hidden from dispatch and coverage map. All historical data preserved. Click <RotateCcw className="inline w-3 h-3 mx-1" /> to restore.
              </div>
              {renderTable(visibleArchived, "archived", "No archived PSWs")}
            </TabsContent>

            <TabsContent value="banned">
              <div className="mb-3 text-sm text-muted-foreground">
                Permanently blocked from dispatch and login. Unbanning requires explicit confirmation.
              </div>
              {renderTable(visibleBanned, "banned", "No banned PSWs")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <PSWStatusAuditLog />

      {/* Profile Card */}
      {selectedPSW && profileCardOpen && (
        <PSWProfileCard
          profile={selectedPSW}
          isOpen={profileCardOpen}
          onClose={() => setProfileCardOpen(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      {/* Flag/Reinstate Dialog */}
      {selectedPSW && (
        <PSWStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          action={statusAction}
          pswId={selectedPSW.id}
          pswName={`${selectedPSW.firstName} ${selectedPSW.lastName}`}
          pswEmail={selectedPSW.email}
          onSuccess={loadProfiles}
        />
      )}

      {/* Lifecycle Dialog */}
      {selectedPSW && (
        <PSWLifecycleDialog
          open={lifecycleDialogOpen}
          onOpenChange={setLifecycleDialogOpen}
          action={lifecycleAction}
          pswId={selectedPSW.id}
          pswName={`${selectedPSW.firstName} ${selectedPSW.lastName}`}
          onSuccess={loadProfiles}
        />
      )}
    </div>
  );
};

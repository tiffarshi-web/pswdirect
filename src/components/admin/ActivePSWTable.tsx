// Active PSW Table - Displays approved PSWs in a clean table format
// Shows Photo, First Name, Full Home Address, City, and Language Match

import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, ExternalLink, Phone, Globe, Shield, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  PSWProfile, 
  getPSWProfiles, 
  initializePSWProfiles 
} from "@/lib/pswProfileStore";
import { getLanguageName } from "@/lib/languageConfig";
import { PSWProfileCard } from "./PSWProfileCard";

// Mock address data (would come from profile in real app)
const mockAddresses: Record<string, { street: string; city: string; postalCode: string }> = {
  "PSW001": { street: "123 Queen Street West", city: "Toronto", postalCode: "M5H 2M9" },
  "PSW002": { street: "456 Yonge Street", city: "North York", postalCode: "M2N 5S3" },
  "PSW003": { street: "789 Bloor Street", city: "Etobicoke", postalCode: "M8X 1G4" },
  "PSW004": { street: "321 King Street East", city: "Toronto", postalCode: "M5A 1K7" },
  "PSW005": { street: "654 Dundas Street", city: "Mississauga", postalCode: "L5B 1H7" },
};

export const ActivePSWTable = () => {
  const [profiles, setProfiles] = useState<PSWProfile[]>([]);
  const [selectedPSW, setSelectedPSW] = useState<PSWProfile | null>(null);
  const [profileCardOpen, setProfileCardOpen] = useState(false);
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
             psw.phone.includes(query);
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

  const getAddress = (pswId: string) => {
    return mockAddresses[pswId] || { street: "Address not on file", city: "Unknown", postalCode: "" };
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
      <div className="flex gap-4">
        <Card className="shadow-card border-l-4 border-l-emerald-500 flex-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{filteredProfiles.length}</p>
            <p className="text-xs text-muted-foreground">Active PSWs</p>
          </CardContent>
        </Card>
      </div>

      {/* PSW Table */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Active Team</CardTitle>
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
                    <TableHead className="hidden md:table-cell">Full Home Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="hidden sm:table-cell">Languages</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((psw) => {
                    const address = getAddress(psw.id);
                    
                    return (
                      <TableRow key={psw.id} className="hover:bg-muted/50">
                        {/* Photo */}
                        <TableCell>
                          <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-primary/20">
                            {psw.profilePhotoUrl ? (
                              <AvatarImage src={psw.profilePhotoUrl} alt={psw.firstName} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
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
                          <a 
                            href={`tel:${psw.phone.replace(/[^\d+]/g, "")}`}
                            className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                          >
                            <Phone className="w-3 h-3" />
                            {psw.phone}
                          </a>
                        </TableCell>

                        {/* Full Address - Desktop */}
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm">{address.street}, {address.postalCode}</span>
                          </div>
                        </TableCell>

                        {/* City */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{address.city}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => openGoogleMaps(psw.id)}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>

                        {/* Languages */}
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {psw.languages.slice(0, 2).map(lang => (
                              <Badge key={lang} variant="secondary" className="text-xs py-0">
                                {getLanguageName(lang)}
                              </Badge>
                            ))}
                            {psw.languages.length > 2 && (
                              <Badge variant="outline" className="text-xs py-0">
                                +{psw.languages.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewProfile(psw)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
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
      {selectedPSW && (
        <PSWProfileCard
          profile={selectedPSW}
          isOpen={profileCardOpen}
          onClose={() => setProfileCardOpen(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

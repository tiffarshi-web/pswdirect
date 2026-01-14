import { useState } from "react";
import { 
  User, Phone, Mail, FileText, Shield, Globe, Download, 
  CheckCircle, XCircle, Clock, Award, Car, Calendar 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  PSWProfile, 
  VettingStatus, 
  updateVettingStatus 
} from "@/lib/pswProfileStore";
import { getLanguageName } from "@/lib/languageConfig";

interface PSWProfileCardProps {
  profile: PSWProfile;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate: (updatedProfile: PSWProfile) => void;
}

export const PSWProfileCard = ({
  profile,
  isOpen,
  onClose,
  onProfileUpdate,
}: PSWProfileCardProps) => {
  const [vettingStatus, setVettingStatus] = useState<VettingStatus>(profile.vettingStatus);
  const [vettingNotes, setVettingNotes] = useState(profile.vettingNotes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  const getVettingBadge = (status: VettingStatus) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
    }
  };

  const handleUpdateVetting = async () => {
    setIsUpdating(true);
    
    const updatedProfile = updateVettingStatus(profile.id, vettingStatus, vettingNotes);
    
    if (updatedProfile) {
      toast.success(`Vetting status updated to "${vettingStatus}"`);
      onProfileUpdate(updatedProfile);
    } else {
      toast.error("Failed to update vetting status");
    }
    
    setIsUpdating(false);
  };

  const handleDownloadPoliceCheck = () => {
    if (profile.policeCheckUrl) {
      // Create download link
      const link = document.createElement("a");
      link.href = profile.policeCheckUrl;
      link.download = profile.policeCheckName || `police-check-${profile.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("No police check file uploaded");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">PSW Profile Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header with Photo */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/20">
              {profile.profilePhotoUrl ? (
                <AvatarImage src={profile.profilePhotoUrl} alt={`${profile.firstName} ${profile.lastName}`} />
              ) : null}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(profile.firstName, profile.lastName)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold text-foreground">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">ID: {profile.id}</p>
            <div className="mt-2">{getVettingBadge(profile.vettingStatus)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Client sees: <strong>{profile.firstName}</strong> + Photo
            </p>
          </div>

          <Separator />

          {/* HSCPOA Number - Highlighted */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">HSCPOA Registration</span>
            </div>
            {profile.hscpoaNumber ? (
              <p className="text-lg font-mono text-primary">{profile.hscpoaNumber}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not provided</p>
            )}
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{profile.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{profile.email}</span>
              </div>
            </div>
          </div>

          {/* Police Check */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Vulnerable Sector Police Check
            </h3>
            {profile.policeCheckUrl ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownloadPoliceCheck}
              >
                <Download className="w-4 h-4 mr-2" />
                View/Download: {profile.policeCheckName || "Police Check"}
              </Button>
            ) : (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground text-center">
                No police check file uploaded
              </div>
            )}
          </div>

          {/* Language Skills */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Language Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.languages.length > 0 ? (
                profile.languages.map((lang) => (
                  <Badge key={lang} variant="secondary">
                    {getLanguageName(lang)}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No languages specified</span>
              )}
            </div>
          </div>

          {/* Experience & Availability */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Experience</h4>
              <p className="text-foreground">{profile.yearsExperience || "Not specified"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Transport</h4>
              <div className="flex items-center gap-1">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {profile.hasOwnTransport === "yes-car" && "Own car"}
                  {profile.hasOwnTransport === "yes-transit" && "Public transit"}
                  {profile.hasOwnTransport === "no" && "No transport"}
                  {!profile.hasOwnTransport && "Not specified"}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Availability</h4>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground capitalize">
                  {profile.availableShifts || "Not specified"}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Applied</h4>
              <p className="text-foreground">
                {new Date(profile.appliedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {profile.certifications && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Certifications</h4>
              <p className="text-sm text-foreground">{profile.certifications}</p>
            </div>
          )}

          <Separator />

          {/* Vetting Controls */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Vetting Controls
            </h3>
            
            <div className="space-y-2">
              <Label>Vetting Status</Label>
              <Select
                value={vettingStatus}
                onValueChange={(val) => setVettingStatus(val as VettingStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-amber-500" />
                      Pending Review
                    </span>
                  </SelectItem>
                  <SelectItem value="approved">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      Approved
                    </span>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-3 h-3 text-red-500" />
                      Rejected
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vetting Notes (optional)</Label>
              <Textarea
                value={vettingNotes}
                onChange={(e) => setVettingNotes(e.target.value)}
                placeholder="Add notes about this PSW's vetting..."
                rows={2}
              />
            </div>

            <Button
              onClick={handleUpdateVetting}
              disabled={isUpdating || vettingStatus === profile.vettingStatus}
              className="w-full"
            >
              {isUpdating ? "Updating..." : "Update Vetting Status"}
            </Button>

            {profile.vettingStatus === "approved" && (
              <p className="text-xs text-emerald-600 text-center">
                ✓ This PSW can see and claim shifts on the Job Board
              </p>
            )}
            {profile.vettingStatus !== "approved" && (
              <p className="text-xs text-amber-600 text-center">
                ⚠ This PSW cannot access the Job Board until approved
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
import { useState } from "react";
import { CheckCircle, MapPin, Calendar, Clock, User, Globe, UserCheck, Lock, HeartPulse, ListChecks } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatLanguages, formatGenderPreference } from "@/lib/languageConfig";
import { formatCareConditionsBadges } from "@/lib/careConditions";

interface ClaimShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shiftDetails?: {
    clientName: string;
    date: string;
    time: string;
    /** General area (city + partial postal) — full address is only revealed AFTER acceptance. */
    address?: string;
    preferredLanguages?: string[] | null;
    preferredGender?: string | null;
    services?: string[];
    careConditions?: string[];
    careConditionsOther?: string | null;
  };
}

export const ClaimShiftDialog = ({
  isOpen,
  onClose,
  onConfirm,
  shiftDetails,
}: ClaimShiftDialogProps) => {
  const [accepted, setAccepted] = useState(false);

  const handleConfirm = () => {
    if (accepted) {
      onConfirm();
      setAccepted(false);
    }
  };

  const handleClose = () => {
    setAccepted(false);
    onClose();
  };

  const conditionBadges = formatCareConditionsBadges(
    shiftDetails?.careConditions ?? [],
    shiftDetails?.careConditionsOther ?? null,
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Confirm Shift Acceptance</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Review the job before accepting. The full street address is revealed only after you accept.
          </DialogDescription>
        </DialogHeader>

        {shiftDetails && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium">Client:</span>
              <span>{shiftDetails.clientName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium">Date:</span>
              <span>{shiftDetails.date}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium">Time:</span>
              <span>{shiftDetails.time}</span>
            </div>
            {shiftDetails.address && (
              <div className="flex items-start gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">General area:</span>{" "}
                  <span>{shiftDetails.address}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Full address shown after acceptance
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {shiftDetails?.services && shiftDetails.services.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" /> Services / Tasks
            </p>
            <div className="flex flex-wrap gap-1.5">
              {shiftDetails.services.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {conditionBadges.length > 0 && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-800 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5" /> Care Conditions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {conditionBadges.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="text-xs border-rose-200 bg-white text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {shiftDetails && (shiftDetails.preferredLanguages?.length || shiftDetails.preferredGender) && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Client Preferences
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <Globe className="w-3 h-3" />
                Language: {formatLanguages(shiftDetails.preferredLanguages)}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <UserCheck className="w-3 h-3" />
                Gender: {formatGenderPreference(shiftDetails.preferredGender)}
              </Badge>
            </div>
          </div>
        )}

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2">
            ATTENDANCE REQUIRED
          </p>
          <p className="text-sm text-amber-900 leading-relaxed">
            By confirming, you acknowledge you are responsible for attending this shift.
            Any missed or late shifts will result in <strong>immediate removal from the platform</strong> per our professional standards.
          </p>
        </div>

        <div className="flex items-start space-x-3 pt-2">
          <Checkbox
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="accept-terms"
            className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
          >
            I understand I must attend this shift and will notify admin immediately if I cannot.
          </Label>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={handleConfirm}
            disabled={!accepted}
            className="w-full sm:w-auto"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm & Accept Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

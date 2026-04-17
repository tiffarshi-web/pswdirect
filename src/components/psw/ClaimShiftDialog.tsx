import { useState } from "react";
import { AlertTriangle, CheckCircle, MapPin, Calendar, Clock, User, Globe, UserCheck } from "lucide-react";
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

interface ClaimShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shiftDetails?: {
    clientName: string;
    date: string;
    time: string;
    address?: string;
    preferredLanguages?: string[] | null;
    preferredGender?: string | null;
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Confirm Shift Acceptance</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            You have accepted this shift and are expected to attend.
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
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium">Location:</span>
                <span>{shiftDetails.address}</span>
              </div>
            )}
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

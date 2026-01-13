import { useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
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

interface ClaimShiftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shiftDetails?: {
    clientName: string;
    date: string;
    time: string;
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
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Professional Agreement</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {shiftDetails && (
              <p className="mb-3 font-medium text-foreground">
                Shift: {shiftDetails.clientName} • {shiftDetails.date} • {shiftDetails.time}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2">
            IMPORTANT
          </p>
          <p className="text-sm text-amber-900 leading-relaxed">
            By claiming this shift, you agree to arrive on time. Any missed or late shifts 
            will result in <strong>immediate removal from the platform</strong> per our 
            professional standards.
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
            I understand and agree to uphold the professional standards required. 
            I confirm I will arrive on time and complete this shift as scheduled.
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
            Accept & Claim Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

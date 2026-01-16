import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

export const VEHICLE_DISCLAIMER_VERSION = "1.0";
export const VEHICLE_DISCLAIMER_TEXT = "I understand that if I use my personal vehicle for hospital/doctor pickups or client transport, it is my sole responsibility to maintain valid commercial or 'business use' insurance as per Ontario law. I acknowledge that the platform does not provide auto insurance for private transport.";

interface VehicleDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const VehicleDisclaimerModal = ({
  isOpen,
  onClose,
  onConfirm,
}: VehicleDisclaimerModalProps) => {
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
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Vehicle Insurance Disclaimer
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              {VEHICLE_DISCLAIMER_TEXT}
            </p>
            <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg border">
              <Checkbox
                id="vehicleDisclaimerAccept"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked as boolean)}
              />
              <Label htmlFor="vehicleDisclaimerAccept" className="text-sm font-medium cursor-pointer">
                I understand and agree to the above terms
              </Label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!accepted}>
            Accept & Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

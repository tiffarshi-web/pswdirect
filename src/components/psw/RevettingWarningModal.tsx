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
import { AlertTriangle } from "lucide-react";

interface RevettingWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fieldType: "policeCheck" | "address";
}

export const RevettingWarningModal = ({
  isOpen,
  onClose,
  onConfirm,
  fieldType,
}: RevettingWarningModalProps) => {
  const fieldLabel = fieldType === "policeCheck" ? "police check" : "address";

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Verification Required
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Updating your <strong>{fieldLabel}</strong> will move your account to{" "}
              <strong>PENDING</strong> status until an admin can review and re-approve you.
            </p>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="font-medium text-foreground">While pending, you:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Cannot claim new shifts</li>
                <li>Can complete already claimed shifts</li>
              </ul>
            </div>
            <p className="text-sm">
              An admin will review your updated information and re-approve your profile.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            I Understand, Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

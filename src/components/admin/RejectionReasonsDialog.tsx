import { useState } from "react";
import { AlertCircle, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const STANDARDIZED_REJECTION_REASONS = [
  "Missing/Invalid ID",
  "Missing PSW Certificate / Diploma",
  "Missing Vulnerable Sector Police Check",
  "Police Check expired / unclear",
  "Missing HSCPOA Registration",
  "Missing CPR/First Aid (if required)",
  "Incomplete profile information",
  "Missing availability / schedule",
  "Missing work experience details",
  "Incomplete references",
  "Photo missing / unclear",
  "Duplicate account",
  "Other (see notes)",
] as const;

export type RejectionType = "needs_update" | "final";

interface RejectionReasonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectionType: RejectionType;
  pswName: string;
  onConfirm: (reasons: string[], notes: string) => void;
  isLoading?: boolean;
}

export const RejectionReasonsDialog = ({
  open,
  onOpenChange,
  rejectionType,
  pswName,
  onConfirm,
  isLoading = false,
}: RejectionReasonsDialogProps) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedReasons, notes);
    // Reset on close
    setSelectedReasons([]);
    setNotes("");
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setSelectedReasons([]);
      setNotes("");
    }
    onOpenChange(val);
  };

  const isNeedsUpdate = rejectionType === "needs_update";
  const hasOtherSelected = selectedReasons.includes("Other (see notes)");
  const canConfirm = selectedReasons.length > 0 && (!hasOtherSelected || notes.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isNeedsUpdate ? (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            {isNeedsUpdate ? "Request Update" : "Final Rejection"} — {pswName}
          </DialogTitle>
          <DialogDescription>
            {isNeedsUpdate
              ? "Select the items that need to be updated. The PSW will receive an email with these items and can resubmit."
              : "Select reasons for final rejection. This cannot be undone without admin reinstatement."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badge showing type */}
          <Badge className={isNeedsUpdate 
            ? "bg-amber-100 text-amber-700 border-amber-200" 
            : "bg-red-100 text-red-700 border-red-200"
          }>
            {isNeedsUpdate ? "Reject – Needs Update" : "Reject – Final"}
          </Badge>

          {/* Reasons checklist */}
          <div className="space-y-2">
            <Label className="font-semibold">Select missing / incomplete items:</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {STANDARDIZED_REJECTION_REASONS.map((reason) => (
                <div key={reason} className="flex items-start gap-2">
                  <Checkbox
                    id={`reason-${reason}`}
                    checked={selectedReasons.includes(reason)}
                    onCheckedChange={() => toggleReason(reason)}
                  />
                  <Label htmlFor={`reason-${reason}`} className="text-sm cursor-pointer leading-tight">
                    {reason}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>
              Additional Notes {hasOtherSelected ? "(required)" : "(optional)"}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add specific details about what needs to be updated..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={isNeedsUpdate ? "bg-amber-600 hover:bg-amber-700" : "bg-destructive hover:bg-destructive/90"}
          >
            {isLoading ? "Processing..." : (
              <>
                <Send className="w-4 h-4 mr-1" />
                {isNeedsUpdate ? "Send Update Request" : "Reject – Final"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

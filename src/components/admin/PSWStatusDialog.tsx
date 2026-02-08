// PSW Status Change Dialog - Used for Flag, Deactivate, Reinstate, and Remove actions
import { useState } from "react";
import { AlertTriangle, XCircle, RotateCcw, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StatusAction = "flag" | "deactivate" | "reinstate" | "remove";

interface PSWStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: StatusAction;
  pswId: string;
  pswName: string;
  pswEmail: string;
  onSuccess: () => void;
}

export const PSWStatusDialog = ({
  open,
  onOpenChange,
  action,
  pswId,
  pswName,
  pswEmail,
  onSuccess,
}: PSWStatusDialogProps) => {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getConfig = () => {
    switch (action) {
      case "flag":
        return {
          title: "Flag PSW Account",
          description: `Are you sure you want to flag ${pswName}'s account? They will receive a warning but can still log in.`,
          icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
          buttonText: "Flag Account",
          buttonClass: "bg-amber-500 hover:bg-amber-600",
          newStatus: "flagged",
          auditAction: "flagged" as const,
        };
      case "deactivate":
        return {
          title: "Deactivate PSW Account",
          description: `Are you sure you want to deactivate ${pswName}'s account? They will be blocked from logging in or re-registering.`,
          icon: <XCircle className="w-6 h-6 text-red-500" />,
          buttonText: "Deactivate Account",
          buttonClass: "bg-red-500 hover:bg-red-600",
          newStatus: "deactivated",
          auditAction: "deactivated" as const,
        };
      case "reinstate":
        return {
          title: "Reinstate PSW Account",
          description: `Are you sure you want to reinstate ${pswName}'s account? They will be able to log in and accept shifts again.`,
          icon: <RotateCcw className="w-6 h-6 text-blue-500" />,
          buttonText: "Reinstate Account",
          buttonClass: "bg-blue-500 hover:bg-blue-600",
          newStatus: "approved",
          auditAction: "reinstated" as const,
        };
      case "remove":
        return {
          title: "Permanently Remove PSW Account",
          description: `This action is IRREVERSIBLE. ${pswName}'s account and ALL related data (location logs, payroll entries, audit history) will be permanently deleted.`,
          icon: <Trash2 className="w-6 h-6 text-destructive" />,
          buttonText: "Delete Permanently",
          buttonClass: "bg-destructive hover:bg-destructive/90",
          newStatus: null, // Not applicable - we're deleting
          auditAction: "removed" as const,
        };
    }
  };

  const config = getConfig();

  const handleSubmit = async () => {
    if (action !== "reinstate" && action !== "remove" && !reason.trim()) {
      toast.error("Please provide a reason for this action");
      return;
    }

    setIsLoading(true);

    try {
      if (action === "remove") {
        // Use the cascade delete function
        const { error: deleteError } = await supabase.rpc("delete_psw_cascade", {
          p_psw_id: pswId,
        });

        if (deleteError) {
          throw deleteError;
        }

        toast.success(`${pswName} has been permanently removed`);
      } else {
        // Update PSW profile status
        const { error: updateError } = await supabase
          .from("psw_profiles")
          .update({
            vetting_status: config.newStatus,
            vetting_notes: reason || undefined,
            vetting_updated_at: new Date().toISOString(),
          })
          .eq("id", pswId);

        if (updateError) {
          throw updateError;
        }

        // Log the action to audit trail
        const { error: auditError } = await supabase.from("psw_status_audit").insert({
          psw_id: pswId,
          psw_name: pswName,
          psw_email: pswEmail,
          action: config.auditAction,
          reason: reason || null,
          performed_by: "admin",
        });

        if (auditError) {
          console.error("Failed to log audit entry:", auditError);
          // Don't fail the operation if audit logging fails
        }

        toast.success(
          action === "reinstate"
            ? `${pswName} has been reinstated`
            : action === "flag"
            ? `${pswName} has been flagged`
            : `${pswName} has been deactivated`
        );
      }

      onSuccess();
      onOpenChange(false);
      setReason("");
    } catch (error: any) {
      console.error("Status change error:", error);
      toast.error(action === "remove" ? "Failed to remove account" : "Failed to update status", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // For remove action, use AlertDialog for extra confirmation
  if (action === "remove") {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              {config.icon}
              <AlertDialogTitle>{config.title}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              {config.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Type <strong className="text-destructive">DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={isLoading || reason !== "DELETE"}
              className={config.buttonClass}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                config.buttonText
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {config.icon}
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for {action === "reinstate" ? "Reinstatement" : action === "flag" ? "Flagging" : "Removal"}
              {action !== "reinstate" && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                action === "reinstate"
                  ? "Optional: Add a note about the reinstatement..."
                  : "Required: Explain why this action is being taken..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (action !== "reinstate" && !reason.trim())}
            className={config.buttonClass}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              config.buttonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PSWStatusDialog;

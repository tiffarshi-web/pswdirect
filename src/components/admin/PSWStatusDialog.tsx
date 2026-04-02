// PSW Status Change Dialog - Used for Flag, Deactivate, and Reinstate actions
// Supports flag_count tracking, appended reasons, and auto-ban on 2nd flag
import { useState } from "react";
import { AlertTriangle, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { sendPSWWarningEmail, sendPSWRemovalEmail } from "@/lib/notificationService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

type StatusAction = "flag" | "deactivate" | "reinstate";

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
          description: `Are you sure you want to flag ${pswName}'s account? They will receive a warning but can still log in. A second flag will automatically deactivate them.`,
          icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
          buttonText: "Flag Account",
          buttonClass: "bg-amber-500 hover:bg-amber-600",
        };
      case "deactivate":
        return {
          title: "Deactivate PSW Account",
          description: `Are you sure you want to deactivate ${pswName}'s account? They will be blocked from logging in or re-registering.`,
          icon: <XCircle className="w-6 h-6 text-red-500" />,
          buttonText: "Deactivate Account",
          buttonClass: "bg-red-500 hover:bg-red-600",
        };
      case "reinstate":
        return {
          title: "Reinstate PSW Account",
          description: `Are you sure you want to reinstate ${pswName}'s account? They will be able to log in and accept shifts again. Flag count will be reset.`,
          icon: <RotateCcw className="w-6 h-6 text-blue-500" />,
          buttonText: "Reinstate Account",
          buttonClass: "bg-blue-500 hover:bg-blue-600",
        };
    }
  };

  const config = getConfig();

  // Append reason to existing vetting_notes instead of overwriting
  const appendReason = (existingNotes: string | null, newReason: string): string => {
    const dateStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
    const entry = `[${dateStr}] - ${newReason}`;
    if (existingNotes && existingNotes.trim()) {
      return `${existingNotes}\n${entry}`;
    }
    return entry;
  };

  const handleSubmit = async () => {
    if (action !== "reinstate" && !reason.trim()) {
      toast.error("Please provide a reason for this action");
      return;
    }

    setIsLoading(true);

    try {
      if (action === "flag") {
        // Fetch current flag_count and vetting_notes
        const { data: currentProfile, error: fetchError } = await supabase
          .from("psw_profiles")
          .select("flag_count, vetting_notes")
          .eq("id", pswId)
          .single();

        if (fetchError) throw fetchError;

        const currentFlagCount = (currentProfile as any)?.flag_count ?? 0;
        const currentNotes = currentProfile?.vetting_notes || "";
        const newFlagCount = currentFlagCount + 1;
        const updatedNotes = appendReason(currentNotes, reason);

        if (newFlagCount >= 2) {
          // AUTO-BAN: second flag triggers automatic deactivation
          const { error: updateError } = await supabase
            .from("psw_profiles")
            .update({
              vetting_status: "deactivated",
              vetting_notes: updatedNotes,
              vetting_updated_at: new Date().toISOString(),
              flag_count: newFlagCount,
              flagged_at: new Date().toISOString(),
              banned_at: new Date().toISOString(),
            } as any)
            .eq("id", pswId);

          if (updateError) throw updateError;

          // Audit log
          await supabase.from("psw_status_audit").insert({
            psw_id: pswId,
            psw_name: pswName,
            psw_email: pswEmail,
            action: "auto_deactivated",
            reason: `Flag #${newFlagCount} (auto-ban): ${reason}`,
            performed_by: "admin",
          });

          // Send removal email (not warning)
          sendPSWRemovalEmail(pswEmail, pswName.split(" ")[0], reason).catch((e) =>
            console.warn("Removal email failed:", e)
          );

          toast.error(
            `${pswName} has been automatically deactivated (${newFlagCount} flags). Removal email sent.`
          );
        } else {
          // First flag — warning only
          const { error: updateError } = await supabase
            .from("psw_profiles")
            .update({
              vetting_status: "flagged",
              vetting_notes: updatedNotes,
              vetting_updated_at: new Date().toISOString(),
              flag_count: newFlagCount,
              flagged_at: new Date().toISOString(),
            } as any)
            .eq("id", pswId);

          if (updateError) throw updateError;

          // Audit log
          await supabase.from("psw_status_audit").insert({
            psw_id: pswId,
            psw_name: pswName,
            psw_email: pswEmail,
            action: "flagged",
            reason: `Flag #${newFlagCount}: ${reason}`,
            performed_by: "admin",
          });

          // Send warning email
          sendPSWWarningEmail(pswEmail, pswName.split(" ")[0], reason).catch((e) =>
            console.warn("Warning email failed:", e)
          );

          toast.warning(
            `${pswName} has been flagged (${newFlagCount}/2). Warning email sent.`
          );
        }
      } else if (action === "deactivate") {
        const { data: currentProfile } = await supabase
          .from("psw_profiles")
          .select("vetting_notes")
          .eq("id", pswId)
          .single();

        const updatedNotes = appendReason(currentProfile?.vetting_notes || "", reason);

        const { error: updateError } = await supabase
          .from("psw_profiles")
          .update({
            vetting_status: "deactivated",
            vetting_notes: updatedNotes,
            vetting_updated_at: new Date().toISOString(),
            banned_at: new Date().toISOString(),
          } as any)
          .eq("id", pswId);

        if (updateError) throw updateError;

        await supabase.from("psw_status_audit").insert({
          psw_id: pswId,
          psw_name: pswName,
          psw_email: pswEmail,
          action: "deactivated",
          reason: reason || null,
          performed_by: "admin",
        });

        sendPSWRemovalEmail(pswEmail, pswName.split(" ")[0], reason).catch((e) =>
          console.warn("Removal email failed:", e)
        );

        toast.success(`${pswName} has been deactivated – removal email sent`);
      } else if (action === "reinstate") {
        // Reset flag_count and clear timestamps on reinstate
        const { error: updateError } = await supabase
          .from("psw_profiles")
          .update({
            vetting_status: "approved",
            vetting_notes: reason || undefined,
            vetting_updated_at: new Date().toISOString(),
            flag_count: 0,
            flagged_at: null,
            banned_at: null,
          } as any)
          .eq("id", pswId);

        if (updateError) throw updateError;

        await supabase.from("psw_status_audit").insert({
          psw_id: pswId,
          psw_name: pswName,
          psw_email: pswEmail,
          action: "reinstated",
          reason: reason || null,
          performed_by: "admin",
        });

        toast.success(`${pswName} has been reinstated (flag count reset)`);
      }

      onSuccess();
      onOpenChange(false);
      setReason("");
    } catch (error: any) {
      console.error("Status change error:", error);
      toast.error("Failed to update status", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

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

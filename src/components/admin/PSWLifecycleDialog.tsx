// PSW Lifecycle action dialog: Archive, Restore, Ban, Unban
// Calls SECURITY DEFINER RPCs that write to psw_status_audit
import { useState } from "react";
import { Archive, RotateCcw, Ban, ShieldOff, Loader2, AlertTriangle } from "lucide-react";
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

export type LifecycleAction = "archive" | "restore" | "ban" | "unban";

interface PSWLifecycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: LifecycleAction;
  pswId: string;
  pswName: string;
  onSuccess: () => void;
}

const CONFIG: Record<
  LifecycleAction,
  {
    title: string;
    description: (name: string) => string;
    icon: JSX.Element;
    buttonText: string;
    buttonClass: string;
    rpc: "admin_archive_psw" | "admin_restore_psw" | "admin_ban_psw" | "admin_unban_psw";
    requiresReason: boolean;
    confirmPhrase?: string;
  }
> = {
  archive: {
    title: "Archive PSW",
    description: (n) =>
      `Archive ${n}? They'll be removed from Active PSWs and hidden from dispatch, but all order history, payroll, and audit data are preserved. You can restore them anytime.`,
    icon: <Archive className="w-6 h-6 text-slate-500" />,
    buttonText: "Archive PSW",
    buttonClass: "bg-slate-600 hover:bg-slate-700 text-white",
    rpc: "admin_archive_psw",
    requiresReason: false,
  },
  restore: {
    title: "Restore PSW to Active",
    description: (n) =>
      `Restore ${n} to the Active PSWs list? They'll resume receiving job dispatches immediately.`,
    icon: <RotateCcw className="w-6 h-6 text-emerald-500" />,
    buttonText: "Restore to Active",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    rpc: "admin_restore_psw",
    requiresReason: false,
  },
  ban: {
    title: "Ban PSW Permanently",
    description: (n) =>
      `BAN ${n}? This is a serious action — the PSW will be permanently blocked from logging in or receiving any jobs. All historical data is preserved. Restoration requires explicit confirmation.`,
    icon: <Ban className="w-6 h-6 text-red-600" />,
    buttonText: "Ban PSW",
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
    rpc: "admin_ban_psw",
    requiresReason: true,
  },
  unban: {
    title: "Unban PSW",
    description: (n) =>
      `Restore ${n} from BANNED back to Active? Their flag count will be reset and they'll be eligible for dispatch again. Type the PSW's first name below to confirm.`,
    icon: <ShieldOff className="w-6 h-6 text-blue-600" />,
    buttonText: "Confirm Unban",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    rpc: "admin_unban_psw",
    requiresReason: false,
    confirmPhrase: "firstName",
  },
};

export const PSWLifecycleDialog = ({
  open,
  onOpenChange,
  action,
  pswId,
  pswName,
  onSuccess,
}: PSWLifecycleDialogProps) => {
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const config = CONFIG[action];
  const firstName = pswName.split(" ")[0] || pswName;
  const needsConfirmText = config.confirmPhrase === "firstName";
  const confirmOk = !needsConfirmText || confirmText.trim().toLowerCase() === firstName.toLowerCase();
  const reasonOk = !config.requiresReason || reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!reasonOk) {
      toast.error("Please provide a reason");
      return;
    }
    if (!confirmOk) {
      toast.error(`Please type "${firstName}" to confirm`);
      return;
    }

    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { p_psw_id: pswId };
      if (action === "archive" || action === "ban") {
        params.p_reason = reason.trim() || null;
      }
      const { error } = await (supabase.rpc as any)(config.rpc, params);
      if (error) throw error;

      toast.success(
        action === "archive"
          ? `${pswName} archived`
          : action === "restore"
          ? `${pswName} restored to active`
          : action === "ban"
          ? `${pswName} has been banned`
          : `${pswName} unbanned and restored to active`
      );

      onSuccess();
      onOpenChange(false);
      setReason("");
      setConfirmText("");
    } catch (error: any) {
      console.error("Lifecycle action error:", error);
      toast.error("Action failed", { description: error.message });
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
          <DialogDescription className="pt-2">
            {config.description(pswName)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {action === "ban" && (
            <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Bans are permanent. Use <strong>Archive</strong> instead if you may want to easily restore the PSW later.
              </span>
            </div>
          )}

          {(action === "archive" || action === "ban") && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason {config.requiresReason && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  config.requiresReason
                    ? "Required: explain why this action is being taken..."
                    : "Optional: add a note for the audit log..."
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {needsConfirmText && (
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <strong className="font-mono">{firstName}</strong> to confirm
              </Label>
              <input
                id="confirm"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={firstName}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !reasonOk || !confirmOk}
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

export default PSWLifecycleDialog;

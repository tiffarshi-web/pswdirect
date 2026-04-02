import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const CANCELLATION_REASONS = [
  "Client cancelled",
  "PSW unavailable",
  "Duplicate order",
  "Admin error",
  "No suitable PSW found",
  "Other",
] as const;

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
  clientName: string;
  clientEmail: string;
  pswAssigned?: string | null;
  onCancelled: () => void;
}

export const CancelOrderDialog = ({
  open,
  onOpenChange,
  bookingId,
  bookingCode,
  clientName,
  clientEmail,
  pswAssigned,
  onCancelled,
}: CancelOrderDialogProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!reason) {
      toast.error("Please select a cancellation reason");
      return;
    }

    setCancelling(true);
    try {
      const adminEmail = user?.email || "admin";

      // 1. Update booking status to cancelled
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: adminEmail,
          cancellation_reason: reason,
          cancellation_note: note || null,
        })
        .eq("id", bookingId);

      if (bookingError) throw bookingError;

      // 2. Mark linked invoice as cancelled/void (if exists)
      await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          document_status: "void",
        })
        .eq("booking_id", bookingId);

      // 3. Notify assigned PSW if applicable
      if (pswAssigned) {
        const { data: pswProfile } = await supabase
          .from("psw_profiles")
          .select("email, first_name")
          .eq("id", pswAssigned)
          .maybeSingle();

        if (pswProfile?.email) {
          await supabase.from("notifications").insert({
            user_email: pswProfile.email,
            title: "❌ Shift Cancelled",
            body: `Order ${bookingCode} for ${clientName} has been cancelled by admin. Reason: ${reason}.`,
            type: "shift_cancelled",
          });
        }
      }

      // 4. Notify client
      if (clientEmail) {
        await supabase.from("notifications").insert({
          user_email: clientEmail,
          title: "Order Cancelled",
          body: `Your order ${bookingCode} has been cancelled. Reason: ${reason}. If you have questions, please contact us.`,
          type: "order_cancelled",
        });
      }

      toast.success(`Order ${bookingCode} cancelled`);
      setReason("");
      setNote("");
      onOpenChange(false);
      onCancelled();
    } catch (err: any) {
      console.error("Cancel error:", err);
      toast.error(`Failed to cancel: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Cancel Order
          </DialogTitle>
          <DialogDescription>
            Cancel order <strong>{bookingCode}</strong> for {clientName}. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cancellation Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Admin Notes (optional)</Label>
            <Textarea
              placeholder="Additional details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cancelling}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelling || !reason}>
            {cancelling ? "Cancelling..." : "Confirm Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

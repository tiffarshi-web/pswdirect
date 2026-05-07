import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Phone, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  formatCanadianPhone,
  isValidCanadianPhone,
  extractPhoneDigits,
} from "@/lib/phoneUtils";

interface ContactRequiredDialogProps {
  open: boolean;
  initialFirstName?: string;
  initialLastName?: string;
  initialPhone?: string;
  email: string;
  bookingUuid?: string;
  /** Called with the validated, formatted phone after successful save. */
  onResolved: (data: { firstName: string; lastName: string; phone: string }) => void;
}

/**
 * Blocking modal that gates Proceed-to-Payment when any required contact
 * field (first name / last name / phone) is missing or invalid.
 *
 * On save it:
 *   1) Updates the logged-in client's profile (if logged in)
 *   2) Stamps the draft booking row (if provided) with the new phone +
 *      contact_updated_before_payment audit flag
 *   3) Returns the validated values to the parent so they can be threaded
 *      into Stripe metadata + the booking payload
 */
export const ContactRequiredDialog = ({
  open,
  initialFirstName = "",
  initialLastName = "",
  initialPhone = "",
  email,
  bookingUuid,
  onResolved,
}: ContactRequiredDialogProps) => {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!firstName.trim()) return setError("First name is required");
    if (!lastName.trim()) return setError("Last name is required");
    if (!isValidCanadianPhone(phone))
      return setError("Please enter a valid 10-digit Canadian phone number");

    const formattedPhone = formatCanadianPhone(phone);
    setSaving(true);
    try {
      // 1) Update client profile (if logged in)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("client_profiles")
          .update({
            phone: formattedPhone,
            first_name: firstName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          })
          .eq("user_id", user.id);
      }

      // 2) Stamp the draft booking + audit flag
      if (bookingUuid) {
        await supabase
          .from("bookings")
          .update({
            client_phone: formattedPhone,
            client_first_name: firstName.trim(),
            client_last_name: lastName.trim(),
            client_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            contact_updated_before_payment: true,
            contact_updated_at: new Date().toISOString(),
          })
          .eq("id", bookingUuid);
      }

      onResolved({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: formattedPhone,
      });
      toast.success("Contact info saved");
    } catch (err: any) {
      console.error("[ContactRequiredDialog] save failed:", err);
      setError(err?.message || "Could not save contact info. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* blocking — no dismiss */ }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Phone number required before payment
          </DialogTitle>
          <DialogDescription>
            We need a way to reach you about your caregiver's arrival and shift updates.
            This is required before we can process your payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cr-first">First name *</Label>
              <Input
                id="cr-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cr-last">Last name *</Label>
              <Input
                id="cr-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cr-phone">Phone number *</Label>
            <Input
              id="cr-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(416) 555-1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={(e) => {
                const digits = extractPhoneDigits(e.target.value);
                if (digits.length === 10) setPhone(formatCanadianPhone(e.target.value));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Canadian 10-digit number. Used for shift updates only.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cr-email">Email</Label>
            <Input id="cr-email" value={email} disabled />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save & Continue to Payment"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

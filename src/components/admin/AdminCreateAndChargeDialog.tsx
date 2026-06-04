// Admin-only: Create & Charge dialog. Collects a NEW card via Stripe Elements
// and charges the booking total via the admin-charge-new-card edge function.

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let cachedStripePromise: Promise<Stripe | null> | null = null;
let cachedKey: string | null = null;
const getStripePromise = (key: string) => {
  if (!cachedStripePromise || cachedKey !== key) {
    cachedKey = key;
    cachedStripePromise = loadStripe(key);
  }
  return cachedStripePromise;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
  amount: number;
  clientName?: string;
  clientEmail?: string;
  onSuccess?: (paymentIntentId: string) => void;
}

const CardForm = ({ bookingId, bookingCode, amount, clientName, onSuccess, onClose }: {
  bookingId: string;
  bookingCode: string;
  amount: number;
  clientName?: string;
  onSuccess?: (id: string) => void;
  onClose: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleCharge = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setSubmitting(true);
    try {
      const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: { name: clientName || undefined },
      });
      if (pmErr || !paymentMethod) {
        toast.error(pmErr?.message || "Could not read card");
        setSubmitting(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("admin-charge-new-card", {
        body: { bookingId, paymentMethodId: paymentMethod.id },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.message || data.error);
        setSubmitting(false);
        return;
      }
      toast.success(`Charged $${(data.amount ?? amount).toFixed(2)} — ${data.payment_status}`);
      onSuccess?.(data.payment_intent_id);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Charge failed");
    }
    setSubmitting(false);
  };

  return (
    <>
      <div className="rounded-md border bg-background p-3">
        <CardElement options={{ hidePostalCode: false, style: { base: { fontSize: "15px" } } }} />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" /> Card details go directly to Stripe — never stored on our servers.
      </p>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleCharge} disabled={!stripe || submitting} className="gap-1.5">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          {submitting ? "Charging…" : `Charge $${amount.toFixed(2)}`}
        </Button>
      </DialogFooter>
    </>
  );
};

export const AdminCreateAndChargeDialog = ({
  open, onOpenChange, bookingId, bookingCode, amount, clientName, clientEmail, onSuccess,
}: Props) => {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingKey(true);
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "stripe_publishable_key")
        .maybeSingle();
      const key = data?.setting_value;
      if (!cancelled) {
        if (key) setStripePromise(getStripePromise(key));
        else toast.error("Stripe publishable key not configured");
        setLoadingKey(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Create & Charge — {bookingCode}
          </DialogTitle>
          <DialogDescription>
            Manually enter a card to charge ${amount.toFixed(2)}
            {clientName ? ` for ${clientName}` : ""}
            {clientEmail ? ` (${clientEmail})` : ""}. The card is attached to the customer for future charges.
          </DialogDescription>
        </DialogHeader>
        {loadingKey || !stripePromise ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <Elements stripe={stripePromise}>
            <CardForm
              bookingId={bookingId}
              bookingCode={bookingCode}
              amount={amount}
              clientName={clientName}
              onSuccess={onSuccess}
              onClose={() => onOpenChange(false)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
};

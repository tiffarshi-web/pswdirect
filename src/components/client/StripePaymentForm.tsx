import { useState, useEffect } from "react";
import { CreditCard, Lock, AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isProductionDomain } from "@/lib/devConfig";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface StripePaymentFormProps {
  amount: number; // Amount in dollars
  customerEmail: string;
  customerName: string;
  bookingDetails?: {
    bookingId?: string;
    bookingUuid?: string;
    serviceDate?: string;
    services?: string;
  };
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  onCancel?: () => void;
}

const MINIMUM_AMOUNT = 20;

// Inner form that uses Stripe hooks (must be inside Elements provider)
const CheckoutForm = ({
  amount,
  isLiveMode,
  onPaymentSuccess,
  onPaymentError,
  onCancel,
}: {
  amount: number;
  isLiveMode: boolean;
  onPaymentSuccess: (id: string) => void;
  onPaymentError: (error: string) => void;
  onCancel?: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/client`,
        },
        redirect: "if_required",
      });

      if (submitError) {
        setError(submitError.message || "Payment failed");
        onPaymentError(submitError.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log("✅ Payment confirmed:", paymentIntent.id);
        
        // Save payment_method_id for future off-session charges (overtime billing)
        const paymentMethodId = typeof paymentIntent.payment_method === 'string' 
          ? paymentIntent.payment_method 
          : paymentIntent.payment_method?.id;
        if (paymentMethodId) {
          console.log("💳 Payment method saved for future charges:", paymentMethodId.slice(0, 12) + "...");
          // Store temporarily so booking flow can persist it
          sessionStorage.setItem("last_payment_method_id", paymentMethodId);
        }
        
        toast.success("Payment processed successfully!");
        onPaymentSuccess(paymentIntent.id);
      } else if (paymentIntent && paymentIntent.status === "requires_action") {
        setError("Additional authentication required. Please complete the verification.");
      } else {
        setError("Payment was not completed. Please try again.");
        onPaymentError("Payment was not completed");
      }
    } catch (err: any) {
      const msg = err.message || "Payment failed. Please try again.";
      setError(msg);
      onPaymentError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount Display */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Amount to pay</span>
          <span className="text-2xl font-bold text-primary">
            ${amount.toFixed(2)} CAD
          </span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="border rounded-lg p-4">
        <PaymentElement />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Mode indicator */}
      {!isLiveMode && (
        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm">
          <p className="font-medium text-purple-700 dark:text-purple-300">Test Mode Active</p>
          <p className="text-purple-600 dark:text-purple-400 text-xs mt-1">
            Use test card: <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">4242 4242 4242 4242</code>
          </p>
        </div>
      )}

      {isLiveMode && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-sm">
          <p className="font-medium text-green-700 dark:text-green-300">Live Payment Mode</p>
          <p className="text-green-600 dark:text-green-400 text-xs mt-1">
            Your card will be charged ${amount.toFixed(2)} CAD.
          </p>
        </div>
      )}

      {/* Overtime Authorization Consent */}
      <div className="p-3 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground">
        <p>
          By completing this payment, you authorize PSW Direct to securely save your payment method and charge it for any additional time if your service exceeds the scheduled duration, in accordance with our overtime billing policy.
        </p>
      </div>

      {/* Security Note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Your payment information is encrypted and secure via Stripe</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isProcessing}>
            Back
          </Button>
        )}
        <Button type="submit" variant="default" className="flex-1" disabled={isProcessing || !stripe || !elements}>
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export const StripePaymentForm = ({
  amount,
  customerEmail,
  customerName,
  bookingDetails,
  onPaymentSuccess,
  onPaymentError,
  onCancel,
}: StripePaymentFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      // Determine live mode
      const live = isProductionDomain() || localStorage.getItem("stripe_dry_run") !== "true";
      setIsLiveMode(live);

      try {
        // Fetch Stripe publishable key from app_settings
        const { data: keyData } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "stripe_publishable_key")
          .maybeSingle();

        const publishableKey = keyData?.setting_value;
        if (!publishableKey) {
          setError("Stripe publishable key not configured. Please contact support.");
          setIsLoading(false);
          return;
        }

        setStripePromise(loadStripe(publishableKey));

        // Create payment intent
        const { data, error: fnError } = await supabase.functions.invoke("create-payment-intent", {
          body: {
            amount: Math.round(amount * 100),
            customerEmail,
            bookingDetails: {
              ...bookingDetails,
              clientName: customerName,
              bookingUuid: bookingDetails?.bookingUuid || "",
              bookingCode: bookingDetails?.bookingId || "",
              bookingId: bookingDetails?.bookingId || "",
            },
            isLiveMode: live,
          },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error("Payment init error:", err);
        setError(err.message || "Failed to initialize payment");
        onPaymentError(err.message || "Failed to initialize payment");
      } finally {
        setIsLoading(false);
      }
    };

    if (amount >= MINIMUM_AMOUNT) {
      init();
    }
  }, [amount, customerEmail, customerName]);

  if (amount < MINIMUM_AMOUNT) {
    return (
      <Card className="shadow-card border-primary/20">
        <CardContent className="pt-6">
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">Minimum payment is ${MINIMUM_AMOUNT.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="shadow-card border-primary/20">
        <CardContent className="pt-6 flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Initializing secure payment...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !clientSecret || !stripePromise) {
    return (
      <Card className="shadow-card border-primary/20">
        <CardContent className="pt-6">
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error || "Failed to initialize payment"}</p>
          </div>
          {onCancel && (
            <Button variant="outline" className="mt-4 w-full" onClick={onCancel}>
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5 text-primary" />
          Payment Details
          {!isLiveMode && (
            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 ml-2">
              TEST MODE
            </Badge>
          )}
          {isLiveMode && (
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 ml-2">
              LIVE
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Secure payment powered by Stripe</CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm
            amount={amount}
            isLiveMode={isLiveMode}
            onPaymentSuccess={onPaymentSuccess}
            onPaymentError={onPaymentError}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
};

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CreditCard, Lock, AlertCircle, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isProductionDomain } from "@/lib/devConfig";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface StripePaymentFormProps {
  amount: number; // Amount in dollars
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  bookingDetails?: {
    bookingId?: string;
    bookingUuid?: string;
    serviceDate?: string;
    serviceTime?: string;
    serviceType?: string | string[];
    services?: string;
  };
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  onCancel?: () => void;
}

const MINIMUM_AMOUNT = 20;
const IS_DEV = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true;
const devLog = (...args: unknown[]) => {
  if (IS_DEV) console.log("[StripePaymentForm]", ...args);
};

// ─────────────────────────────────────────────────────────────────────────────
// Module-scope singletons
// loadStripe() is called at most ONCE per publishable key for the entire
// session — never recreated on component remounts or re-renders.
// ─────────────────────────────────────────────────────────────────────────────
let cachedStripePromise: Promise<Stripe | null> | null = null;
let cachedStripeKey: string | null = null;
const getStripePromise = (publishableKey: string): Promise<Stripe | null> => {
  if (!cachedStripePromise || cachedStripeKey !== publishableKey) {
    cachedStripeKey = publishableKey;
    cachedStripePromise = loadStripe(publishableKey);
    devLog("loadStripe() called for key", publishableKey.slice(0, 12) + "…");
  }
  return cachedStripePromise;
};

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
  // Hard guard against double-submit from rapid clicks/refresh races
  const submitLockRef = useRef(false);

  // Warn user before they close/refresh the tab while a payment is in flight.
  useEffect(() => {
    if (!isProcessing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "Your payment is still processing. Leaving this page may cancel your booking.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isProcessing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (submitLockRef.current || isProcessing) {
      devLog("Submit blocked — already processing");
      return;
    }
    submitLockRef.current = true;
    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmed`,
        },
        redirect: "if_required",
      });

      if (submitError) {
        setError(submitError.message || "Payment failed");
        onPaymentError(submitError.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log("✅ Payment confirmed:", paymentIntent.id);

        // Save payment_method_id for future off-session charges (overtime billing)
        const paymentMethodId =
          typeof paymentIntent.payment_method === "string"
            ? paymentIntent.payment_method
            : paymentIntent.payment_method?.id;
        if (paymentMethodId) {
          console.log("💳 Payment method saved for future charges:", paymentMethodId.slice(0, 12) + "...");
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
      // Release lock so user can retry on failure
      submitLockRef.current = false;
    }
  };

  return (
    <>
      {/* Full-screen processing overlay — blocks accidental clicks/navigation */}
      {isProcessing && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-sm"
          role="alertdialog"
          aria-live="assertive"
          aria-label="Processing payment"
        >
          <div className="max-w-sm mx-4 text-center space-y-4 p-6 rounded-2xl border bg-card shadow-2xl">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">
              Processing your secure payment
            </h2>
            <p className="text-sm text-muted-foreground">
              Please do not close this page or press Back. Your booking will be
              confirmed automatically once payment is complete.
            </p>
          </div>
        </div>
      )}
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
              Processing payment, please do not close this page…
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
    </>
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
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // ── Stable amount: integer cents only, immune to floating-point jitter ──
  const amountCents = useMemo(() => Math.max(0, Math.round(amount * 100)), [amount]);

  // ── Idempotent booking session ID with 30-minute expiry ──
  // Persisted in sessionStorage so refresh + retry reuses the SAME id, which
  // makes the edge function return the existing PaymentIntent instead of
  // creating a duplicate. Auto-expires after 30 minutes of no completion so a
  // fresh session can be created cleanly. Cleared on successful payment.
  const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
  const bookingSessionId = useMemo(() => {
    const STORAGE_KEY = "psw_booking_session_id";
    const STORAGE_TS_KEY = "psw_booking_session_created_at";
    const generate = () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `bs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      const createdAtRaw = sessionStorage.getItem(STORAGE_TS_KEY);
      const createdAt = createdAtRaw ? parseInt(createdAtRaw, 10) : 0;
      const age = Date.now() - createdAt;
      if (existing && createdAt && age < SESSION_TTL_MS) {
        return existing;
      }
      if (existing) {
        devLog("Booking session expired (age", Math.round(age / 1000), "s) — generating fresh id");
      }
      const fresh = generate();
      sessionStorage.setItem(STORAGE_KEY, fresh);
      sessionStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
      return fresh;
    } catch {
      return generate();
    }
  }, []);

  // ── Stable session key — guards re-init from harmless re-renders ──
  // Only true billing-changing inputs (amount + email) gate re-initialization.
  const sessionKey = useMemo(
    () => `${amountCents}|${customerEmail || ""}`,
    [amountCents, customerEmail]
  );

  const initializedKeyRef = useRef<string | null>(null);
  // Latest callbacks via ref so unstable parent identities don't trigger re-init
  const onPaymentErrorRef = useRef(onPaymentError);
  useEffect(() => {
    onPaymentErrorRef.current = onPaymentError;
  }, [onPaymentError]);
  // Latest bookingDetails via ref — embedded in PaymentIntent metadata at create time only
  const bookingDetailsRef = useRef(bookingDetails);
  useEffect(() => {
    bookingDetailsRef.current = bookingDetails;
  }, [bookingDetails]);
  const customerNameRef = useRef(customerName);
  useEffect(() => {
    customerNameRef.current = customerName;
  }, [customerName]);

  useEffect(() => {
    if (amountCents < MINIMUM_AMOUNT * 100) return;
    if (!customerEmail) return;

    // Tag with retry nonce so a manual retry forces re-init even for the same key
    const initKey = `${sessionKey}#${retryNonce}`;
    if (initializedKeyRef.current === initKey) {
      devLog("Init skipped — already initialized for", initKey);
      return;
    }
    initializedKeyRef.current = initKey;
    devLog("Initializing payment intent for", initKey);

    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      setError(null);

      const live = isProductionDomain() || localStorage.getItem("stripe_dry_run") !== "true";
      if (!cancelled) setIsLiveMode(live);

      try {
        const { data: keyData } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "stripe_publishable_key")
          .maybeSingle();

        const publishableKey = keyData?.setting_value;
        if (!publishableKey) {
          if (!cancelled) {
            setError("Stripe publishable key not configured. Please contact support.");
            setIsLoading(false);
          }
          return;
        }

        if (!cancelled) setStripePromise(getStripePromise(publishableKey));

        const bd = bookingDetailsRef.current;
        const { data, error: fnError } = await supabase.functions.invoke("create-payment-intent", {
          body: {
            amount: amountCents,
            customerEmail,
            bookingSessionId,
            bookingDetails: {
              ...bd,
              clientName: customerNameRef.current,
              bookingUuid: bd?.bookingUuid || "",
              bookingCode: bd?.bookingId || "",
              bookingId: bd?.bookingId || "",
            },
            isLiveMode: live,
          },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);
        if (!data?.clientSecret) throw new Error("Missing client_secret in response");

        if (!cancelled) {
          setClientSecret(data.clientSecret);
          devLog("client_secret created", String(data.clientSecret).slice(0, 18) + "…");
        }
      } catch (err: any) {
        console.error("Payment init error:", err);
        if (!cancelled) {
          // Allow retry — wipe key so the next attempt re-initializes
          initializedKeyRef.current = null;
          setError(err.message || "Failed to initialize payment");
          onPaymentErrorRef.current(err.message || "Failed to initialize payment");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [sessionKey, amountCents, customerEmail, retryNonce]);

  // ── Stable Elements options — only changes when client_secret changes ──
  const elementsOptions = useMemo(
    () => (clientSecret ? { clientSecret } : undefined),
    [clientSecret]
  );

  // Dev-only remount detection for the Elements provider
  const elementsRenderCountRef = useRef(0);
  useEffect(() => {
    if (!IS_DEV) return;
    elementsRenderCountRef.current += 1;
    if (elementsRenderCountRef.current > 1) {
      devLog("Elements options changed — render #" + elementsRenderCountRef.current);
    }
  }, [elementsOptions]);

  const handleRetry = useCallback(() => {
    devLog("User requested retry");
    setError(null);
    setClientSecret(null);
    setRetryNonce((n) => n + 1);
  }, []);

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

  if (error || !clientSecret || !stripePromise || !elementsOptions) {
    return (
      <Card className="shadow-card border-primary/20">
        <CardContent className="pt-6 space-y-3">
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <div className="text-sm text-destructive">
              <p className="font-medium">{error || "Failed to initialize payment"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your booking details are preserved — you can retry without re-entering anything.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="default" className="flex-1" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Payment
            </Button>
            {onCancel && (
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Go Back
              </Button>
            )}
          </div>
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
        <Elements stripe={stripePromise} options={elementsOptions}>
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

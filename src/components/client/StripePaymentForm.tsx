import { useState, useEffect } from "react";
import { CreditCard, Lock, AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isProductionDomain } from "@/lib/devConfig";

interface StripePaymentFormProps {
  amount: number; // Amount in dollars
  customerEmail: string;
  customerName: string;
  bookingDetails?: {
    bookingId?: string;     // booking_code (CDT-XXXXXX or legacy PSW-XXXX)
    bookingUuid?: string;   // Real DB UUID for Stripe metadata
    serviceDate?: string;
    services?: string;
  };
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  onCancel?: () => void;
}

const MINIMUM_AMOUNT = 20; // $20 minimum

// Known test card numbers that must be REJECTED in live mode
const TEST_CARD_NUMBERS = [
  "4242424242424242", // Visa test
  "4000056655665556", // Visa debit test
  "5555555555554444", // Mastercard test
  "5200828282828210", // Mastercard debit test
  "378282246310005",  // Amex test
  "371449635398431",  // Amex test
  "6011111111111117", // Discover test
  "3056930009020004", // Diners test
  "3566002020360505", // JCB test
  "6200000000000005", // UnionPay test
];

export const StripePaymentForm = ({
  amount,
  customerEmail,
  customerName,
  bookingDetails,
  onPaymentSuccess,
  onPaymentError,
  onCancel,
}: StripePaymentFormProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState(customerName);
  const [error, setError] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);

  useEffect(() => {
    // On production, ALWAYS live mode. Otherwise check admin toggle
    if (isProductionDomain()) {
      setIsLiveMode(true);
    } else {
      // Check if live mode is enabled in admin settings (inverse of dry run)
      const dryRunSetting = localStorage.getItem("stripe_dry_run");
      setIsLiveMode(dryRunSetting !== "true");
    }
  }, []);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
    setError(null);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDate(formatExpiryDate(e.target.value));
    setError(null);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvc(e.target.value.replace(/\D/g, "").slice(0, 4));
    setError(null);
  };

  const validateCard = (): boolean => {
    const cardClean = cardNumber.replace(/\s/g, "");
    
    if (cardClean.length < 13 || cardClean.length > 19) {
      setError("Please enter a valid card number");
      return false;
    }

    const [month, year] = expiryDate.split("/");
    if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
      setError("Please enter a valid expiry date (MM/YY)");
      return false;
    }

    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      setError("Card has expired");
      return false;
    }

    if (cvc.length < 3) {
      setError("Please enter a valid CVC");
      return false;
    }

    if (!cardholderName.trim()) {
      setError("Please enter the cardholder name");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount < MINIMUM_AMOUNT) {
      setError(`Minimum payment amount is $${MINIMUM_AMOUNT.toFixed(2)}`);
      return;
    }

    if (!validateCard()) {
      return;
    }

    // LIVE MODE: Reject test card numbers
    const cardClean = cardNumber.replace(/\s/g, "");
    if (isLiveMode && TEST_CARD_NUMBERS.includes(cardClean)) {
      setError("Test cards are not accepted in live mode. Please use a real card.");
      toast.error("Test card rejected", {
        description: "The payment system is in live mode. Test cards cannot be used.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent via edge function
      const { data, error: fnError } = await supabase.functions.invoke("create-payment-intent", {
        body: {
          amount: Math.round(amount * 100), // Convert to cents
          customerEmail,
          bookingDetails: {
            ...bookingDetails,
            clientName: customerName,
            bookingUuid: bookingDetails?.bookingUuid || "",
            bookingCode: bookingDetails?.bookingId || "",
            bookingId: bookingDetails?.bookingId || "",
          },
          isLiveMode,
          cardNumber: cardClean, // Send for server-side validation
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to create payment");
      }

      if (data.error) {
        // Handle configuration errors specially
        if (data.error.includes("Configuration Error") || data.error.includes("not configured")) {
          setError("System Configuration Error: Payment processing is not available. Please contact support.");
          toast.error("System Configuration Error", {
            description: "Payment system keys are not properly configured.",
            duration: 8000,
          });
          onPaymentError(data.error);
          return;
        }
        throw new Error(data.error);
      }

      // For test mode (non-live) - simulate success with test card
      const isTestCard = TEST_CARD_NUMBERS.includes(cardClean);
      
      if (!isLiveMode && isTestCard) {
        // Simulate successful payment in test mode
        console.log("✅ Test payment simulation successful:", data.paymentIntentId);
        toast.success("Test payment successful!");
        onPaymentSuccess(data.paymentIntentId);
        return;
      }

      // For real payments
      console.log("Payment intent created:", data.paymentIntentId);
      toast.success("Payment processed successfully!");
      onPaymentSuccess(data.paymentIntentId);

    } catch (err: any) {
      console.error("Payment error:", err);
      const errorMessage = err.message || "Payment failed. Please try again.";
      setError(errorMessage);
      onPaymentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const isAmountValid = amount >= MINIMUM_AMOUNT;

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
        <CardDescription>
          Secure payment powered by Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Display */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount to pay</span>
              <span className="text-2xl font-bold text-primary">
                ${amount.toFixed(2)} CAD
              </span>
            </div>
            {!isAmountValid && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Minimum payment is ${MINIMUM_AMOUNT.toFixed(2)}
              </p>
            )}
          </div>

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <div className="relative">
              <Input
                id="cardNumber"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={handleCardNumberChange}
                className="pl-10"
                disabled={isProcessing}
              />
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={handleExpiryChange}
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvc">CVC</Label>
              <Input
                id="cvc"
                placeholder="123"
                value={cvc}
                onChange={handleCvcChange}
                type="password"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Cardholder Name */}
          <div className="space-y-2">
            <Label htmlFor="cardholderName">Cardholder Name</Label>
            <Input
              id="cardholderName"
              placeholder="Name on card"
              value={cardholderName}
              onChange={(e) => {
                setCardholderName(e.target.value);
                setError(null);
              }}
              disabled={isProcessing}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Test Card Hint - Only show in test mode */}
          {!isLiveMode && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm">
              <p className="font-medium text-purple-700 dark:text-purple-300">Test Mode Active</p>
              <p className="text-purple-600 dark:text-purple-400 text-xs mt-1">
                Use test card: <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">4242 4242 4242 4242</code>
              </p>
            </div>
          )}

          {/* Live Mode Warning */}
          {isLiveMode && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-sm">
              <p className="font-medium text-green-700 dark:text-green-300">Live Payment Mode</p>
              <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                Your card will be charged ${amount.toFixed(2)} CAD. Test cards are not accepted.
              </p>
            </div>
          )}

          {/* Security Note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Your payment information is encrypted and secure</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isProcessing}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              variant="brand"
              className="flex-1"
              disabled={isProcessing || !isAmountValid}
            >
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
      </CardContent>
    </Card>
  );
};

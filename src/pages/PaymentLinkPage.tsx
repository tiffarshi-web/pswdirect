import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StripePaymentForm } from "@/components/client/StripePaymentForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Clock, MapPin, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UnservedOrderPayData {
  id: string;
  status: string;
  pending_expires_at: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  city: string | null;
  postal_code_raw: string | null;
  service_type: string | null;
  full_client_payload: Record<string, any> | null;
  assigned_psw_id: string | null;
  payment_link_token: string | null;
}

const PaymentLinkPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<UnservedOrderPayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [createdBookingCode, setCreatedBookingCode] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!token) {
        setError("Invalid payment link.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await (supabase as any)
        .from("unserved_orders")
        .select("*")
        .eq("payment_link_token", token)
        .maybeSingle();

      if (fetchError || !data) {
        setError("Payment link not found or has expired.");
        setLoading(false);
        return;
      }

      // Validate status
      if (data.status === "PAID" || data.status === "RESOLVED") {
        setError("This payment has already been completed.");
        setLoading(false);
        return;
      }

      if (data.status === "DECLINED") {
        setError("This request has been declined.");
        setLoading(false);
        return;
      }

      if (data.status === "EXPIRED") {
        setError("This payment link has expired.");
        setLoading(false);
        return;
      }

      if (data.status !== "PAYMENT_SENT") {
        setError("This payment link is not yet ready. Please wait for confirmation.");
        setLoading(false);
        return;
      }

      // Check expiry
      if (data.pending_expires_at && new Date(data.pending_expires_at) < new Date()) {
        setError("This payment link has expired.");
        setLoading(false);
        return;
      }

      setOrder(data);
      setLoading(false);
    };

    loadOrder();
  }, [token]);

  const getOrderAmount = (): number => {
    if (!order?.full_client_payload) return 0;
    const payload = order.full_client_payload;
    return payload.total || payload.subtotal || 0;
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Call edge function to finalize: create booking, update unserved order
      const { data, error: fnError } = await supabase.functions.invoke("fulfill-unserved-order", {
        body: {
          paymentLinkToken: token,
          paymentIntentId,
        },
      });

      if (fnError || data?.error) {
        throw new Error(fnError?.message || data?.error || "Failed to finalize booking");
      }

      setCreatedBookingCode(data.bookingCode);
      setPaymentComplete(true);
      toast.success("Payment successful! Your booking has been confirmed.");
    } catch (err: any) {
      console.error("Fulfillment error:", err);
      toast.error("Payment received but booking creation failed. Please contact support.");
    }
  };

  const handlePaymentError = (errorMsg: string) => {
    toast.error(errorMsg);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-lg font-medium text-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Booking Confirmed!</h2>
            {createdBookingCode && (
              <p className="text-lg text-muted-foreground">
                Your booking code: <span className="font-mono font-bold text-primary">{createdBookingCode}</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              A confirmation email will be sent to {order?.client_email || "your email"}.
              Your assigned caregiver will be in touch.
            </p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amount = getOrderAmount();
  const payload = order?.full_client_payload || {};

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Complete Your Booking</h1>
          <p className="text-muted-foreground">
            We found a caregiver for your area! Complete payment to confirm.
          </p>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Service Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {order?.client_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{order.client_name}</span>
              </div>
            )}
            {order?.city && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{order.city}{order.postal_code_raw ? `, ${order.postal_code_raw}` : ""}</span>
              </div>
            )}
            {order?.service_type && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{order.service_type}</span>
              </div>
            )}
            {payload.serviceDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{payload.serviceDate} {payload.startTime && `at ${payload.startTime}`}</span>
              </div>
            )}
            {order?.pending_expires_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3 h-3" />
                <span>Expires: {format(new Date(order.pending_expires_at), "MMM d, yyyy h:mm a")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Form */}
        {amount > 0 ? (
          <StripePaymentForm
            amount={amount}
            customerEmail={order?.client_email || ""}
            customerName={order?.client_name || ""}
            bookingDetails={{
              services: order?.service_type || "",
              serviceDate: payload.serviceDate || "",
            }}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">Unable to determine payment amount. Please contact support.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PaymentLinkPage;

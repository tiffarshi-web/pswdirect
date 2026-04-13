import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Download, ArrowRight, Loader2, User, Calendar, MapPin, Shield, Zap } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import logo from "@/assets/logo.png";

const ORDER_STATUSES = [
  { key: "pending", label: "Order Confirmed", icon: CheckCircle },
  { key: "awaiting_assignment", label: "Awaiting PSW Assignment", icon: Clock },
  { key: "active", label: "PSW Assigned", icon: User },
  { key: "in_progress", label: "Shift In Progress", icon: Zap },
  { key: "completed", label: "Shift Completed", icon: CheckCircle },
] as const;

function getStatusIndex(status: string): number {
  if (status === "completed") return 4;
  if (status === "active" && false) return 3; // in_progress handled by checked_in_at
  if (status === "active") return 2;
  if (status === "pending" && false) return 1; // pending with no PSW
  return 0;
}

function mapBookingToStatusIndex(booking: any): number {
  if (booking.status === "completed") return 4;
  if (booking.checked_in_at) return 3;
  if (booking.psw_assigned) return 2;
  if (booking.status === "pending" || booking.status === "paid") return 1;
  return 0;
}

const OrderConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingCode = searchParams.get("code");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { canInstall, promptInstall } = useInstallPrompt();

  useEffect(() => {
    if (!bookingCode) {
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      const { data } = await (supabase as any)
        .from("bookings")
        .select("id, booking_code, status, scheduled_date, start_time, end_time, service_type, client_name, patient_name, patient_address, psw_assigned, psw_first_name, checked_in_at, signed_out_at, client_email")
        .eq("booking_code", bookingCode)
        .maybeSingle();

      setBooking(data);
      setLoading(false);
    };

    fetchBooking();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`booking-track-${bookingCode}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "bookings",
        filter: `booking_code=eq.${bookingCode}`,
      }, (payload: any) => {
        setBooking((prev: any) => prev ? { ...prev, ...payload.new } : payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingCode]);

  const statusIndex = booking ? mapBookingToStatusIndex(booking) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-lg font-medium">Order not found</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-center px-4 h-16 max-w-md mx-auto">
          <img src={logo} alt="PSW Direct" className="h-10 w-auto" />
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Success Banner */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Order Confirmed!</h1>
          <p className="text-muted-foreground">Payment received successfully</p>
          <Badge variant="outline" className="font-mono text-primary border-primary/30">
            {booking.booking_code}
          </Badge>
        </div>

        {/* Assignment Status */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {booking.psw_assigned
                    ? `${booking.psw_first_name || "Your PSW"} has been assigned`
                    : "We are now assigning a Personal Support Worker"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {booking.psw_assigned
                    ? "Your caregiver will be in touch"
                    : "You'll be notified as soon as a match is found"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold text-foreground mb-4">Order Status</h2>
            <div className="space-y-1">
              {ORDER_STATUSES.map((s, i) => {
                const isComplete = i <= statusIndex;
                const isCurrent = i === statusIndex;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex items-center gap-3 py-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isComplete ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                    }`}>
                      <Icon className={`w-4 h-4 ${isComplete ? "text-green-600" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-sm ${isCurrent ? "font-semibold text-foreground" : isComplete ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                    {isCurrent && (
                      <Badge variant="secondary" className="ml-auto text-xs">Current</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <h2 className="font-semibold text-foreground">Service Details</h2>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{booking.scheduled_date} • {booking.start_time} – {booking.end_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{booking.patient_address}</span>
            </div>
            {booking.service_type?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {booking.service_type.map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Verified PSWs</div>
          <div className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Fast Matching</div>
        </div>

        {/* PWA Install CTA */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 text-center space-y-3">
            <Download className="w-8 h-8 text-primary mx-auto" />
            <h3 className="font-semibold text-foreground">Add PSW Direct to Your Phone</h3>
            <p className="text-xs text-muted-foreground">
              Get instant notifications when your caregiver is assigned and track your care in real time.
            </p>
            {canInstall ? (
              <Button variant="brand" className="w-full" onClick={promptInstall}>
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
            ) : (
              <Button variant="brand" className="w-full" onClick={() => navigate("/install")}>
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Secondary CTA */}
        <div className="flex flex-col gap-3">
          <Button variant="outline" className="w-full" onClick={() => navigate("/client")}>
            <ArrowRight className="w-4 h-4 mr-2" />
            Continue to My Care Dashboard
          </Button>
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => navigate(`/track?code=${booking.booking_code}`)}
          >
            Continue Tracking This Order
          </Button>
        </div>
      </main>
    </div>
  );
};

export default OrderConfirmationPage;

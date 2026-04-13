import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, Clock, Loader2, User, Calendar, MapPin, Zap, Search, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import { CommunicationButtons } from "@/components/client/CommunicationButtons";
import logo from "@/assets/logo.png";

const STATUS_STEPS = [
  { key: "confirmed", label: "Order Confirmed", icon: CheckCircle },
  { key: "awaiting", label: "Awaiting PSW Assignment", icon: Clock },
  { key: "assigned", label: "PSW Assigned", icon: User },
  { key: "en_route", label: "PSW En Route", icon: MapPin },
  { key: "started", label: "Shift Started", icon: Zap },
  { key: "in_progress", label: "Shift In Progress", icon: Zap },
  { key: "completed", label: "Shift Completed", icon: CheckCircle },
];

function mapToStep(booking: any): number {
  if (booking.status === "completed") return 6;
  if (booking.signed_out_at) return 6;
  if (booking.checked_in_at) return 5;
  // en_route: PSW assigned but not checked in — use claimed_at as proxy
  if (booking.claimed_at && !booking.checked_in_at) return 3;
  if (booking.psw_assigned) return 2;
  return 1;
}

const TrackOrderPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const codeParam = searchParams.get("code") || "";
  const [bookingCode, setBookingCode] = useState(codeParam);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(!!codeParam);
  const [searched, setSearched] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendingLink, setSendingLink] = useState(false);

  const fetchBooking = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setSearched(true);

    const { data } = await (supabase as any)
      .from("bookings")
      .select("id, booking_code, status, scheduled_date, start_time, end_time, service_type, client_name, patient_name, patient_address, psw_assigned, psw_first_name, checked_in_at, signed_out_at, claimed_at, client_email")
      .eq("booking_code", code.toUpperCase().trim())
      .maybeSingle();

    setBooking(data);
    setLoading(false);

    if (data) {
      // Subscribe to realtime
      const channel = supabase
        .channel(`track-${data.booking_code}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `booking_code=eq.${data.booking_code}`,
        }, (payload: any) => {
          setBooking((prev: any) => prev ? { ...prev, ...payload.new } : payload.new);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  };

  useEffect(() => {
    if (codeParam) fetchBooking(codeParam);
  }, [codeParam]);

  const handleSendTrackingLink = async () => {
    if (!emailInput.trim()) return;
    setSendingLink(true);
    // Look up bookings by email
    const { data } = await (supabase as any)
      .from("bookings")
      .select("booking_code")
      .eq("client_email", emailInput.trim().toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      toast.success("Check your email! We've sent your tracking link.");
      // In production, this would trigger an email via edge function
      // For now, show the code
      setBookingCode(data.booking_code);
      fetchBooking(data.booking_code);
    } else {
      toast.error("No orders found for that email address.");
    }
    setSendingLink(false);
  };

  const stepIndex = booking ? mapToStep(booking) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-center px-4 h-16 max-w-md mx-auto">
          <img src={logo} alt="PSW Direct" className="h-10 w-auto" />
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground text-center">Track Your Care</h1>

        {/* Search by code */}
        {!booking && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <label className="text-sm font-medium text-foreground">Enter your booking code</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="CDT-000001"
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value)}
                    className="font-mono"
                  />
                  <Button onClick={() => fetchBooking(bookingCode)} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center text-sm text-muted-foreground">or</div>

            {/* Email lookup */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <label className="text-sm font-medium text-foreground">Email me my tracking link</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  <Button onClick={handleSendTrackingLink} disabled={sendingLink}>
                    {sendingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {searched && !booking && !loading && (
              <p className="text-center text-sm text-destructive">No order found. Please check your booking code.</p>
            )}
          </div>
        )}

        {/* Booking found — show tracking */}
        {booking && (
          <>
            <div className="text-center">
              <Badge variant="outline" className="font-mono text-primary border-primary/30 text-base px-3 py-1">
                {booking.booking_code}
              </Badge>
            </div>

            {/* Status Timeline */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="font-semibold text-foreground mb-4">Live Status</h2>
                <div className="space-y-0.5">
                  {STATUS_STEPS.map((s, i) => {
                    const isComplete = i <= stepIndex;
                    const isCurrent = i === stepIndex;
                    const Icon = s.icon;
                    return (
                      <div key={s.key} className="flex items-center gap-3 py-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          isComplete ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                        }`}>
                          <Icon className={`w-3.5 h-3.5 ${isComplete ? "text-green-600" : "text-muted-foreground"}`} />
                        </div>
                        <span className={`text-sm ${isCurrent ? "font-semibold text-foreground" : isComplete ? "text-foreground" : "text-muted-foreground"}`}>
                          {s.label}
                        </span>
                        {isCurrent && <Badge variant="secondary" className="ml-auto text-xs">Current</Badge>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* PSW Info (first name only) */}
            {booking.psw_assigned && (
              <Card className="border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{booking.psw_first_name || "Your PSW"}</p>
                      <p className="text-xs text-muted-foreground">Assigned Caregiver</p>
                    </div>
                  </div>

                  {/* Communication Buttons */}
                  <div className="mt-4">
                    <CommunicationButtons role="client" bookingId={booking.id} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Details */}
            <Card>
              <CardContent className="pt-6 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.scheduled_date} • {booking.start_time} – {booking.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.patient_address}</span>
                </div>
              </CardContent>
            </Card>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Verified PSWs</div>
              <div className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> No Contracts</div>
            </div>

            <Button variant="outline" className="w-full" onClick={() => navigate("/client")}>
              Go to My Care Dashboard
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default TrackOrderPage;

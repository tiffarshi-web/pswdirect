import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, MapPin, DollarSign, Briefcase, AlertTriangle, ChevronRight, Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { claimShiftDetailed, getClaimShiftMessage, hasActiveShiftsAsync, type ShiftRecord } from "@/lib/shiftStore";

import { CareConditionBadges } from "@/components/ui/CareConditionBadges";
import { getPSWProfileByIdFromDB, type PSWProfile } from "@/lib/pswDatabaseStore";
import { getApplicableSurgeZone } from "@/lib/businessConfig";
import logo from "@/assets/logo.png";

const BASE_PSW_RATE = 25;

const PSWJobClaimPage = () => {
  const { bookingCode } = useParams<{ bookingCode: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [jobExpired, setJobExpired] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [pswProfile, setPswProfile] = useState<PSWProfile | null>(null);

  // If not authenticated, redirect to PSW login with return URL
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/psw-login?redirect=/psw/jobs/${bookingCode}`, { replace: true });
    }
  }, [isAuthenticated, bookingCode, navigate]);

  // Load PSW profile
  useEffect(() => {
    if (user?.id) {
      getPSWProfileByIdFromDB(user.id).then(setPswProfile);
    }
  }, [user?.id]);

  // Load booking by booking_code
  useEffect(() => {
    if (!bookingCode) return;

    const fetchBooking = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("psw_safe_booking_view")
        .select("*")
        .eq("booking_code", bookingCode)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      // Reject cancelled/completed/archived bookings
      if (["cancelled", "completed", "archived"].includes(data.status)) {
        console.log(`🚫 Job ${bookingCode} is ${data.status} — not claimable`);
        setJobExpired(true);
        setLoading(false);
        return;
      }

      setBooking(data);
      setAlreadyClaimed(!!data.psw_assigned);
      setLoading(false);
    };

    fetchBooking();

    // Subscribe to realtime changes for this booking
    const channel = supabase
      .channel(`job-claim-${bookingCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `booking_code=eq.${bookingCode}` },
        (payload: any) => {
          const updated = payload.new;
          // If cancelled/completed/archived in real-time, show expired message
          if (["cancelled", "completed", "archived"].includes(updated.status)) {
            setJobExpired(true);
            setBooking(null);
            return;
          }
          setBooking(updated);
          if (updated.psw_assigned) {
            setAlreadyClaimed(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingCode]);

  const calculatePSWPayout = () => {
    // Urban Bonus disabled (payroll correction Apr 2026). Pay = booked hours × base rate.
    if (!booking) return null;
    const [startH, startM] = (booking.start_time || "0:0").split(":").map(Number);
    const [endH, endM] = (booking.end_time || "0:0").split(":").map(Number);
    const hoursWorked = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
    const basePay = hoursWorked * BASE_PSW_RATE;
    return { basePay, total: basePay };
  };

  const getGeneralLocation = (address: string): string => {
    const parts = address.split(",");
    if (parts.length >= 2) return parts[parts.length - 2].trim();
    return "Area within radius";
  };

  const handleAcceptClick = async () => {
    if (!booking || !user || isClaiming) return;
    setIsClaiming(true);

    const pswId = user.id || "";
    const hasActive = await hasActiveShiftsAsync(pswId);
    if (hasActive) {
      toast.error("Complete your active shift first", {
        description: "You must complete your current shift before accepting a new job.",
      });
      setIsClaiming(false);
      return;
    }

    const claimResult = await claimShiftDetailed(
      booking.id,
      pswId,
      user.name || "PSW User",
      pswProfile?.profilePhotoUrl,
      pswProfile?.vehiclePhotoUrl,
      pswProfile?.licensePlate
    );

    if (claimResult.ok) {
      toast.success("Job accepted.", {
        description: `${booking.client_name?.split(" ")[0] || "The client"}'s full shift details are now in your schedule.`,
      });
      navigate("/psw?tab=schedule", { replace: true });
    } else {
      toast.error(getClaimShiftMessage(claimResult.reason));
      if (claimResult.reason === "already_claimed") setAlreadyClaimed(true);
      setIsClaiming(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (jobExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logo} alt="PSW Direct" className="h-10 mb-6" />
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">This job is no longer available</h1>
        <p className="text-muted-foreground mb-6">It may have been cancelled, completed, or filled by another caregiver.</p>
        <Button variant="brand" onClick={() => navigate("/psw", { replace: true })}>View Available Jobs</Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logo} alt="PSW Direct" className="h-10 mb-6" />
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">Job Not Found</h1>
        <p className="text-muted-foreground mb-6">This job may no longer be available.</p>
        <Button variant="brand" onClick={() => navigate("/psw", { replace: true })}>View Available Jobs</Button>
      </div>
    );
  }

  if (alreadyClaimed) {
    const isMyJob = booking.psw_assigned === user?.id;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logo} alt="PSW Direct" className="h-10 mb-6" />
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold text-foreground mb-2">
          {isMyJob ? "You Already Claimed This Shift" : "This Shift Has Already Been Claimed"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isMyJob
            ? "Check your schedule for details."
            : "Another caregiver accepted this job. Check available jobs for new opportunities."}
        </p>
        <Button variant="brand" onClick={() => navigate("/psw")}>
          {isMyJob ? "Go to Dashboard" : "View Available Jobs"}
        </Button>
      </div>
    );
  }

  const payout = calculatePSWPayout();
  const generalLocation = getGeneralLocation(booking.patient_address || "");
  const services = booking.service_type || [];
  const isTransport = booking.is_transport_booking;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <img src={logo} alt="PSW Direct" className="h-8" />
        <h1 className="text-lg font-semibold text-foreground">Job Details</h1>
        <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-700">Available</Badge>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card className="shadow-card">
          <CardContent className="p-5 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{booking.booking_code}</p>
              <h2 className="text-xl font-semibold text-foreground mt-1">{booking.client_name?.split(" ")[0]}</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{booking.scheduled_date} • {booking.start_time} – {booking.end_time}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{generalLocation}</span>
              </div>
              {payout && (
                <div className="flex items-center gap-3 text-primary font-medium">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>Est. ${payout.total.toFixed(2)}</span>
                </div>
              )}
              {isTransport && (
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">Transport Required</Badge>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">REQUESTED TASKS</p>
              <div className="flex flex-wrap gap-2">
                {services.map((s: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>

            {booking.care_conditions && booking.care_conditions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">CARE CONDITIONS</p>
                <CareConditionBadges conditions={booking.care_conditions} />
              </div>
            )}

            {booking.special_notes && String(booking.special_notes).trim().length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">JOB DESCRIPTION</p>
                <div className="p-3 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {booking.special_notes}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Contact info hidden — please coordinate through the office.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          variant="brand"
          size="lg"
          className="w-full"
          onClick={handleAcceptClick}
          disabled={isClaiming}
        >
          Accept Job <ChevronRight className="w-5 h-5 ml-2" />
        </Button>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => navigate("/psw?tab=available")}
        >
          Back to Available Jobs
        </Button>
      </div>

      <ClaimShiftDialog
        isOpen={showClaimDialog}
        onClose={() => setShowClaimDialog(false)}
        onConfirm={handleConfirmClaim}
        shiftDetails={{
          clientName: booking.client_name?.split(" ")[0] || "",
          date: booking.scheduled_date,
          time: `${booking.start_time} - ${booking.end_time}`,
          address: booking.patient_address || "",
          preferredLanguages: booking.preferred_languages,
          preferredGender: booking.preferred_gender,
          services: booking.service_type || [],
          careConditions: booking.care_conditions || [],
          careConditionsOther: booking.care_conditions_other,
          specialNotes: booking.special_notes,
        }}
      />
    </div>
  );
};

export default PSWJobClaimPage;

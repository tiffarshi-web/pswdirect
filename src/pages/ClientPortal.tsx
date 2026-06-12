import { useState, useEffect } from "react";
import {
  Plus, LogOut, Download, CreditCard, Users, Clock, Home,
  CalendarClock, History, LifeBuoy, UserCircle, Phone, Mail, MapPin,
  ChevronRight, HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientBottomNav, type ClientTab } from "@/components/navigation/ClientBottomNav";
import { ActiveCareSection } from "@/components/client/ActiveCareSection";
import { UpcomingBookingsSection } from "@/components/client/UpcomingBookingsSection";
import { PastServicesSection } from "@/components/client/PastServicesSection";
import { BookingStatusSection } from "@/components/client/BookingStatusSection";

import { ReturningClientBookingFlow } from "@/components/client/ReturningClientBookingFlow";
import { CareRecipientsManager } from "@/components/client/CareRecipientsManager";
import { SavedPaymentMethodCard } from "@/components/client/SavedPaymentMethodCard";
import { OneClickRebookCard } from "@/components/client/OneClickRebookCard";
import { QuickRebookCard } from "@/components/client/QuickRebookCard";
import { MessagesInbox } from "@/components/messaging/MessagesInbox";
import { useSavedPaymentMethod } from "@/hooks/useSavedPaymentMethod";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useClientBookings } from "@/hooks/useClientBookings";
import { Navigate, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getInstallUrl } from "@/lib/domainConfig";
import { BUSINESS_CONTACT } from "@/lib/contactConfig";
import logo from "@/assets/logo.png";
import type { ServiceCategory } from "@/lib/taskConfig";

type ViewMode =
  | "home"
  | "book"
  | "book-again"
  | "messages"
  | "upcoming"
  | "history"
  | "recipients"
  | "payment"
  | "info"
  | "support";

const ClientPortal = () => {
  const { user, clientProfile, isAuthenticated, isLoading: authLoading, signOut } = useSupabaseAuth();
  const {
    activeBookings, upcomingBookings, pendingBookings, confirmedBookings,
    inProgressBookings, bookings, pastBookings, isLoading: bookingsLoading, refetch,
  } = useClientBookings();
  const { savedMethod } = useSavedPaymentMethod();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ClientTab>("home");
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [isStandalone, setIsStandalone] = useState(false);
  const [bookAgainData, setBookAgainData] = useState<any>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // Sync bottom-nav tabs to view mode
  useEffect(() => {
    if (activeTab === "book") setViewMode("book");
    else if (activeTab === "messages") setViewMode("messages");
    else if (activeTab === "history") setViewMode("history");
    else if (activeTab === "home") setViewMode("home");
  }, [activeTab]);

  if (!authLoading && !isAuthenticated) return <Navigate to="/client-login" replace />;

  if (authLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        </header>
        <main className="px-4 py-6 pb-24 max-w-md mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  const clientName =
    clientProfile?.full_name || clientProfile?.first_name || user?.email?.split("@")[0] || "there";
  const clientEmail = user?.email || "";
  const firstName = clientProfile?.first_name || clientName.split(" ")[0];
  const clientPhone = clientProfile?.phone || "";

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const handleBookingFlowBack = () => {
    refetch();
    setViewMode("home");
    setActiveTab("home");
    setBookAgainData(null);
  };

  const handleBookAgain = (booking: any, mode: "rebook" | "schedule" = "rebook") => {
    let category: ServiceCategory = "standard";
    const services = booking.service_type || [];
    const joined = services.join(" ").toLowerCase();
    if (joined.includes("doctor") || joined.includes("escort")) category = "doctor-appointment";
    else if (joined.includes("hospital") || joined.includes("discharge")) category = "hospital-discharge";

    setBookAgainData({
      serviceCategory: category,
      serviceType: services,
      address: booking.client_address,
      postalCode: booking.client_postal_code || "",
      city: "",
      specialNotes: booking.special_notes || "",
      careConditions: booking.care_conditions || [],
      duration: booking.hours ? Number(booking.hours) : undefined,
      preferredStartTime: booking.start_time ? String(booking.start_time).slice(0, 5) : undefined,
      requireDateTimeSelection: mode === "schedule",
    });
    setViewMode("book-again");
  };

  // Booking flows
  if (viewMode === "book" || viewMode === "book-again") {
    return (
      <div className="min-h-dvh bg-background">
        <div className="max-w-md mx-auto px-4 py-6">
          <ReturningClientBookingFlow
            onBack={handleBookingFlowBack}
            clientName={clientName}
            clientEmail={clientEmail}
            clientPhone={clientPhone}
            prefillData={bookAgainData || undefined}
          />
        </div>
      </div>
    );
  }

  const lastCompleted = pastBookings[0];
  const upcomingCount = upcomingBookings.length;
  const pastCount = pastBookings.length;

  const renderContent = () => {
    switch (viewMode) {
      case "messages":
        return <MessagesInbox viewerRole="client" />;

      case "recipients":
        return <CareRecipientsManager />;

      case "payment":
        return (
          <div className="space-y-4">
            <SectionHeader title="Payments & Billing" subtitle="Manage your saved card" />
            <SavedPaymentMethodCard />
            <p className="text-sm text-muted-foreground">
              Your card is securely stored by Stripe. We only ever see the last 4 digits.
            </p>
          </div>
        );

      case "upcoming":
        return (
          <div className="space-y-5">
            <SectionHeader title="Upcoming Visits" subtitle="Track your scheduled care" />
            <BookingStatusSection
              pendingBookings={pendingBookings}
              confirmedBookings={confirmedBookings}
              inProgressBookings={inProgressBookings}
            />
            <ActiveCareSection clientName={clientName} activeBookings={activeBookings} />
            <UpcomingBookingsSection upcomingBookings={upcomingBookings} onRefetch={refetch} />
            {upcomingCount === 0 && activeBookings.length === 0 && (
              <EmptyState
                icon={CalendarClock}
                title="No upcoming visits"
                message="When you book care, your visits will appear here."
                actionLabel="Book Care Now"
                onAction={() => { setViewMode("book"); setActiveTab("book"); }}
              />
            )}
          </div>
        );

      case "history":
        return (
          <div className="space-y-5">
            <SectionHeader title="Past Visits" subtitle="Invoices and care sheets" />
            <PastServicesSection onBookAgain={handleBookAgain} />
            {pastCount === 0 && (
              <EmptyState
                icon={History}
                title="No past visits yet"
                message="Your completed visits, invoices and care sheets will be here."
              />
            )}
          </div>
        );

      case "info":
        return (
          <div className="space-y-5">
            <SectionHeader title="My Information" subtitle="Your profile and care recipients" />
            <Card>
              <CardContent className="p-5 space-y-3">
                <InfoRow icon={UserCircle} label="Name" value={clientName} />
                <InfoRow icon={Mail} label="Email" value={clientEmail || "—"} />
                <InfoRow icon={Phone} label="Phone" value={clientPhone || "Not set"} />
                <InfoRow
                  icon={MapPin}
                  label="Default address"
                  value={clientProfile?.default_address || "Not set"}
                />
              </CardContent>
            </Card>
            <div className="pt-2">
              <h3 className="text-base font-semibold text-foreground mb-3">Care Recipients</h3>
              <CareRecipientsManager />
            </div>
          </div>
        );

      case "support":
        return (
          <div className="space-y-5">
            <SectionHeader title="Support" subtitle="We're here 24/7 to help" />
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                <a
                  href={BUSINESS_CONTACT.phoneTel}
                  className="flex items-center gap-4 p-5 hover:bg-accent/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-foreground">Call us</p>
                    <p className="text-sm text-muted-foreground">{BUSINESS_CONTACT.phone}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </a>
                <a
                  href={`sms:${BUSINESS_CONTACT.phoneRaw}`}
                  className="flex items-center gap-4 p-5 hover:bg-accent/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <HeartHandshake className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-foreground">Text us</p>
                    <p className="text-sm text-muted-foreground">Fast replies, day or night</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </a>
                <div className="flex items-center gap-4 p-5">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-foreground">Office</p>
                    <p className="text-sm text-muted-foreground">
                      {BUSINESS_CONTACT.address} {BUSINESS_CONTACT.postalCode}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "home":
      default:
        return (
          <div className="space-y-5">
            {/* Greeting */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Hello, {firstName}</h1>
                <p className="text-base text-muted-foreground mt-1">How can we help today?</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive h-11 w-11"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            {/* Primary action: Book Care */}
            <PrimaryDashboardCard
              icon={Plus}
              title="Book Care"
              description="Schedule a new visit in just a few steps"
              onClick={() => { setViewMode("book"); setActiveTab("book"); }}
            />

            {/* One-click rebook surfaced when possible */}
            {lastCompleted && (
              savedMethod ? (
                <OneClickRebookCard
                  lastBooking={lastCompleted}
                  onEditDetails={(b) => handleBookAgain(b, "schedule")}
                  onBookingPlaced={() => { refetch(); }}
                />
              ) : (
                <QuickRebookCard
                  lastBooking={lastCompleted}
                  onRebookLast={(b) => handleBookAgain(b, "rebook")}
                  onChangeDetails={(b) => handleBookAgain(b, "schedule")}
                />
              )
            )}

            {/* Dashboard grid */}
            <div className="grid grid-cols-2 gap-3">
              <DashboardCard
                icon={CalendarClock}
                title="Upcoming Visits"
                badge={upcomingCount > 0 ? String(upcomingCount) : undefined}
                onClick={() => setViewMode("upcoming")}
              />
              <DashboardCard
                icon={History}
                title="Past Visits"
                badge={pastCount > 0 ? String(pastCount) : undefined}
                onClick={() => { setViewMode("history"); setActiveTab("history"); }}
              />
              <DashboardCard
                icon={CreditCard}
                title="Payments & Billing"
                onClick={() => setViewMode("payment")}
              />
              <DashboardCard
                icon={UserCircle}
                title="My Information"
                onClick={() => setViewMode("info")}
              />
              <DashboardCard
                icon={Users}
                title="Care Recipients"
                onClick={() => setViewMode("recipients")}
              />
              <DashboardCard
                icon={LifeBuoy}
                title="Support"
                onClick={() => setViewMode("support")}
              />
            </div>

            {/* Live status summary */}
            {(pendingBookings.length > 0 ||
              confirmedBookings.length > 0 ||
              inProgressBookings.length > 0) && (
              <div className="pt-2">
                <BookingStatusSection
                  pendingBookings={pendingBookings}
                  confirmedBookings={confirmedBookings}
                  inProgressBookings={inProgressBookings}
                />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">My Care</span>
              {!isStandalone && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <a
                    href={getInstallUrl()}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-3.5 h-3.5" /> Install App
                  </a>
                </>
              )}
            </div>
          </div>
          {viewMode !== "home" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setViewMode("home"); setActiveTab("home"); }}
              className="h-10"
            >
              <Home className="w-4 h-4 mr-1" /> Home
            </Button>
          )}
        </div>
      </header>

      <main className="px-4 py-6 pb-24 max-w-md mx-auto">{renderContent()}</main>

      <ClientBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

/* ---------- Senior-friendly building blocks ---------- */

const PrimaryDashboardCard = ({
  icon: Icon, title, description, onClick,
}: { icon: any; title: string; description: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left rounded-2xl bg-primary text-primary-foreground shadow-card p-5 flex items-center gap-4 active:scale-[0.99] transition-transform"
  >
    <div className="w-14 h-14 rounded-full bg-primary-foreground/15 flex items-center justify-center shrink-0">
      <Icon className="w-7 h-7" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xl font-bold leading-tight">{title}</p>
      <p className="text-sm opacity-90 mt-0.5">{description}</p>
    </div>
    <ChevronRight className="w-6 h-6 opacity-80 shrink-0" />
  </button>
);

const DashboardCard = ({
  icon: Icon, title, badge, onClick,
}: { icon: any; title: string; badge?: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="relative min-h-[120px] rounded-2xl border border-border bg-card hover:bg-accent/50 active:scale-[0.99] transition-all p-4 flex flex-col items-start justify-between text-left shadow-sm"
  >
    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <p className="text-base font-semibold text-foreground leading-tight">{title}</p>
    {badge && (
      <Badge className="absolute top-3 right-3" variant="secondary">{badge}</Badge>
    )}
  </button>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div>
    <h2 className="text-2xl font-bold text-foreground">{title}</h2>
    {subtitle && <p className="text-base text-muted-foreground mt-1">{subtitle}</p>}
  </div>
);

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base text-foreground break-words">{value}</p>
    </div>
  </div>
);

const EmptyState = ({
  icon: Icon, title, message, actionLabel, onAction,
}: { icon: any; title: string; message: string; actionLabel?: string; onAction?: () => void }) => (
  <Card>
    <CardContent className="p-8 flex flex-col items-center text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionLabel && onAction && (
        <Button variant="brand" size="lg" className="mt-2 h-12" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </CardContent>
  </Card>
);

export default ClientPortal;

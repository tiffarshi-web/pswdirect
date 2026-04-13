import { useState, useEffect } from "react";
import { Plus, LogOut, Download, RefreshCw, CreditCard, Users, Clock, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientBottomNav, type ClientTab } from "@/components/navigation/ClientBottomNav";
import { ActiveCareSection } from "@/components/client/ActiveCareSection";
import { UpcomingBookingsSection } from "@/components/client/UpcomingBookingsSection";
import { PastServicesSection } from "@/components/client/PastServicesSection";
import { BookingStatusSection } from "@/components/client/BookingStatusSection";
import { ReturningClientBookingFlow } from "@/components/client/ReturningClientBookingFlow";
import { CareRecipientsManager } from "@/components/client/CareRecipientsManager";
import { SavedPaymentMethodCard } from "@/components/client/SavedPaymentMethodCard";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useClientBookings } from "@/hooks/useClientBookings";
import { Navigate, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getInstallUrl } from "@/lib/domainConfig";
import logo from "@/assets/logo.png";
import type { ServiceCategory } from "@/lib/taskConfig";

type ViewMode = "home" | "book" | "book-again" | "history" | "recipients" | "payment";

const ClientPortal = () => {
  const { user, clientProfile, isAuthenticated, isLoading: authLoading, signOut } = useSupabaseAuth();
  const { 
    activeBookings, upcomingBookings, pendingBookings, confirmedBookings,
    inProgressBookings, bookings, pastBookings, isLoading: bookingsLoading, refetch 
  } = useClientBookings();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ClientTab>("home");
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [isStandalone, setIsStandalone] = useState(false);
  const [bookAgainData, setBookAgainData] = useState<any>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // Sync tab to view mode
  useEffect(() => {
    if (activeTab === "book") setViewMode("book");
    else if (activeTab === "history") setViewMode("history");
    else if (activeTab === "home") setViewMode("home");
  }, [activeTab]);

  if (!authLoading && !isAuthenticated) return <Navigate to="/client-login" replace />;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
            <Skeleton className="h-10 w-32" /><Skeleton className="h-8 w-20" />
          </div>
        </header>
        <main className="px-4 py-6 pb-24 max-w-md mx-auto space-y-6">
          <Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  const clientName = clientProfile?.full_name || clientProfile?.first_name || user?.email?.split("@")[0] || "there";
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

  const handleBookAgain = (booking: any) => {
    // Determine service category from service_type
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
    });
    setViewMode("book-again");
  };

  // Booking flows
  if (viewMode === "book" || viewMode === "book-again") {
    return (
      <div className="min-h-screen bg-background">
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

  const renderContent = () => {
    switch (viewMode) {
      case "recipients":
        return <CareRecipientsManager />;
      case "payment":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Payment Method</h2>
            <SavedPaymentMethodCard />
            <p className="text-xs text-muted-foreground">Your payment method is securely stored by Stripe. We never store your full card number.</p>
          </div>
        );
      case "history":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Service History</h2>
              <p className="text-sm text-muted-foreground mt-1">Past care sheets and invoices</p>
            </div>
            <PastServicesSection onBookAgain={handleBookAgain} />
          </div>
        );
      case "home":
      default:
        return (
          <div className="space-y-5">
            {/* Welcome */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome, {firstName}</h1>
                <p className="text-muted-foreground mt-1">Manage your care services</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            {/* Booking Status */}
            <BookingStatusSection pendingBookings={pendingBookings} confirmedBookings={confirmedBookings} inProgressBookings={inProgressBookings} />

            {/* Primary CTA */}
            <Button variant="brand" size="lg" className="w-full h-14 text-base font-semibold shadow-card" onClick={() => { setViewMode("book"); setActiveTab("book"); }}>
              <Plus className="w-5 h-5 mr-2" />
              {bookings.length > 0 ? "Book Another Service" : "Book Care"}
            </Button>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard icon={Users} label="My Recipients" onClick={() => setViewMode("recipients")} />
              <QuickActionCard icon={CreditCard} label="Payment Method" onClick={() => setViewMode("payment")} />
              <QuickActionCard icon={Clock} label="My Orders" onClick={() => { setViewMode("history"); setActiveTab("history"); }} />
              {pastBookings.length > 0 && (
                <QuickActionCard icon={RefreshCw} label="Book Again" onClick={() => handleBookAgain(pastBookings[0])} />
              )}
            </div>

            {/* Active Care */}
            <ActiveCareSection clientName={clientName} activeBookings={activeBookings} />

            {/* Upcoming */}
            <UpcomingBookingsSection upcomingBookings={upcomingBookings} onRefetch={refetch} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">My Care</span>
              {!isStandalone && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <a href={getInstallUrl()} className="text-sm text-primary hover:underline flex items-center gap-1" target="_blank" rel="noopener noreferrer">
                    <Download className="w-3.5 h-3.5" /> Install App
                  </a>
                </>
              )}
            </div>
          </div>
          {viewMode !== "home" && viewMode !== "history" && (
            <Button variant="ghost" size="sm" onClick={() => { setViewMode("home"); setActiveTab("home"); }}>
              <Home className="w-4 h-4 mr-1" /> Home
            </Button>
          )}
        </div>
      </header>

      <main className="px-4 py-6 pb-24 max-w-md mx-auto">
        {renderContent()}
      </main>

      <ClientBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

// Quick action card component
const QuickActionCard = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left">
    <Icon className="w-5 h-5 text-primary mb-2" />
    <p className="text-sm font-medium text-foreground">{label}</p>
  </button>
);

export default ClientPortal;

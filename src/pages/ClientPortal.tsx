import { useState } from "react";
import { Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientBottomNav, type ClientTab } from "@/components/navigation/ClientBottomNav";
import { ActiveCareSection } from "@/components/client/ActiveCareSection";
import { UpcomingBookingsSection } from "@/components/client/UpcomingBookingsSection";
import { PastServicesSection } from "@/components/client/PastServicesSection";
import { ClientBookingFlow } from "@/components/client/ClientBookingFlow";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useClientBookings } from "@/hooks/useClientBookings";
import { Navigate, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import logo from "@/assets/logo.png";

const ClientPortal = () => {
  const { user, clientProfile, isAuthenticated, isLoading: authLoading, signOut } = useSupabaseAuth();
  const { activeBookings, upcomingBookings, isLoading: bookingsLoading, refetch } = useClientBookings();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ClientTab>("home");

  // Redirect if not authenticated (after loading)
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/client-login" replace />;
  }

  // Show loading skeleton
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        </header>
        <main className="px-4 py-6 pb-24 max-w-md mx-auto space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  const clientName = clientProfile?.full_name || clientProfile?.first_name || user?.email?.split("@")[0] || "there";
  const clientEmail = user?.email || "";
  const firstName = clientProfile?.first_name || clientName.split(" ")[0];
  const clientPhone = clientProfile?.phone || "";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Booking flow is triggered by the "book" tab
  if (activeTab === "book") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 py-6">
          <ClientBookingFlow 
            onBack={() => setActiveTab("home")}
            clientName={clientName}
            clientEmail={clientEmail}
            clientPhone={clientPhone}
          />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome, {firstName}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your care services
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            {/* Re-book / Request New Service Button */}
            <Button 
              variant="brand" 
              size="lg" 
              className="w-full h-14 text-base font-semibold shadow-card"
              onClick={() => setActiveTab("book")}
            >
              <Plus className="w-5 h-5 mr-2" />
              {clientProfile?.default_address ? "Re-book Service" : "Request New Service"}
            </Button>

            {/* Active Care Section */}
            <ActiveCareSection clientName={clientName} activeBookings={activeBookings} />

            {/* Upcoming Bookings */}
            <UpcomingBookingsSection upcomingBookings={upcomingBookings} onRefetch={refetch} />
          </div>
        );
      case "history":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Service History</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Past care sheets and invoices
              </p>
            </div>
            <PastServicesSection />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">My Care</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24 max-w-md mx-auto">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <ClientBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default ClientPortal;
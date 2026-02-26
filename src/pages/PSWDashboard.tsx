import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Calendar, Clock, User, Play, MapPin } from "lucide-react";
import { PSWAvailableJobsTab } from "@/components/psw/PSWAvailableJobsTab";
import { PSWUpcomingTab } from "@/components/psw/PSWUpcomingTab";
import { PSWHistoryTab } from "@/components/psw/PSWHistoryTab";
import { ActiveShiftTab } from "@/components/psw/ActiveShiftTab";
import { PSWActiveTab } from "@/components/psw/PSWActiveTab";
import { PSWProfileTab } from "@/components/psw/PSWProfileTab";
import { PSWInstallAppCard } from "@/components/psw/PSWInstallAppCard";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { type ShiftRecord, getActiveShifts } from "@/lib/shiftStore";
import { getPSWProfileByIdFromDB } from "@/lib/pswDatabaseStore";
import logo from "@/assets/logo.png";

type DashboardTab = "available" | "active" | "schedule" | "history" | "profile";

const PSWDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("available");
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [activeShiftCount, setActiveShiftCount] = useState(0);
  const [pswLocation, setPswLocation] = useState<string | null>(null);


  // Check for active shifts and auto-redirect
  useEffect(() => {
    if (!user?.id) return;
    
    const checkActiveShifts = () => {
      const activeShifts = getActiveShifts(user.id);
      setActiveShiftCount(activeShifts.length);
      
      // Auto-redirect to active tab if there are active shifts and we're on jobs tab
      if (activeShifts.length > 0 && activeTab === "available") {
        setActiveTab("active");
      }
    };
    
    checkActiveShifts();
    const interval = setInterval(checkActiveShifts, 5000);
    return () => clearInterval(interval);
  }, [user?.id, activeTab]);

  // Check if PSW is approved and get their location from the database
  useEffect(() => {
    if (!user?.id) return;

    const checkApprovalAndLocation = async () => {
      try {
        const profile = await getPSWProfileByIdFromDB(user.id);
        if (profile) {
          setIsApproved(profile.vettingStatus === "approved");
          if (profile.homeCity) {
            setPswLocation(profile.homeCity);
          }
        } else {
          setIsApproved(false);
        }
      } catch (error) {
        console.error("Error checking PSW approval:", error);
      }
    };

    checkApprovalAndLocation();

    // Poll for status updates every 30 seconds
    const interval = setInterval(checkApprovalAndLocation, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Redirect if not authenticated or wrong role
  if (!isAuthenticated || user?.role !== "psw") {
    return <Navigate to="/psw-login" replace />;
  }

  // If still loading approval status, show nothing
  if (isApproved === null) {
    return null;
  }

  // If PSW is pending, redirect to pending status page
  if (!isApproved) {
    return <Navigate to="/psw-pending" replace />;
  }

  const handleSelectShift = (shift: ShiftRecord) => {
    setSelectedShift(shift);
  };

  const handleBackFromShift = () => {
    setSelectedShift(null);
  };

  const handleShiftComplete = () => {
    setSelectedShift(null);
    setActiveTab("history");
  };

  // If a shift is selected, show the active shift view
  if (selectedShift) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
              <span className="font-semibold text-foreground">PSW Portal</span>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 pb-24 max-w-md mx-auto">
          <ActiveShiftTab 
            shift={selectedShift}
            onBack={handleBackFromShift}
            onComplete={handleShiftComplete}
          />
        </main>
        <InstallAppBanner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with location indicator */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSA Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSA Portal</span>
          </div>
          {pswLocation && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {pswLocation}
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="px-4 py-4 pb-8 max-w-md mx-auto">
        <PSWInstallAppCard />
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="available" className="flex flex-col gap-1 py-2">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs">Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex flex-col gap-1 py-2 relative">
              <Play className="w-4 h-4" />
              <span className="text-xs">Active</span>
              {activeShiftCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {activeShiftCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex flex-col gap-1 py-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex flex-col gap-1 py-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs">History</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col gap-1 py-2">
              <User className="w-4 h-4" />
              <span className="text-xs">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <PSWAvailableJobsTab />
          </TabsContent>

          <TabsContent value="active">
            <PSWActiveTab onSelectShift={handleSelectShift} />
          </TabsContent>

          <TabsContent value="schedule">
            <PSWUpcomingTab onSelectShift={handleSelectShift} />
          </TabsContent>

          <TabsContent value="history">
            <PSWHistoryTab />
          </TabsContent>

          <TabsContent value="profile">
            <PSWProfileTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Install App Banner */}
      <InstallAppBanner />
    </div>
  );
};

export default PSWDashboard;

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Calendar, Clock, User, Play, MapPin, LogOut, DollarSign, FileText, FolderOpen } from "lucide-react";
import { PSWAvailableJobsTab } from "@/components/psw/PSWAvailableJobsTab";
import { PSWUpcomingTab } from "@/components/psw/PSWUpcomingTab";
import { PSWHistoryTab } from "@/components/psw/PSWHistoryTab";
import { ActiveShiftTab } from "@/components/psw/ActiveShiftTab";
import { PSWActiveTab } from "@/components/psw/PSWActiveTab";
import { PSWProfileTab } from "@/components/psw/PSWProfileTab";
import { PSWEarningsTab } from "@/components/psw/PSWEarningsTab";
import { PSWCareSheetsTab } from "@/components/psw/PSWCareSheetsTab";
import { PSWDocumentsTab } from "@/components/psw/PSWDocumentsTab";
import { PSWInstallAppCard } from "@/components/psw/PSWInstallAppCard";
import { EarningsSnapshotWidget } from "@/components/psw/EarningsSnapshotWidget";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { NotificationsBell } from "@/components/psw/NotificationsBell";
import { PushNotificationModal } from "@/components/psw/PushNotificationModal";
import { PushNotificationBanner } from "@/components/psw/PushNotificationBanner";
import { usePushNotificationStatus } from "@/hooks/usePushNotificationStatus";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { type ShiftRecord, getActiveShiftsAsync } from "@/lib/shiftStore";
import { getPSWProfileByEmailFromDB, getPSWProfileByIdFromDB } from "@/lib/pswDatabaseStore";
import logo from "@/assets/logo.png";

type DashboardTab = "available" | "active" | "schedule" | "history" | "earnings" | "caresheets" | "documents" | "profile";

const PSWDashboard = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>("available");
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [activeShiftCount, setActiveShiftCount] = useState(0);
  const [pswLocation, setPswLocation] = useState<string | null>(null);
  const pushStatus = usePushNotificationStatus();


  // Check for active shifts and auto-redirect
  useEffect(() => {
    if (!user?.id) return;
    
    const checkActiveShifts = async () => {
      const activeShifts = await getActiveShiftsAsync(user.id);
      setActiveShiftCount(activeShifts.length);
      
      // Auto-redirect to active tab if there are active shifts and we're on jobs tab
      if (activeShifts.length > 0 && activeTab === "available") {
        setActiveTab("active");
      }
    };
    
    checkActiveShifts();
    const interval = setInterval(checkActiveShifts, 10000);
    return () => clearInterval(interval);
  }, [user?.id, activeTab]);

  // Connect PSW user data to Progressier for push notification targeting
  useEffect(() => {
    if (!user?.email) return;
    try {
      if ((window as any).progressier) {
        (window as any).progressier.add({ email: user.email, tags: "psw" });
        console.log("📱 Progressier: PSW user data synced", user.email);
      }
    } catch (e) {
      console.warn("Progressier sync failed:", e);
    }
  }, [user?.email]);

  // Check if PSW is approved and get their location from the database
  useEffect(() => {
    if (!user?.email && !user?.id) {
      setIsApproved(false);
      return;
    }

    const checkApprovalAndLocation = async () => {
      try {
        let profile = user?.email
          ? await getPSWProfileByEmailFromDB(user.email)
          : null;

        if (!profile && user?.id) {
          profile = await getPSWProfileByIdFromDB(user.id);
        }

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
        setIsApproved(false);
      }
    };

    checkApprovalAndLocation();

    // Poll for status updates every 30 seconds
    const interval = setInterval(checkApprovalAndLocation, 30000);

    return () => clearInterval(interval);
  }, [user?.email, user?.id]);

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
          <div className="flex items-center gap-1">
            <NotificationsBell />
            {pswLocation && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {pswLocation}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => { await logout(); navigate("/psw-login"); }}
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="px-4 py-4 pb-8 max-w-md mx-auto">
        <PSWInstallAppCard />
        {pushStatus.shouldShowBanner && (
          <PushNotificationBanner onEnable={pushStatus.requestPermission} />
        )}
        <EarningsSnapshotWidget onNavigate={() => setActiveTab("earnings")} />
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
          <TabsList className="grid w-full grid-cols-8 mb-6">
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
            <TabsTrigger value="earnings" className="flex flex-col gap-1 py-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="caresheets" className="flex flex-col gap-1 py-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Sheets</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex flex-col gap-1 py-2">
              <FolderOpen className="w-4 h-4" />
              <span className="text-xs">Docs</span>
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

          <TabsContent value="earnings">
            <PSWEarningsTab />
          </TabsContent>

          <TabsContent value="caresheets">
            <PSWCareSheetsTab />
          </TabsContent>

          <TabsContent value="documents">
            <PSWDocumentsTab />
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

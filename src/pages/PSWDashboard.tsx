import { useState, useEffect, useRef, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Calendar, Clock, User, Play, MapPin, LogOut, DollarSign, FileText, FolderOpen, MessageSquare } from "lucide-react";
import { MessagesInbox } from "@/components/messaging/MessagesInbox";
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
import { PSWTabErrorBoundary } from "@/components/psw/PSWTabErrorBoundary";
import { usePushNotificationStatus } from "@/hooks/usePushNotificationStatus";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { PSWProfileProvider, usePSWProfileContext } from "@/contexts/PSWProfileContext";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { type ShiftRecord, getActiveShiftsAsync } from "@/lib/shiftStore";
import { useAvailableJobsCount } from "@/hooks/useAvailableJobsCount";

import { checkPSWApproval } from "@/lib/pswApproval";
import { purgeLegacyPayrollLocalStorage } from "@/lib/legacyStorageCleanup";
import logo from "@/assets/logo.png";

type DashboardTab = "available" | "active" | "schedule" | "messages" | "history" | "earnings" | "caresheets" | "documents" | "profile";

const VALID_TABS: DashboardTab[] = ["available", "active", "schedule", "messages", "history", "earnings", "caresheets", "documents", "profile"];

const PSWDashboardInner = () => {
  const { user, isAuthenticated, isLoading, loadingMessage, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as DashboardTab) || "available";
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    VALID_TABS.includes(initialTab) ? initialTab : "available"
  );
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [activeShiftCount, setActiveShiftCount] = useState(0);
  const pushStatus = usePushNotificationStatus();
  const availableJobsCount = useAvailableJobsCount(user?.id);
  const { profile: sharedProfile } = usePSWProfileContext();
  const pswLocation = sharedProfile?.homeCity || null;




  // Track whether the initial auto-redirect has already fired
  const hasAutoRedirected = useRef(false);

  // One-time purge of legacy localStorage payroll/payout/shift cache.
  // Prevents stale ghost totals (e.g. -$450 / $150) from showing on caregivers
  // who have no real shifts in the database.
  useEffect(() => {
    purgeLegacyPayrollLocalStorage();
  }, []);

  // Check for active shifts — poll every 10s but do NOT depend on activeTab
  // Auto-redirect to "active" tab ONLY once on initial load
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const checkActiveShifts = async () => {
      try {
        const activeShifts = await getActiveShiftsAsync(user.id);
        if (cancelled) return;
        setActiveShiftCount(activeShifts.length);

        // Auto-redirect ONLY on first check, and only if still on the default tab
        if (!hasAutoRedirected.current && activeShifts.length > 0) {
          hasAutoRedirected.current = true;
          setActiveTab((prev) => (prev === "available" ? "active" : prev));
        }
      } catch (e) {
        console.warn("Active shift check failed:", e);
      }
    };

    checkActiveShifts();
    // Poll every 30s (reduced from 10s) — realtime shift updates fire immediately
    // via the shiftStore channel, this interval is just a safety refresher.
    const interval = setInterval(checkActiveShifts, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id]); // ← activeTab intentionally removed

  // Connect PSW user data to Progressier for push notification targeting
  useEffect(() => {
    if (!user?.email) return;
    try {
      if ((window as any).progressier) {
        (window as any).progressier.add({ email: user.email, tags: "psw" });
      }
    } catch (e) {
      console.warn("Progressier sync failed:", e);
    }
  }, [user?.email]);

  // Check if PSW is approved and get their location from the database
  // Uses a ref to avoid blanking the screen on subsequent polls
  const approvalChecked = useRef(false);

  useEffect(() => {
    if (!user?.email && !user?.id) {
      setIsApproved(false);
      return;
    }

    let cancelled = false;
    let fastRetryTimer: number | undefined;
    let attempt = 0;

    const checkApproval = async () => {
      try {
        const result = await checkPSWApproval({ userId: user?.id, email: user?.email });
        if (cancelled) return;

        if (result.state === "approved") {
          setIsApproved(true);
          approvalChecked.current = true;
        } else if (result.state === "not_approved") {
          setIsApproved(false);
          approvalChecked.current = true;
        } else {
          // "unknown" — transient. On the first few checks retry quickly
          // (2s → 4s → 6s) so the user isn't stuck on a spinner for 30s.
          console.warn("[PSWDashboard] Approval check unknown — fast retry.");
          if (!approvalChecked.current && attempt < 3) {
            attempt += 1;
            const delay = 2000 * attempt;
            fastRetryTimer = window.setTimeout(() => {
              if (!cancelled) checkApproval();
            }, delay);
          }
        }
      } catch (error) {
        console.error("Error checking PSW approval:", error);
        // Do not flip to false on exception — retry on the next tick.
      }
    };

    checkApproval();
    // Slow background refresh only after the first confirmed answer.
    const interval = setInterval(checkApproval, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (fastRetryTimer) window.clearTimeout(fastRetryTimer);
    };
  }, [user?.email, user?.id]);


  // Redirect if not authenticated or wrong role
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "psw") {
    return <Navigate to="/psw-login" replace />;
  }

  // If still loading approval status on first check, show a stable placeholder
  if (isApproved === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { navigate("/psw-login"); void logout(); }}
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
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
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSW Portal</span>
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
              onClick={() => { navigate("/psw-login"); void logout(); }}
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
        <Tabs value={activeTab} onValueChange={(v) => { const t = v as DashboardTab; setActiveTab(t); setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("tab", t); return p; }, { replace: true }); }}>
          <TabsList className="w-full flex overflow-x-auto no-scrollbar gap-1 mb-6 h-auto p-1 justify-start">
            <TabsTrigger value="available" className="shrink-0 min-w-[68px] flex flex-col items-center gap-1 py-2 px-2 relative">
              <Briefcase className="w-4 h-4" />
              <span className="text-[11px] leading-none">Jobs</span>
              {availableJobsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow">
                  {availableJobsCount > 99 ? "99+" : availableJobsCount}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger value="active" className="shrink-0 min-w-[68px] flex flex-col items-center gap-1 py-2 px-2 relative">
              <Play className="w-4 h-4" />
              <span className="text-[11px] leading-none">Active</span>
              {activeShiftCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {activeShiftCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="shrink-0 min-w-[68px] flex flex-col items-center gap-1 py-2 px-2">
              <Calendar className="w-4 h-4" />
              <span className="text-[11px] leading-none">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="shrink-0 min-w-[68px] flex flex-col items-center gap-1 py-2 px-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-[11px] leading-none">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="shrink-0 min-w-[68px] flex flex-col items-center gap-1 py-2 px-2">
              <Clock className="w-4 h-4" />
              <span className="text-[11px] leading-none">History</span>
            </TabsTrigger>
            <TabsTrigger value="earnings" className="shrink-0 min-w-[68px] flex flex-col items-center gap-1 py-2 px-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-[11px] leading-none">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="caresheets" className="shrink-0 min-w-[68px] flex flex-col items-center gap-1 py-2 px-2">
              <FileText className="w-4 h-4" />
              <span className="text-[11px] leading-none">Sheets</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="shrink-0 min-w-[68px] flex flex-col items-center gap-1 py-2 px-2">
              <FolderOpen className="w-4 h-4" />
              <span className="text-[11px] leading-none">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="shrink-0 min-w-[68px] flex flex-col items-center gap-1 py-2 px-2">
              <User className="w-4 h-4" />
              <span className="text-[11px] leading-none">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <PSWTabErrorBoundary tabName="Available jobs"><PSWAvailableJobsTab /></PSWTabErrorBoundary>
          </TabsContent>

          <TabsContent value="active">
            <PSWTabErrorBoundary tabName="Active shift"><PSWActiveTab onSelectShift={handleSelectShift} /></PSWTabErrorBoundary>
          </TabsContent>

          <TabsContent value="schedule">
            <PSWTabErrorBoundary tabName="Schedule"><PSWUpcomingTab onSelectShift={handleSelectShift} /></PSWTabErrorBoundary>
          </TabsContent>

          <TabsContent value="messages">
            <PSWTabErrorBoundary tabName="Messages"><MessagesInbox viewerRole="psw" /></PSWTabErrorBoundary>
          </TabsContent>

          <TabsContent value="history">
            <PSWTabErrorBoundary tabName="History"><PSWHistoryTab /></PSWTabErrorBoundary>
          </TabsContent>

          <TabsContent value="earnings">
            <PSWTabErrorBoundary tabName="Earnings"><PSWEarningsTab /></PSWTabErrorBoundary>
          </TabsContent>

          <TabsContent value="caresheets">
            <PSWTabErrorBoundary tabName="Care sheets"><PSWCareSheetsTab /></PSWTabErrorBoundary>
          </TabsContent>

          <TabsContent value="documents">
            <PSWTabErrorBoundary tabName="Documents"><PSWDocumentsTab /></PSWTabErrorBoundary>
          </TabsContent>

          <TabsContent value="profile">
            <PSWTabErrorBoundary tabName="Profile"><PSWProfileTab /></PSWTabErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>

      {/* Install App Banner */}
      <InstallAppBanner />

      {/* Push Notification First-Login Modal */}
      <PushNotificationModal
        open={pushStatus.shouldShowModal}
        onEnable={pushStatus.requestPermission}
        onDismiss={pushStatus.dismissPrompt}
      />
    </div>
  );
};

const PSWDashboard = () => (
  <PSWProfileProvider>
    <PSWDashboardInner />
  </PSWProfileProvider>
);

export default PSWDashboard;


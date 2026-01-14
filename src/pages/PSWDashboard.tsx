import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Calendar, Clock, User } from "lucide-react";
import { PSWAvailableJobsTab } from "@/components/psw/PSWAvailableJobsTab";
import { PSWUpcomingTab } from "@/components/psw/PSWUpcomingTab";
import { PSWHistoryTab } from "@/components/psw/PSWHistoryTab";
import { ActiveShiftTab } from "@/components/psw/ActiveShiftTab";
import { PSWProfileTab } from "@/components/psw/PSWProfileTab";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { type ShiftRecord } from "@/lib/shiftStore";
import { isPSWApproved, initializePSWProfiles } from "@/lib/pswProfileStore";
import logo from "@/assets/logo.png";

type DashboardTab = "available" | "schedule" | "history" | "profile";

const PSWDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("available");
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  // Check if PSW is approved
  const isApproved = useMemo(() => {
    if (!user?.id) return false;
    initializePSWProfiles();
    return isPSWApproved(user.id);
  }, [user?.id]);

  // Redirect if not authenticated or wrong role
  if (!isAuthenticated || user?.role !== "psw") {
    return <Navigate to="/psw-login" replace />;
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSW Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="px-4 py-4 pb-8 max-w-md mx-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="available" className="flex flex-col gap-1 py-2">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs">Jobs</span>
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
    </div>
  );
};

export default PSWDashboard;
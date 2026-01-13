import { useState } from "react";
import { PSWBottomNav, type PSWTab } from "@/components/navigation/PSWBottomNav";
import { ScheduleTab } from "@/components/ScheduleTab";
import { ActiveShiftTab } from "@/components/psw/ActiveShiftTab";
import { AvailableShiftsTab } from "@/components/psw/AvailableShiftsTab";
import { PSWProfileTab } from "@/components/psw/PSWProfileTab";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { type ShiftRecord } from "@/lib/shiftStore";
import logo from "@/assets/logo.png";

const PSWDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<PSWTab>("schedule");
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  // Redirect if not authenticated or wrong role
  if (!isAuthenticated || user?.role !== "psw") {
    return <Navigate to="/" replace />;
  }

  const handleSelectShift = (shift: ShiftRecord) => {
    setSelectedShift(shift);
    setActiveTab("active");
  };

  const handleBackFromShift = () => {
    setSelectedShift(null);
    setActiveTab("schedule");
  };

  const handleShiftComplete = () => {
    setSelectedShift(null);
    setActiveTab("schedule");
  };

  const renderContent = () => {
    // If a shift is selected, show the active shift view
    if (selectedShift && activeTab === "active") {
      return (
        <ActiveShiftTab 
          shift={selectedShift}
          onBack={handleBackFromShift}
          onComplete={handleShiftComplete}
        />
      );
    }

    switch (activeTab) {
      case "schedule":
        return <ScheduleTab onSelectShift={handleSelectShift} />;
      case "active":
        return <AvailableShiftsTab />;
      case "profile":
        return <PSWProfileTab />;
      default:
        return <ScheduleTab onSelectShift={handleSelectShift} />;
    }
  };

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

      {/* Main Content */}
      <main className="px-4 py-6 pb-24 max-w-md mx-auto">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <PSWBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default PSWDashboard;

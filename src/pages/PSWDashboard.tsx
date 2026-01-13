import { useState } from "react";
import { PSWBottomNav, type PSWTab } from "@/components/navigation/PSWBottomNav";
import { ScheduleTab } from "@/components/ScheduleTab";
import { ActiveShiftTab } from "@/components/psw/ActiveShiftTab";
import { PSWProfileTab } from "@/components/psw/PSWProfileTab";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const PSWDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<PSWTab>("schedule");

  // Redirect if not authenticated or wrong role
  if (!isAuthenticated || user?.role !== "psw") {
    return <Navigate to="/" replace />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "schedule":
        return <ScheduleTab />;
      case "active":
        return <ActiveShiftTab />;
      case "profile":
        return <PSWProfileTab />;
      default:
        return <ScheduleTab />;
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

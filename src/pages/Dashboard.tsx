import { useState } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ScheduleTab } from "@/components/ScheduleTab";
import { BookingsTab } from "@/components/BookingsTab";
import { ProfileTab } from "@/components/ProfileTab";
import logo from "@/assets/logo.png";

type TabType = "schedule" | "bookings" | "profile";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>("schedule");

  const renderContent = () => {
    switch (activeTab) {
      case "schedule":
        return <ScheduleTab />;
      case "bookings":
        return <BookingsTab />;
      case "profile":
        return <ProfileTab />;
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
            <span className="font-semibold text-foreground">PSW DIRECT</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24 max-w-md mx-auto">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Dashboard;

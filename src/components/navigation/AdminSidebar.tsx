import { DollarSign, Calendar, Users, Radio, LogOut, Clock, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

export type AdminTab = "pricing" | "tasks" | "bookings" | "psw" | "pending" | "radius";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const { logout } = useAuth();
  
  const tabs = [
    { id: "pricing" as const, label: "Pricing & Billing", icon: DollarSign },
    { id: "tasks" as const, label: "Task Manager", icon: ClipboardList },
    { id: "bookings" as const, label: "Bookings", icon: Calendar },
    { id: "psw" as const, label: "PSW Oversight", icon: Users },
    { id: "pending" as const, label: "Pending PSWs", icon: Clock },
    { id: "radius" as const, label: "Radius Alerts", icon: Radio },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
        <span className="font-semibold text-foreground">Admin Panel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};

// Mobile version
export const AdminMobileNav = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const tabs = [
    { id: "pricing" as const, label: "Pricing", icon: DollarSign },
    { id: "tasks" as const, label: "Tasks", icon: ClipboardList },
    { id: "bookings" as const, label: "Bookings", icon: Calendar },
    { id: "psw" as const, label: "PSWs", icon: Users },
    { id: "pending" as const, label: "Pending", icon: Clock },
    { id: "radius" as const, label: "Alerts", icon: Radio },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-elevated z-50 lg:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span className={cn(
                "text-xs font-medium",
                isActive && "font-semibold"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

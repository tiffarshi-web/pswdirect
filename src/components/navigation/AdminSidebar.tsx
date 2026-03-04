import { DollarSign, Calendar, Users, LogOut, ClipboardList, Settings, Shield, Play, Map, AlertTriangle, QrCode, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

export type AdminTab = "active-psws" | "pending-review" | "psw-coverage" | "active-shifts" | "orders" | "live-map" | "client-database" | "payroll" | "pricing-tasks" | "unserved" | "security" | "gear-box";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const { logout } = useAuth();
  
  const tabs = [
    { id: "active-psws" as const, label: "Active PSWs", icon: Users },
    { id: "pending-review" as const, label: "Pending Review", icon: UserCheck },
    { id: "psw-coverage" as const, label: "PSW Coverage", icon: Map },
    { id: "active-shifts" as const, label: "Active Shifts", icon: Play },
    { id: "orders" as const, label: "Orders", icon: Calendar },
    { id: "client-database" as const, label: "Clients", icon: UserCheck },
    { id: "payroll" as const, label: "Payroll", icon: DollarSign },
    { id: "pricing-tasks" as const, label: "Pricing & Tasks", icon: ClipboardList },
    { id: "unserved" as const, label: "Unserved", icon: AlertTriangle },
    { id: "security" as const, label: "Security", icon: Shield },
    { id: "gear-box" as const, label: "Gear Box", icon: QrCode },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-card border-r border-border h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
        <span className="font-semibold text-foreground">Admin Panel</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
    { id: "active-psws" as const, label: "PSWs", icon: Users },
    { id: "orders" as const, label: "Orders", icon: Calendar },
    { id: "payroll" as const, label: "Payroll", icon: DollarSign },
    { id: "client-database" as const, label: "Clients", icon: UserCheck },
    { id: "security" as const, label: "Security", icon: Shield },
    { id: "gear-box" as const, label: "More", icon: Settings },
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

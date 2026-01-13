import { Calendar, PlayCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type PSWTab = "schedule" | "active" | "profile";

interface PSWBottomNavProps {
  activeTab: PSWTab;
  onTabChange: (tab: PSWTab) => void;
}

export const PSWBottomNav = ({ activeTab, onTabChange }: PSWBottomNavProps) => {
  const tabs = [
    { id: "schedule" as const, label: "Schedule", icon: Calendar },
    { id: "active" as const, label: "Active Shift", icon: PlayCircle },
    { id: "profile" as const, label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-elevated z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
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

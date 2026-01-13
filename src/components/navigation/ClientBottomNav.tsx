import { Home, PlusCircle, History } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientTab = "home" | "book" | "history";

interface ClientBottomNavProps {
  activeTab: ClientTab;
  onTabChange: (tab: ClientTab) => void;
}

export const ClientBottomNav = ({ activeTab, onTabChange }: ClientBottomNavProps) => {
  const tabs = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "book" as const, label: "Book", icon: PlusCircle },
    { id: "history" as const, label: "History", icon: History },
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

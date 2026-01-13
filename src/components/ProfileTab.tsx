import { User, Settings, Bell, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const menuItems = [
  { icon: Settings, label: "Account Settings" },
  { icon: Bell, label: "Notifications" },
  { icon: HelpCircle, label: "Help & Support" },
];

export const ProfileTab = () => {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sarah Johnson</h2>
          <p className="text-sm text-muted-foreground">sarah.johnson@email.com</p>
        </div>
      </div>

      {/* Menu Items */}
      <Card className="shadow-card">
        <CardContent className="p-0 divide-y divide-border">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Logout Button */}
      <Button 
        variant="outline" 
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

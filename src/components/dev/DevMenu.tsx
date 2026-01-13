// Developer Testing Menu
// Floating menu for role switching during development
// Only visible when liveAuthEnabled is false

import { useState, useEffect } from "react";
import { Bug, User, Shield, Heart, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { getDevConfig, setDevRole } from "@/lib/devConfig";
import { cn } from "@/lib/utils";

interface RoleOption {
  id: UserRole;
  label: string;
  icon: React.ElementType;
  path: string;
  color: string;
}

const roles: RoleOption[] = [
  { 
    id: "admin", 
    label: "Admin", 
    icon: Shield, 
    path: "/admin",
    color: "bg-purple-500 hover:bg-purple-600"
  },
  { 
    id: "psw", 
    label: "Vetted PSW", 
    icon: Heart, 
    path: "/psw",
    color: "bg-emerald-500 hover:bg-emerald-600"
  },
  { 
    id: "client", 
    label: "Guest Client", 
    icon: User, 
    path: "/book",
    color: "bg-blue-500 hover:bg-blue-600"
  },
];

export const DevMenu = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const { login, logout, user } = useAuth();
  const navigate = useNavigate();

  // Check if dev menu should be visible
  useEffect(() => {
    const config = getDevConfig();
    setIsVisible(!config.liveAuthEnabled);
    setActiveRole(config.devRole);
  }, []);

  // Listen for config changes
  useEffect(() => {
    const checkConfig = () => {
      const config = getDevConfig();
      setIsVisible(!config.liveAuthEnabled);
      setActiveRole(config.devRole);
    };

    // Check every second for changes
    const interval = setInterval(checkConfig, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleSelect = (role: RoleOption) => {
    // Update dev config
    setDevRole(role.id);
    setActiveRole(role.id);
    
    // Login as this role
    const mockEmails: Record<UserRole, string> = {
      admin: "admin@pswdirect.ca",
      psw: "sarah.johnson@pswdirect.ca",
      client: "guest@example.com",
    };
    
    login(role.id, mockEmails[role.id]);
    
    // Navigate to the role's portal
    navigate(role.path);
    
    // Collapse menu
    setIsExpanded(false);
  };

  const handleClear = () => {
    setDevRole(null);
    setActiveRole(null);
    logout();
    navigate("/");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[100] lg:bottom-4">
      {/* Collapsed State */}
      {!isExpanded ? (
        <Button
          onClick={() => setIsExpanded(true)}
          className="rounded-full w-12 h-12 shadow-lg bg-amber-500 hover:bg-amber-600 text-white"
          size="icon"
        >
          <Bug className="w-5 h-5" />
        </Button>
      ) : (
        /* Expanded State */
        <Card className="w-64 shadow-elevated border-amber-200 bg-background/95 backdrop-blur-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">Dev Menu</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {/* Current Role Badge */}
            {activeRole && (
              <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <span className="text-xs text-muted-foreground">Active:</span>
                <Badge variant="secondary" className="text-xs">
                  {roles.find(r => r.id === activeRole)?.label}
                </Badge>
              </div>
            )}

            {/* Role Buttons */}
            <div className="space-y-2">
              {roles.map((role) => {
                const Icon = role.icon;
                const isActive = activeRole === role.id;
                
                return (
                  <Button
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={cn(
                      "w-full justify-start gap-2 text-white",
                      role.color,
                      isActive && "ring-2 ring-offset-2 ring-offset-background ring-white/50"
                    )}
                    size="sm"
                  >
                    <Icon className="w-4 h-4" />
                    {role.label}
                    {isActive && <span className="ml-auto text-xs opacity-80">✓</span>}
                  </Button>
                );
              })}
            </div>

            {/* Clear Button */}
            {activeRole && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleClear}
              >
                <X className="w-3 h-3 mr-1" />
                Clear & Return Home
              </Button>
            )}

            {/* Info */}
            <p className="text-[10px] text-muted-foreground text-center pt-2 border-t">
              Live Auth is OFF. Enable in Admin Panel.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

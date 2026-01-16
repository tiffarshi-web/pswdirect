// Developer Settings Section for Admin Panel
// Contains the "Production Switch" to toggle live authentication

import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle2, Bug, Mail, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { getDevConfig, toggleLiveAuth, type DevConfig } from "@/lib/devConfig";
import { toast } from "sonner";

export const DevSettingsSection = () => {
  const [config, setConfig] = useState<DevConfig>(getDevConfig());

  // Sync with localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      setConfig(getDevConfig());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleLiveAuth = (enabled: boolean) => {
    const updated = toggleLiveAuth(enabled);
    setConfig(updated);
    
    if (enabled) {
      toast.success("Live Authentication ENABLED", {
        description: "App now requires full login and vetting. Dev Menu is hidden.",
      });
    } else {
      toast.info("Live Authentication DISABLED", {
        description: "Dev Menu is now visible for role switching.",
      });
    }
  };

  // Check API key status
  const hasEmailAPI = !!(import.meta.env.VITE_RESEND_API_KEY || import.meta.env.VITE_SENDGRID_API_KEY);

  return (
    <div className="space-y-6">
      {/* Production Switch */}
      <Card className="shadow-card border-amber-200 dark:border-amber-800/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-lg">Production Mode</CardTitle>
          </div>
          <CardDescription>
            Control authentication requirements for the entire application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="live-auth" className="text-base font-medium">
                Enable Live Authentication
              </Label>
              <p className="text-sm text-muted-foreground">
                {config.liveAuthEnabled 
                  ? "Full login and vetting required"
                  : "Dev bypass mode active - anyone can access any role"
                }
              </p>
            </div>
            <Switch
              id="live-auth"
              checked={config.liveAuthEnabled}
              onCheckedChange={handleToggleLiveAuth}
            />
          </div>

          {/* Status Indicator */}
          <div className={`flex items-start gap-3 p-3 rounded-lg ${
            config.liveAuthEnabled 
              ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
          }`}>
            {config.liveAuthEnabled ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-200">
                    Production Mode Active
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Users must log in with valid credentials. PSWs require vetting approval.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Development Mode Active
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    The floating Dev Menu allows instant role switching without authentication.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Current Dev Role */}
          {!config.liveAuthEnabled && config.devRole && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Bug className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Current Dev Role:</span>
              <Badge variant="outline">{config.devRole}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Infrastructure Status */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Communication Infrastructure</CardTitle>
          </div>
          <CardDescription>
            Status of email notification service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email (Resend/SendGrid)</p>
                <p className="text-xs text-muted-foreground">
                  {hasEmailAPI 
                    ? "API key configured - production ready"
                    : "No API key - using toast notifications"
                  }
                </p>
              </div>
            </div>
            <Badge variant={hasEmailAPI ? "default" : "secondary"}>
              {hasEmailAPI ? "Connected" : "Dev Mode"}
            </Badge>
          </div>

          {/* Environment Variables Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
              Environment Variables Required:
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 font-mono">
              <li>• VITE_RESEND_API_KEY <span className="text-blue-500">(or VITE_SENDGRID_API_KEY)</span></li>
            </ul>
          </div>

          {/* Test Notifications Note */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            In dev mode, all notifications appear as toast messages instead of actual emails.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

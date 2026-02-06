import { useState, useEffect } from "react";
import { CreditCard, TestTube, AlertCircle, CheckCircle, Zap, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefundLogsSection, addRefundLog } from "./RefundLogsSection";
import { isProductionDomain } from "@/lib/devConfig";

export const StripeSettingsSection = () => {
  const [isLiveMode, setIsLiveMode] = useState(() => {
    // On production, ALWAYS live mode
    if (isProductionDomain()) return true;
    // Otherwise, check toggle (inverse of dry_run)
    return localStorage.getItem("stripe_dry_run") !== "true";
  });
  const [isConnected, setIsConnected] = useState(true); // Assuming connected via secrets
  const isProduction = isProductionDomain();

  const handleLiveModeToggle = (enabled: boolean) => {
    // Block toggling on production - always live
    if (isProduction) {
      toast.error("Live mode cannot be disabled on production");
      return;
    }
    
    setIsLiveMode(enabled);
    // Store as inverse (dry_run = !live)
    localStorage.setItem("stripe_dry_run", (!enabled).toString());
    
    if (enabled) {
      toast.success("Live Mode ENABLED", {
        description: "Real charges will occur. Test cards will be REJECTED.",
        duration: 5000,
      });
    } else {
      toast.info("Test Mode ENABLED", {
        description: "No real charges. Test cards (4242...) accepted.",
        duration: 5000,
      });
    }
  };

  const handleTestRefund = async () => {
    // Simulate a test refund
    const testLog = await addRefundLog({
      booking_id: `TEST-${Date.now().toString(36).toUpperCase()}`,
      booking_code: `TEST-${Date.now().toString(36).toUpperCase()}`,
      client_name: "Test Client",
      client_email: "test@example.com",
      amount: 35.00,
      reason: "Test refund (test mode)",
      status: "test-mode",
      stripe_refund_id: `test-${Date.now()}`,
      processed_at: new Date().toISOString(),
      processed_by: "Admin",
      is_dry_run: true,
    });
    if (testLog) {
      toast.success(`Test refund logged: ${testLog.id}`);
    } else {
      toast.error("Failed to log test refund");
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Stripe Integration
          </CardTitle>
          <CardDescription>
            Manage payment processing and refunds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {isConnected ? "Stripe Connected" : "Stripe Not Connected"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isConnected 
                    ? "Secret key configured in environment" 
                    : "Add STRIPE_SECRET_KEY to connect"}
                </p>
              </div>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-600" : ""}>
              {isConnected ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Live/Test Mode Toggle */}
          <Card className={`border-2 ${isLiveMode ? "border-green-400 bg-green-50/50 dark:bg-green-950/20" : "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20"}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isLiveMode ? (
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <TestTube className="w-5 h-5 text-purple-600" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">Payment Mode</p>
                      {isLiveMode ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          LIVE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                          TEST
                        </Badge>
                      )}
                      {isProduction && (
                        <Badge variant="secondary" className="text-xs">
                          Locked
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isLiveMode 
                        ? "Real charges occur. Test cards (4242...) will be REJECTED." 
                        : "Test mode - no real charges. Test cards accepted."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isLiveMode}
                  onCheckedChange={handleLiveModeToggle}
                  disabled={isProduction}
                />
              </div>

              {!isLiveMode && !isProduction && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleTestRefund}>
                    <TestTube className="w-4 h-4 mr-2" />
                    Test Refund
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Mode Warning */}
          {isLiveMode && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Zap className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Live Mode Active</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    All payment operations will affect real customer accounts.
                    Test card numbers (like 4242 4242 4242 4242) will be rejected.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Test Mode Info */}
          {!isLiveMode && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="flex items-start gap-2">
                <TestTube className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-200">Test Mode Active</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    No real charges will occur. Use test card: <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">4242 4242 4242 4242</code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Logs */}
      <RefundLogsSection />
    </div>
  );
};

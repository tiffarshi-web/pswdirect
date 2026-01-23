import { useState } from "react";
import { CreditCard, TestTube, AlertCircle, CheckCircle, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefundLogsSection, addRefundLog } from "./RefundLogsSection";

export const StripeSettingsSection = () => {
  const [isDryRunMode, setIsDryRunMode] = useState(() => {
    return localStorage.getItem("stripe_dry_run") === "true";
  });
  const [isConnected, setIsConnected] = useState(true); // Assuming connected via secrets

  const handleDryRunToggle = (enabled: boolean) => {
    setIsDryRunMode(enabled);
    localStorage.setItem("stripe_dry_run", enabled.toString());
    toast.success(enabled ? "Dry Run mode enabled - no real charges" : "Live mode enabled - real charges will occur");
  };

  const handleTestRefund = async () => {
    // Simulate a test refund
    const testLog = await addRefundLog({
      booking_id: `TEST-${Date.now().toString(36).toUpperCase()}`,
      booking_code: `TEST-${Date.now().toString(36).toUpperCase()}`,
      client_name: "Test Client",
      client_email: "test@example.com",
      amount: 35.00,
      reason: "Test refund (dry run mode)",
      status: "dry-run",
      stripe_refund_id: `dry-run-${Date.now()}`,
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

          {/* Dry Run Mode Toggle */}
          <Card className={`border-2 ${isDryRunMode ? "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20" : "border-border"}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TestTube className={`w-5 h-5 ${isDryRunMode ? "text-purple-600" : "text-muted-foreground"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">Dry Run Mode</p>
                      {isDryRunMode && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                          ENABLED
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isDryRunMode 
                        ? "No real charges or refunds will occur. All transactions are simulated." 
                        : "Live mode - real money will be charged and refunded"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDryRunMode}
                  onCheckedChange={handleDryRunToggle}
                />
              </div>

              {isDryRunMode && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleTestRefund}>
                    <TestTube className="w-4 h-4 mr-2" />
                    Test Refund
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning for Live Mode */}
          {!isDryRunMode && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Live Mode Active</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    All payment operations will affect real customer accounts.
                    Double-check all refund amounts before processing.
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

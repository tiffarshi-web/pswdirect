import { useState, useEffect } from "react";
import { Clock, LogOut, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { getPSWProfile, isPSWApproved, initializePSWProfiles } from "@/lib/pswProfileStore";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import logo from "@/assets/logo.png";

const PSWPending = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isApproved, setIsApproved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Auto-check approval status every 5 seconds
  useEffect(() => {
    if (!user?.id) return;

    const checkApprovalStatus = () => {
      initializePSWProfiles();
      const approved = isPSWApproved(user.id);
      if (approved) {
        setIsApproved(true);
      }
      setLastChecked(new Date());
    };

    // Initial check
    checkApprovalStatus();

    // Set up polling interval
    const interval = setInterval(checkApprovalStatus, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Redirect if not authenticated
  if (!isAuthenticated || user?.role !== "psw") {
    return <Navigate to="/" replace />;
  }

  // If approved, redirect to main PSW dashboard
  if (isApproved) {
    return <Navigate to="/psw" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleManualRefresh = () => {
    if (!user?.id) return;
    setChecking(true);
    initializePSWProfiles();
    const approved = isPSWApproved(user.id);
    if (approved) {
      setIsApproved(true);
    }
    setLastChecked(new Date());
    setTimeout(() => setChecking(false), 500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSW Direct</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-12 max-w-md mx-auto">
        <Card className="shadow-card text-center">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Application Under Review
              </h1>
              <p className="text-muted-foreground">
                Hello, {user?.firstName}! Your application is being reviewed.
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg text-left">
              <p className="text-foreground font-medium mb-2">What happens next?</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Our admin team reviews your credentials
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  Background verification is completed
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  You receive access to the Job Board instantly
                </li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Current Status:</strong> Pending Admin Approval
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                This page auto-refreshes. Once approved, you'll be redirected automatically.
              </p>
            </div>

            {/* Manual Refresh Button */}
            <Button 
              variant="outline" 
              onClick={handleManualRefresh}
              disabled={checking}
              className="w-full"
            >
              {checking ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Check Status
            </Button>

            <p className="text-xs text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Need help? Contact us at{" "}
                <a href="mailto:support@pswdirect.ca" className="text-primary hover:underline">
                  support@pswdirect.ca
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Install App Banner */}
      <InstallAppBanner />
    </div>
  );
};

export default PSWPending;

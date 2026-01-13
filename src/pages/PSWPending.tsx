import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const PSWPending = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  if (!isAuthenticated || user?.role !== "psw") {
    return <Navigate to="/" replace />;
  }

  // Check if PSW is pending (in production, this would come from user data)
  // For demo, we'll show this page for pending PSWs
  const isPending = user?.status === "pending";
  
  // If not pending, redirect to main PSW dashboard
  if (!isPending && user?.status === "active") {
    return <Navigate to="/psw" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
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
                  You receive a welcome email with full access
                </li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Current Status:</strong> Pending Admin Approval
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                You will be notified via email once you are vetted and activated.
              </p>
            </div>

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
    </div>
  );
};

export default PSWPending;

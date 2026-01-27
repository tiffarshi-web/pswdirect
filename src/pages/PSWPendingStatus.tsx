import { useState } from "react";
import { Clock, LogOut, CheckCircle, FileText, Shield, MessageSquare, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { OFFICE_PHONE_NUMBER } from "@/lib/shiftStore";
import { getPSWProfileByEmailFromDB, updateVettingStatusInDB } from "@/lib/pswDatabaseStore";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const PSWPendingStatus = () => {
  const { user, isAuthenticated, logout, login } = useAuth();
  const navigate = useNavigate();
  const [isBypassing, setIsBypassing] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/psw-login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCallOffice = () => {
    window.location.href = `tel:${OFFICE_PHONE_NUMBER.replace(/[^\d]/g, "")}`;
  };

  // ============================================
  // DEV BYPASS - REMOVE BEFORE PRODUCTION
  // ============================================
  const handleDevBypass = async () => {
    if (!user?.email) {
      toast.error("No email found in auth context");
      return;
    }

    setIsBypassing(true);
    try {
      // Look up the PSW profile by email
      const profile = await getPSWProfileByEmailFromDB(user.email);
      
      if (!profile) {
        toast.error("PSW profile not found in database");
        setIsBypassing(false);
        return;
      }

      // Update vetting status to approved
      const updatedProfile = await updateVettingStatusInDB(profile.id, "approved", "Dev bypass for Progressier testing");
      
      if (!updatedProfile) {
        toast.error("Failed to update vetting status");
        setIsBypassing(false);
        return;
      }

      // Refresh auth context with approved status
      login("psw", user.email, {
        id: updatedProfile.id,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
      });

      toast.success("Bypass successful! Redirecting to dashboard...");
      
      // Navigate to PSW dashboard
      setTimeout(() => {
        navigate("/psw");
      }, 500);
    } catch (error) {
      console.error("Dev bypass error:", error);
      toast.error("Bypass failed - check console for details");
      setIsBypassing(false);
    }
  };
  // ============================================
  // END DEV BYPASS
  // ============================================

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSA Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSA Direct</span>
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
      <main className="px-4 py-8 max-w-md mx-auto space-y-6">
        {/* Status Card */}
        <Card className="shadow-card border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-10 h-10 text-primary animate-pulse" />
            </div>
            
            <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">
              Application Under Review
            </Badge>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Hi, {user?.firstName || "there"}! 👋
            </h1>
            
            <p className="text-muted-foreground">
              We have received your application and our team is reviewing your documents.
            </p>
          </CardContent>
        </Card>

        {/* What We're Reviewing */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">What we're reviewing:</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Police Check</p>
                  <p className="text-xs text-muted-foreground">Verifying your background check</p>
                </div>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">HSCPOA Registration</p>
                  <p className="text-xs text-muted-foreground">Confirming your HSCPOA number</p>
                </div>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Credentials Review</p>
                  <p className="text-xs text-muted-foreground">Verifying your qualifications</p>
                </div>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">What happens next?</h3>
            
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold shrink-0">1</span>
                <div>
                  <p className="font-medium text-foreground text-sm">Review Completed</p>
                  <p className="text-xs text-muted-foreground">Usually takes 1-2 business days</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-semibold shrink-0">2</span>
                <div>
                  <p className="font-medium text-foreground text-sm">Email Notification</p>
                  <p className="text-xs text-muted-foreground">You'll receive an email when approved</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-semibold shrink-0">3</span>
                <div>
                  <p className="font-medium text-foreground text-sm">Start Accepting Jobs</p>
                  <p className="text-xs text-muted-foreground">Browse and claim shifts in your area</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="shadow-card border-muted">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Have questions?</p>
              <p className="text-xs text-muted-foreground">Our team is here to help</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCallOffice}>
              Call Office
            </Button>
          </CardContent>
        </Card>

        {/* Friendly Message */}
        <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-sm text-primary font-medium">
            🎉 We're excited to have you join our team!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You will receive an email as soon as you are cleared to accept jobs.
          </p>
        </div>

        {/* ============================================ */}
        {/* DEV BYPASS SECTION - REMOVE BEFORE PRODUCTION */}
        {/* ============================================ */}
        <Card className="shadow-card border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bug className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Development Only
              </span>
            </div>
            <Button 
              onClick={handleDevBypass}
              disabled={isBypassing}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isBypassing ? "Bypassing..." : "Bypass Approval (Dev Only)"}
            </Button>
            <p className="text-xs text-amber-600 mt-2 text-center">
              Skip vetting for Progressier notification testing
            </p>
          </CardContent>
        </Card>
        {/* ============================================ */}
        {/* END DEV BYPASS SECTION */}
        {/* ============================================ */}
      </main>
    </div>
  );
};

export default PSWPendingStatus;
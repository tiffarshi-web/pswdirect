import { useState, useEffect } from "react";
import { Clock, LogOut, CheckCircle, FileText, Shield, MessageSquare, Bug, XCircle, RefreshCw, User, Phone, MapPin, Award, Globe, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { fetchOfficeNumber, DEFAULT_OFFICE_NUMBER } from "@/lib/messageTemplates";
import { getPSWProfileByEmailFromDB, updateVettingStatusInDB } from "@/lib/pswDatabaseStore";
import type { PSWProfile } from "@/lib/pswDatabaseStore";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

const PSWPendingStatus = () => {
  const { user, isAuthenticated, logout, login } = useAuth();
  const navigate = useNavigate();
  const [isBypassing, setIsBypassing] = useState(false);
  const [officeNumber, setOfficeNumber] = useState(DEFAULT_OFFICE_NUMBER);
  const [profile, setProfile] = useState<PSWProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Fetch office number and profile from database
  useEffect(() => {
    fetchOfficeNumber().then(setOfficeNumber);
    
    if (user?.email) {
      // Fetch profile directly with extended fields
      supabase
        .from("psw_profiles")
        .select("*")
        .eq("email", user.email.toLowerCase())
        .single()
        .then(({ data }) => {
          if (data) {
            const mapped: any = {
              id: data.id,
              firstName: data.first_name,
              lastName: data.last_name,
              email: data.email,
              phone: data.phone || "",
              homePostalCode: data.home_postal_code,
              homeCity: data.home_city,
              hscpoaNumber: data.hscpoa_number,
              policeCheckName: data.police_check_name,
              languages: data.languages || ["en"],
              vettingStatus: data.vetting_status,
              vettingNotes: data.vetting_notes,
              rejectionReasons: data.rejection_reasons,
              rejectionNotes: data.rejection_notes,
              applicationVersion: data.application_version || 1,
            };
            setProfile(mapped);
          }
          setIsLoadingProfile(false);
        });
    } else {
      setIsLoadingProfile(false);
    }
  }, [user?.email]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/psw-login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCallOffice = () => {
    window.location.href = `tel:${officeNumber.replace(/[^\d]/g, "")}`;
  };

  const handleResubmit = async () => {
    if (!profile) return;
    setIsResubmitting(true);
    try {
      // Update vetting status back to pending, increment version
      const currentVersion = (profile as any).applicationVersion || 1;
      const { error } = await supabase
        .from("psw_profiles")
        .update({
          vetting_status: "pending",
          vetting_notes: "Re-submitted by applicant after rejection",
          resubmitted_at: new Date().toISOString(),
          application_version: currentVersion + 1,
          last_status_change_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (!error) {
        setProfile({ ...profile, vettingStatus: "pending" });
        toast.success("Application resubmitted!", {
          description: "Your application is now back under review.",
        });
      } else {
        toast.error("Failed to resubmit application");
      }
    } catch (error) {
      console.error("Resubmit error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsResubmitting(false);
    }
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
      const fetchedProfile = profile || await getPSWProfileByEmailFromDB(user.email);
      
      if (!fetchedProfile) {
        toast.error("PSW profile not found in database");
        setIsBypassing(false);
        return;
      }

      const updatedProfile = await updateVettingStatusInDB(fetchedProfile.id, "approved", "Dev bypass for Progressier testing");
      
      if (!updatedProfile) {
        toast.error("Failed to update vetting status");
        setIsBypassing(false);
        return;
      }

      login("psw", user.email, {
        id: updatedProfile.id,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
      });

      toast.success("Bypass successful! Redirecting to dashboard...");
      
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

  const isRejected = profile?.vettingStatus === "rejected" || profile?.vettingStatus === "rejected_final";
  const isNeedsUpdate = profile?.vettingStatus === "rejected_needs_update";
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
        {/* Status Card - Rejected */}
        {isNeedsUpdate ? (
          <>
            <Card className="shadow-card border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-amber-600" />
                </div>
                
                <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">
                  Application Needs Updates
                </Badge>
                
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Hi, {user?.firstName || profile?.firstName || "there"}
                </h1>
                
                <p className="text-muted-foreground">
                  Your application needs some updates before we can proceed with approval.
                </p>
              </CardContent>
            </Card>

            {/* Show rejection reasons */}
            {(profile as any)?.rejectionReasons && (profile as any).rejectionReasons.length > 0 && (
              <Card className="shadow-card border-amber-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Items to update:
                  </h3>
                  <ul className="space-y-2">
                    {(profile as any).rejectionReasons.map((reason: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <XCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                  {(profile as any)?.rejectionNotes && (
                    <p className="mt-3 text-sm text-muted-foreground italic border-t pt-3">
                      Admin notes: {(profile as any).rejectionNotes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Link to edit application */}
            <Card className="shadow-card border-primary/20">
              <CardContent className="p-6 text-center space-y-4">
                <h3 className="font-semibold text-foreground">Update & Resubmit</h3>
                <p className="text-sm text-muted-foreground">
                  Please update the items listed above, then resubmit your application for review.
                </p>
                <Button 
                  onClick={handleResubmit}
                  disabled={isResubmitting}
                  className="w-full"
                >
                  {isResubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Resubmitting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resubmit Application
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

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
          </>
        ) : isRejected ? (
          <>
            <Card className="shadow-card border-destructive/20 bg-destructive/5">
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
                
                <Badge variant="destructive" className="mb-4">
                  Application Not Approved
                </Badge>
                
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Hi, {user?.firstName || profile?.firstName || "there"}
                </h1>
                
                <p className="text-muted-foreground">
                  Unfortunately, your previous application was not approved.
                  {profile?.vettingNotes && (
                    <span className="block mt-2 text-sm font-medium text-destructive">
                      Reason: {profile.vettingNotes}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Current Profile Info */}
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Your submitted information:</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile?.firstName} {profile?.lastName}</p>
                      <p className="text-xs text-muted-foreground">Name</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile?.phone || "Not provided"}</p>
                      <p className="text-xs text-muted-foreground">Phone</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile?.homeCity || "Not provided"}{profile?.homePostalCode ? `, ${profile.homePostalCode}` : ""}</p>
                      <p className="text-xs text-muted-foreground">Location</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Award className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile?.hscpoaNumber || "Not provided"}</p>
                      <p className="text-xs text-muted-foreground">HSCPOA Number</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile?.policeCheckName || "Not uploaded"}</p>
                      <p className="text-xs text-muted-foreground">Police Check</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile?.languages?.join(", ") || "English"}</p>
                      <p className="text-xs text-muted-foreground">Languages</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resubmit */}
            <Card className="shadow-card border-primary/20">
              <CardContent className="p-6 text-center space-y-4">
                <h3 className="font-semibold text-foreground">Want to try again?</h3>
                <p className="text-sm text-muted-foreground">
                  If you've updated your documents or believe there was an error, you can resubmit your application for review.
                </p>
                <Button 
                  onClick={handleResubmit}
                  disabled={isResubmitting}
                  className="w-full"
                >
                  {isResubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Resubmitting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resubmit Application
                    </>
                  )}
                </Button>
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
          </>
        ) : (
          <>
            {/* Pending Status Card */}
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
          </>
        )}

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

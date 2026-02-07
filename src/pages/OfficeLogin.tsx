// Admin Office Login - Hidden route at /office-login
// Only authorized admins can access the admin portal
// Also serves as the universal password recovery landing page with role-based routing

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Lock, AlertCircle, Eye, EyeOff, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

type LoginView = "login" | "forgot-password" | "reset-password";

// Master admin email - CEO always routes to /admin
const MASTER_ADMIN_EMAIL = "tiffarshi@gmail.com";

const OfficeLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<LoginView>("login");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [recoveryUserEmail, setRecoveryUserEmail] = useState<string | null>(null);

  // Check for password recovery hash on mount
  useEffect(() => {
    const checkRecoveryMode = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("type=recovery")) {
        setView("reset-password");
        // Clear hash from URL
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    checkRecoveryMode();

    // Listen for auth state changes (for password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset-password");
        if (session?.user?.email) {
          setRecoveryUserEmail(session.user.email);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const emailLower = email.toLowerCase().trim();

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password: password,
      });

      if (authError) {
        console.warn("🚨 FAILED LOGIN ATTEMPT:", {
          email: emailLower,
          timestamp: new Date().toISOString(),
          error: authError.message,
        });
        setError("Invalid credentials.");
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Authentication failed.");
        setIsLoading(false);
        return;
      }

      // TEMPORARY BYPASS: Allow master admin email direct access during maintenance
      const MASTER_ADMIN_EMAIL = "tiffarshi@gmail.com";
      const isMasterAdmin = emailLower === MASTER_ADMIN_EMAIL.toLowerCase();

      if (!isMasterAdmin) {
        // Check if user has admin role in database
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authData.user.id)
          .eq("role", "admin")
          .single();

        if (roleError || !roleData) {
          // Sign out the user - they don't have admin access
          await supabase.auth.signOut();
          
          console.warn("🚨 UNAUTHORIZED ADMIN ACCESS ATTEMPT:", {
            email: emailLower,
            userId: authData.user.id,
            timestamp: new Date().toISOString(),
          });
          
          setError("Access denied. You do not have admin privileges.");
          setIsLoading(false);
          return;
        }
      } else {
        console.log("✅ MASTER ADMIN BYPASS ACTIVE:", {
          email: emailLower,
          userId: authData.user.id,
          timestamp: new Date().toISOString(),
        });
      }

      // Log successful admin login
      console.log("✅ ADMIN LOGIN:", {
        email: emailLower,
        userId: authData.user.id,
        timestamp: new Date().toISOString(),
      });

      // Login to app context
      login("admin", emailLower);
      toast.success("Welcome to the Admin Portal");
      navigate("/admin");
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const emailLower = email.toLowerCase().trim();
      
      if (!emailLower) {
        setError("Please enter your email address.");
        setIsLoading(false);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailLower, {
        redirectTo: `${window.location.origin}/office-login`,
      });

      if (resetError) {
        console.error("Password reset error:", resetError);
        setError("Failed to send reset email. Please try again.");
        setIsLoading(false);
        return;
      }

      setResetEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle password reset with automatic role-based routing
   * 
   * RULES:
   * 1. CEO Rule: tiffarshi@gmail.com → /admin
   * 2. Admin role in user_roles → /admin
   * 3. PSW profile → /psw (or /psw-pending if pending)
   * 4. Client profile → /client
   * 5. Safety Net: No role → / with message
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        setError("Failed to update password. Please try again.");
        setIsLoading(false);
        return;
      }

      // Get current session to determine role-based redirect
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // No session - fallback to login view
        toast.success("Password updated! Please log in to your portal.");
        setView("login");
        setNewPassword("");
        setConfirmPassword("");
        return;
      }

      const userEmail = session.user.email?.toLowerCase() || recoveryUserEmail?.toLowerCase() || "";
      const userId = session.user.id;

      // ═══════════════════════════════════════════════════════════════════
      // RULE 1: CEO RULE - Master admin always goes to /admin
      // ═══════════════════════════════════════════════════════════════════
      if (userEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
        console.log("[Recovery] CEO rule applied - redirecting to /admin");
        login("admin", userEmail);
        toast.success("Password updated! Welcome back, Admin.");
        navigate("/admin", { replace: true });
        return;
      }

      // ═══════════════════════════════════════════════════════════════════
      // RULE 2: Check user_roles table for admin role
      // ═══════════════════════════════════════════════════════════════════
      const { data: adminRole, error: adminError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminError && adminRole) {
        console.log("[Recovery] Admin role found - redirecting to /admin");
        login("admin", userEmail);
        toast.success("Password updated! Welcome back, Admin.");
        navigate("/admin", { replace: true });
        return;
      }

      // ═══════════════════════════════════════════════════════════════════
      // RULE 3: Check for PSW profile
      // ═══════════════════════════════════════════════════════════════════
      const { data: pswProfile, error: pswError } = await supabase
        .from("psw_profiles")
        .select("id, first_name, last_name, vetting_status")
        .eq("email", userEmail)
        .maybeSingle();

      if (!pswError && pswProfile) {
        // Set auth context with PSW profile data
        login("psw", userEmail, {
          id: pswProfile.id,
          firstName: pswProfile.first_name,
          lastName: pswProfile.last_name,
        });

        if (pswProfile.vetting_status === "approved") {
          console.log("[Recovery] PSW profile (approved) - redirecting to /psw");
          toast.success(`Password updated! Welcome back, ${pswProfile.first_name}.`);
          navigate("/psw", { replace: true });
        } else if (pswProfile.vetting_status === "pending") {
          console.log("[Recovery] PSW profile (pending) - redirecting to /psw-pending");
          toast.success("Password updated! Your application is under review.");
          navigate("/psw-pending", { replace: true });
        } else {
          // Flagged or restricted - sign out and show message
          console.log("[Recovery] PSW profile (restricted) - signing out");
          await supabase.auth.signOut();
          toast.error("Your account has been restricted. Please contact support.");
          setView("login");
        }
        return;
      }

      // ═══════════════════════════════════════════════════════════════════
      // RULE 4: Check for Client profile
      // ═══════════════════════════════════════════════════════════════════
      const { data: clientProfile, error: clientError } = await supabase
        .from("client_profiles")
        .select("id, first_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (!clientError && clientProfile) {
        console.log("[Recovery] Client profile found - redirecting to /client");
        login("client", userEmail);
        toast.success(`Password updated! Welcome back${clientProfile.first_name ? `, ${clientProfile.first_name}` : ""}.`);
        navigate("/client", { replace: true });
        return;
      }

      // ═══════════════════════════════════════════════════════════════════
      // RULE 5: SAFETY NET - No role found
      // ═══════════════════════════════════════════════════════════════════
      console.log("[Recovery] No role found - redirecting to homepage");
      await supabase.auth.signOut();
      toast.info("Password updated! Please log in to your respective portal.", {
        duration: 5000,
      });
      navigate("/", { replace: true });

    } catch (err) {
      console.error("Reset password error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // Render forgot password view
  if (view === "forgot-password") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-12 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-foreground">PSW DIRECT</h1>
                <p className="text-xs text-muted-foreground">Office Portal</p>
              </div>
            </div>
          </div>

          <Card className="shadow-card">
            <CardHeader className="text-center pb-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Reset Password</CardTitle>
              <CardDescription>
                Enter your email to receive a password reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="text-muted-foreground">
                    Check your email for a password reset link.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setView("login");
                      setResetEmailSent(false);
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@pswdirect.ca"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="brand"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setView("login")}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render reset password view (after clicking email link)
  if (view === "reset-password") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-12 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-foreground">PSW DIRECT</h1>
                <p className="text-xs text-muted-foreground">Office Portal</p>
              </div>
            </div>
          </div>

          <Card className="shadow-card">
            <CardHeader className="text-center pb-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Set New Password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  variant="brand"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render login view
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="PSW Direct Logo" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-foreground">PSW DIRECT</h1>
              <p className="text-xs text-muted-foreground">Office Portal</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-card">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Admin Access</CardTitle>
            <CardDescription>
              This portal is restricted to authorized personnel only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pswdirect.ca"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="brand"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Secure Login
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView("forgot-password")}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            </form>

            {/* Security Notice */}
            <div className="mt-6 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                All access attempts are logged and monitored. 
                Unauthorized access is prohibited and may be prosecuted.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to main site */}
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            ← Return to main site
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OfficeLogin;

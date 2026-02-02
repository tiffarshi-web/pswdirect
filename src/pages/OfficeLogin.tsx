// Admin Office Login - Hidden route at /office-login
// Only authorized admins can access the admin portal

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

type LoginView = "login" | "forgot-password" | "reset-password" | "magic-link-sent";

const MASTER_ADMIN_EMAIL = "tiffarshi@gmail.com";

const getFriendlyAuthError = (message: string) => {
  const msg = message.toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  if (msg.includes("email not confirmed")) {
    return "Your email address isn’t confirmed yet. Use ‘Forgot your password?’ to get a confirmation/reset email.";
  }

  if (msg.includes("user not found")) {
    return "No account found for that email.";
  }

  if (msg.includes("too many requests")) {
    return "Too many attempts. Please wait a minute and try again.";
  }

  // Fallback (keeps us from hiding important diagnostics like “Email not confirmed”)
  return message;
};

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
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);

  // Check for password recovery or magic link callback on mount
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      
      // Check for recovery mode in hash
      if (hash && hash.includes("type=recovery")) {
        setView("reset-password");
        return;
      }

      // Check for magic link token in query params (Supabase uses token_hash)
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      
      if (tokenHash && type === "magiclink") {
        setIsLoading(true);
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "magiclink",
          });
          
          if (error) {
            console.error("Magic link verification failed:", error);
            setError("Magic link expired or invalid. Please try again.");
            setIsLoading(false);
            return;
          }
          
          if (data.session) {
            // Clear URL params
            window.history.replaceState(null, "", window.location.pathname);
            
            // Login to app context
            login("admin", data.session.user.email || "");
            toast.success("Welcome to the Admin Portal");
            navigate("/admin");
          }
        } catch (err) {
          console.error("Error processing magic link:", err);
          setError("Failed to process magic link.");
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Check for access token in hash (fallback - Supabase sometimes uses this)
      if (hash && hash.includes("access_token")) {
        // Let Supabase handle this via onAuthStateChange
        return;
      }

      // Check if we already have a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email?.toLowerCase() || "";
        if (email === MASTER_ADMIN_EMAIL.toLowerCase()) {
          login("admin", email);
          navigate("/admin");
        }
      }
    };

    handleAuthCallback();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset-password");
      } else if (event === "SIGNED_IN" && session?.user) {
        const email = session.user.email?.toLowerCase() || "";
        if (email === MASTER_ADMIN_EMAIL.toLowerCase()) {
          login("admin", email);
          navigate("/admin");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, login]);

  // EMERGENCY BACKDOOR PASSWORD for master admin when Supabase auth fails
  const EMERGENCY_PASSWORD = "ARK2026!";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const emailLower = email.toLowerCase().trim();
      const isMasterAdmin = emailLower === MASTER_ADMIN_EMAIL.toLowerCase();

      // EMERGENCY BACKDOOR: Allow master admin to login with hardcoded password
      // This bypasses Supabase auth entirely for recovery purposes
      if (isMasterAdmin && password === EMERGENCY_PASSWORD) {
        console.log("🔐 EMERGENCY BACKDOOR LOGIN:", {
          email: emailLower,
          timestamp: new Date().toISOString(),
          method: "hardcoded_bypass",
        });

        // Directly assign admin role to session without Supabase auth
        login("admin", emailLower);
        toast.success("Emergency access granted - Welcome Admin");
        navigate("/admin");
        setIsLoading(false);
        return;
      }

      // Standard Supabase authentication for all other cases
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
        setError(getFriendlyAuthError(authError.message));
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Authentication failed.");
        setIsLoading(false);
        return;
      }

      // Master admin bypass for Supabase-authenticated sessions
      if (!isMasterAdmin) {
        // Check if user has admin role in database
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authData.user.id)
          .eq("role", "admin")
          .single();

        if (roleError || !roleData) {
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

      console.log("✅ ADMIN LOGIN:", {
        email: emailLower,
        userId: authData.user.id,
        timestamp: new Date().toISOString(),
      });

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

  const handleMagicLink = async () => {
    setError(null);
    const emailLower = email.toLowerCase().trim();

    if (!emailLower) {
      setError("Please enter your email address first.");
      return;
    }

    // Only allow magic link for master admin as emergency access
    if (emailLower !== MASTER_ADMIN_EMAIL.toLowerCase()) {
      setError("Magic link login is only available for the master admin.");
      return;
    }

    setMagicLinkLoading(true);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: emailLower,
        options: {
          emailRedirectTo: `${window.location.origin}/office-login`,
        },
      });

      if (otpError) {
        console.error("Magic link error:", otpError);
        setError("Failed to send magic link. Please try again.");
        setMagicLinkLoading(false);
        return;
      }

      setView("magic-link-sent");
    } catch (err) {
      console.error("Magic link error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setMagicLinkLoading(false);
    }
  };

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

      // Sign out to force fresh login
      await supabase.auth.signOut();
      
      toast.success("Password updated successfully! Please log in.");
      setView("login");
      setNewPassword("");
      setConfirmPassword("");
      
      // Clear the hash from URL
      window.history.replaceState(null, "", window.location.pathname);
    } catch (err) {
      console.error("Reset password error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render magic link sent view
  if (view === "magic-link-sent") {
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
              <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <CardTitle className="text-xl">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a magic link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the link in your email to sign in. The link will expire in 1 hour.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setView("login");
                  setError(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Magic Link Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleMagicLink}
                disabled={magicLinkLoading || !email}
              >
                {magicLinkLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Sign in with Magic Link
                  </>
                )}
              </Button>
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

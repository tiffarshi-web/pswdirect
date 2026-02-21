import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Loader2, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { getPSWProfileByEmailFromDB } from "@/lib/pswDatabaseStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PSWLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // Password recovery mode states
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Check for password recovery redirect
  useEffect(() => {
    const checkRecoverySession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      if (type === 'recovery' && accessToken) {
        // User clicked password reset link - show password update form
        setIsRecoveryMode(true);
        
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    };
    
    checkRecoverySession();
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("Please enter your password (at least 6 characters)");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("PSW password login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password", {
            description: "Please check your credentials or reset your password.",
          });
        } else {
          toast.error("Login failed", {
            description: error.message,
          });
        }
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Check if user has a PSW profile
        const pswProfile = await getPSWProfileByEmailFromDB(email);
        
        if (!pswProfile) {
          toast.error("No PSW profile found", {
            description: "This account is not registered as a PSW.",
          });
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        // ══════════════════════════════════════════════════════════════════
        // BLOCKADE: Check for flagged or deactivated accounts
        // ══════════════════════════════════════════════════════════════════
        if (pswProfile.vettingStatus === "flagged" || pswProfile.vettingStatus === "deactivated") {
          toast.error("Account restricted", {
            description: "Your account has been restricted. Please contact support for assistance.",
            duration: 6000,
          });
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        // Set auth context with PSW profile data
        login("psw", email, {
          id: pswProfile.id,
          firstName: pswProfile.firstName,
          lastName: pswProfile.lastName,
        });

        // Navigate based on vetting status
        if (pswProfile.vettingStatus === "approved") {
          toast.success(`Welcome back, ${pswProfile.firstName}!`);
          navigate("/psw", { replace: true });
        } else if (pswProfile.vettingStatus === "pending") {
          toast.info("Your application is under review");
          navigate("/psw-pending", { replace: true });
        } else {
          toast.error("Your application was not approved", {
            description: "Please contact support for more information.",
          });
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      console.error("PSW password login exception:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter your email address first");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { email, redirectTo: `${window.location.origin}/psw-login` },
      });

      if (error) {
        console.error("Password reset error:", error);
        toast.error("Failed to send reset email", {
          description: "Please try again later.",
        });
      } else {
        setResetEmailSent(true);
        toast.success("Password reset email sent", {
          description: "Check your inbox for the reset link.",
        });
      }
    } catch (error: any) {
      console.error("Password reset exception:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password update after recovery
  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        toast.error("Failed to update password", { description: error.message });
      } else {
        toast.success("Password updated successfully!", {
          description: "You can now log in with your new password."
        });
        setIsRecoveryMode(false);
        setNewPassword("");
        setConfirmPassword("");
        // Sign out to force fresh login with new password
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Recovery mode UI - Set new password after clicking reset link
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="PSA Direct Logo" className="h-10 w-auto" />
              <span className="font-semibold text-foreground">PSA Direct</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Set New Password</h2>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>
          
          <Card className="shadow-card">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              <Button
                variant="brand"
                className="w-full h-12"
                onClick={handlePasswordUpdate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
            <Button variant="ghost" size="icon" onClick={() => setShowForgotPassword(false)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="PSA Direct Logo" className="h-10 w-auto" />
              <span className="font-semibold text-foreground">PSA Direct</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
          <Card className="shadow-card">
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">Reset Password</h2>
                <p className="text-muted-foreground">
                  {resetEmailSent 
                    ? "Check your email for the reset link"
                    : "Enter your email to receive a password reset link"
                  }
                </p>
              </div>

              {!resetEmailSent ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="reset-email" className="block text-sm font-medium text-foreground">
                      Email Address
                    </label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <Button
                    variant="brand"
                    className="w-full h-12"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </>
              ) : (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>.
                    Please check your inbox and spam folder.
                  </p>
                </div>
              )}

              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                }}
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="PSA Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSA Direct</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            PSA Portal Login
          </h2>
          <p className="text-muted-foreground">
            Sign in with your email and password
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-primary p-0 h-auto"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </Button>
              </div>

              <Button 
                type="submit"
                variant="brand" 
                className="w-full h-12"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Apply Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Not a registered PSA yet?
          </p>
          <Button 
            variant="link" 
            className="text-primary"
            onClick={() => navigate("/join-team")}
          >
            Apply to join our team →
          </Button>
        </div>
      </main>
    </div>
  );
};

export default PSWLogin;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check if there's a valid session for password recovery
    const checkSession = async () => {
      try {
        // First, check if we have hash params (recovery token in URL)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");
        
        console.log("Reset password page - checking session, type:", type, "has token:", !!accessToken);

        // If we have a recovery token in the URL, Supabase should handle it automatically
        // Wait a moment for the auth state to be established
        if (accessToken && type === "recovery") {
          console.log("Recovery token found in URL, waiting for session...");
          // Give Supabase time to process the token
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log("Session check result:", { hasSession: !!session, error });
        
        if (session) {
          setIsValidSession(true);
          // Clean up the URL hash after successful session
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        } else {
          console.log("No valid session found for password reset");
          toast.error("Invalid or expired reset link. Please request a new one.");
          navigate("/client-login");
        }
      } catch (error) {
        console.error("Session check error:", error);
        toast.error("Something went wrong. Please try again.");
        navigate("/client-login");
      } finally {
        setIsCheckingSession(false);
      }
    };

    // Small delay to allow auth state listener to process first
    const timer = setTimeout(checkSession, 200);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully!");
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/client-login");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error("Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isValidSession) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
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

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

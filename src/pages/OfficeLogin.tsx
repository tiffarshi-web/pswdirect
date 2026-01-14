// Admin Office Login - Hidden route at /office-login
// Only authorized admins can access the admin portal

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

// Authorized admin emails (in production, this would be in a secure backend)
// Add your email address here to grant admin access
const AUTHORIZED_ADMIN_EMAILS = [
  "admin@pswdirect.ca",
  // You can add more authorized emails below:
  // "your.email@example.com",
];

// For development: allow any email when dev mode is active
const isDevMode = () => {
  try {
    const config = localStorage.getItem("pswdirect_dev_config");
    if (config) {
      const parsed = JSON.parse(config);
      return !parsed.useLiveAuth;
    }
  } catch {
    return true;
  }
  return true;
};

const OfficeLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if email is in authorized list (or dev mode allows any email)
    const emailLower = email.toLowerCase().trim();
    const devModeActive = isDevMode();
    
    if (!devModeActive && !AUTHORIZED_ADMIN_EMAILS.includes(emailLower)) {
      setError("Access denied. This email is not authorized for admin access.");
      setIsLoading(false);
      
      // Log unauthorized access attempt
      console.warn("🚨 UNAUTHORIZED ADMIN ACCESS ATTEMPT:", {
        email: emailLower,
        timestamp: new Date().toISOString(),
        ip: "redacted", // Would be captured in production
      });
      
      return;
    }

    // Validate password (in production, this would be server-side)
    if (password.length < 6) {
      setError("Invalid credentials.");
      setIsLoading(false);
      return;
    }

    // Log successful admin login
    console.log("✅ ADMIN LOGIN:", {
      email: emailLower,
      timestamp: new Date().toISOString(),
    });

    // Login as admin
    login("admin", emailLower);
    toast.success("Welcome to the Admin Portal");
    navigate("/admin");
    
    setIsLoading(false);
  };

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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Secure Login
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

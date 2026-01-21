import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, CheckCircle2, Smartphone, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const ClientLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "magic-link">("password");

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
        console.error("Password login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password", {
            description: "Please check your credentials or use a magic link to sign in.",
          });
        } else {
          toast.error("Login failed", {
            description: error.message,
          });
        }
      } else if (data.session) {
        toast.success("Welcome back!");
        navigate("/client", { replace: true });
      }
    } catch (error: any) {
      console.error("Password login exception:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/client`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error("Magic link error:", error);
        toast.error("Failed to send magic link", {
          description: error.message,
        });
      } else {
        setEmailSent(true);
        toast.success("Magic link sent!", {
          description: "Check your email to sign in",
        });
      }
    } catch (error: any) {
      console.error("Magic link exception:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
              <span className="font-semibold text-foreground">PSW Direct</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md shadow-card">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Check Your Email</h2>
                <p className="text-muted-foreground">
                  We sent a magic link to <strong className="text-foreground">{email}</strong>
                </p>
              </div>

              <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground space-y-2">
                <p>Click the link in the email to sign in instantly.</p>
                <p className="text-xs">The link expires in 1 hour.</p>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Try a different email
                </Button>
                <Link to="/">
                  <Button variant="ghost" className="w-full gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                  </Button>
                </Link>
              </div>
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
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSW Direct</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Client Portal</CardTitle>
            <CardDescription>
              Sign in to track your care, view history, and rebook instantly
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "password" | "magic-link")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password" className="gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </TabsTrigger>
                <TabsTrigger value="magic-link" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Magic Link
                </TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="space-y-4 mt-4">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-password">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email-password"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>

                <div className="bg-muted/50 rounded-lg p-3 text-center text-sm text-muted-foreground">
                  <p>Use the password you created during your first booking.</p>
                </div>
              </TabsContent>

              <TabsContent value="magic-link" className="space-y-4 mt-4">
                <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-magic">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email-magic"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Magic Link
                      </>
                    )}
                  </Button>
                </form>

                <div className="bg-muted/50 rounded-lg p-3 text-center text-sm text-muted-foreground">
                  <p>We'll send you a secure link to sign in instantly. No password needed!</p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                New client?{" "}
                <Link to="/" className="text-primary font-medium hover:underline">
                  Book your first service
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer with PSW Login link */}
      <footer className="border-t border-border py-4 px-4">
        <div className="max-w-md mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            Are you a caregiver?{" "}
            <Link to="/psw-login" className="text-primary hover:underline">
              PSW Login
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientLogin;

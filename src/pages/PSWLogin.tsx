import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Phone, Loader2, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { getPSWProfiles, getPSWProfile, type PSWProfile } from "@/lib/pswProfileStore";
import { useAuth } from "@/contexts/AuthContext";

const PSWLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [matchedPSW, setMatchedPSW] = useState<PSWProfile | null>(null);
  const [statusJustApproved, setStatusJustApproved] = useState(false);

  // Auto-refresh to check for approval status updates every 3 seconds
  useEffect(() => {
    if (!linkSent || !matchedPSW) return;

    const checkInterval = setInterval(() => {
      const latestProfile = getPSWProfile(matchedPSW.id);
      if (latestProfile && latestProfile.vettingStatus !== matchedPSW.vettingStatus) {
        setMatchedPSW(latestProfile);
        if (latestProfile.vettingStatus === "approved") {
          setStatusJustApproved(true);
        }
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [linkSent, matchedPSW]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const findPSWByContact = (contact: string, method: "email" | "phone"): PSWProfile | null => {
    const profiles = getPSWProfiles();
    
    if (method === "email") {
      return profiles.find(p => p.email.toLowerCase() === contact.toLowerCase()) || null;
    } else {
      // Normalize phone number for comparison
      const normalizedInput = contact.replace(/\D/g, "");
      return profiles.find(p => {
        const normalizedProfile = p.phone.replace(/\D/g, "");
        return normalizedProfile === normalizedInput || 
               normalizedProfile.endsWith(normalizedInput) ||
               normalizedInput.endsWith(normalizedProfile);
      }) || null;
    }
  };

  const handleSendMagicLink = async () => {
    const contact = loginMethod === "email" ? email : phone;
    
    if (!contact.trim()) {
      toast.error(`Please enter your ${loginMethod === "email" ? "email address" : "phone number"}`);
      return;
    }

    setIsSending(true);

    // Simulate checking if PSW exists
    const psw = findPSWByContact(contact, loginMethod);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!psw) {
      toast.error("No PSW account found", {
        description: "This contact is not registered. Please apply to join our team.",
      });
      setIsSending(false);
      return;
    }

    setMatchedPSW(psw);

    // Simulate sending magic link
    console.log("📧 MAGIC LINK SENT:", {
      method: loginMethod,
      to: contact,
      pswId: psw.id,
      pswName: `${psw.firstName} ${psw.lastName}`,
      timestamp: new Date().toISOString(),
      expiresIn: "15 minutes",
      sessionDuration: "30 days",
    });

    setLinkSent(true);
    setIsSending(false);

    toast.success(`Magic link sent to ${loginMethod === "email" ? email : phone}`, {
      description: "Check your messages and click the link to sign in.",
    });
  };

  const handleDemoLogin = () => {
    if (matchedPSW) {
      // Re-fetch the latest profile from localStorage to get current vetting status
      const latestProfile = getPSWProfile(matchedPSW.id);
      const profileToUse = latestProfile || matchedPSW;
      
      // Set auth context with actual PSW profile data (not mock)
      login("psw", profileToUse.email, {
        id: profileToUse.id,
        firstName: profileToUse.firstName,
        lastName: profileToUse.lastName,
      });
      
      // Navigate based on CURRENT vetting status
      if (profileToUse.vettingStatus === "approved") {
        toast.success(`Welcome back, ${profileToUse.firstName}!`);
        navigate("/psw");
      } else if (profileToUse.vettingStatus === "pending") {
        toast.info("Your application is under review");
        navigate("/psw-pending");
      } else {
        toast.error("Your application was not approved", {
          description: "Please contact support for more information.",
        });
      }
    }
  };

  if (linkSent && matchedPSW) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
            <Button variant="ghost" size="icon" onClick={() => setLinkSent(false)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
              <span className="font-semibold text-foreground">PSW Direct</span>
            </Link>
          </div>
        </header>

        {/* Success State */}
        <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Check Your {loginMethod === "email" ? "Email" : "Messages"}
              </h2>
              
              <p className="text-muted-foreground mb-6">
                We've sent a magic link to <strong>{loginMethod === "email" ? email : phone}</strong>.
                Click the link to sign in instantly.
              </p>

              <div className="p-4 bg-muted rounded-lg text-left mb-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Link expires in:</strong> 15 minutes<br />
                  <strong>Session lasts:</strong> 30 days
                </p>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Didn't receive it? Check your spam folder or try again.
              </p>

              <div className="space-y-3">
                <Button variant="outline" className="w-full" onClick={() => setLinkSent(false)}>
                  Try Again
                </Button>
                
                {/* Show approval notification */}
                {statusJustApproved && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Your application has been approved!
                    </p>
                  </div>
                )}
                
                {/* Demo mode - simulate clicking magic link */}
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Demo Mode: Simulate clicking the magic link
                  </p>
                  <Button variant="brand" className="w-full" onClick={handleDemoLogin}>
                    Continue as {matchedPSW.firstName}
                  </Button>
                </div>
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
        <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSW Direct</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            PSW Portal Login
          </h2>
          <p className="text-muted-foreground">
            Sign in with a magic link — no password needed
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "email" | "phone")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                  />
                </div>
              </TabsContent>

              <TabsContent value="phone" className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(416) 555-1234"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="h-12"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button 
              variant="brand" 
              className="w-full h-12 mt-6"
              onClick={handleSendMagicLink}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Magic Link...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Send Magic Link
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              We'll send you a secure link that logs you in for 30 days.
            </p>
          </CardContent>
        </Card>

        {/* Apply Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Not a registered PSW yet?
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
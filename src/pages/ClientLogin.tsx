import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, CheckCircle2, Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { isStaleBundleAuthError, recoverFromStaleBundle } from "@/lib/staleBundleRecovery";
import { buildClientRedirectUrl } from "@/lib/clientAuthRedirect";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;
const RATE_KEY = "psw_client_otp_sends";

/** Client-side abuse throttle (server-side Supabase limits still apply). */
function readSends(email: string): number[] {
  try {
    const all = JSON.parse(localStorage.getItem(RATE_KEY) || "{}");
    const cutoff = Date.now() - 60 * 60 * 1000;
    return (all[email] || []).filter((t: number) => t > cutoff);
  } catch {
    return [];
  }
}

function recordSend(email: string) {
  try {
    const all = JSON.parse(localStorage.getItem(RATE_KEY) || "{}");
    all[email] = [...readSends(email), Date.now()];
    localStorage.setItem(RATE_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

const GENERIC_SENT_MESSAGE =
  "If an account exists for this email, we've sent a secure sign-in link.";

const ClientLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [linkError, setLinkError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const requestedRedirect = searchParams.get("redirect");

  // Surface expired / invalid magic-link errors returned in the URL hash.
  useEffect(() => {
    const hash = window.location.hash?.replace(/^#/, "") || "";
    const params = new URLSearchParams(hash || window.location.search.replace(/^\?/, ""));
    const err = params.get("error_description") || params.get("error");
    if (err) {
      setLinkError(
        /expired|invalid/i.test(err)
          ? "That sign-in link has expired or was already used. Enter your email below and we'll send a fresh one."
          : decodeURIComponent(err.replace(/\+/g, " ")),
      );
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Already signed in? Go straight to the portal.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/client", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  const sendLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalized = email.trim().toLowerCase();

    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (cooldown > 0) return;
    if (readSends(normalized).length >= MAX_SENDS_PER_HOUR) {
      toast.error("Too many sign-in emails requested", {
        description: "Please wait an hour before trying again, or call our office for help.",
      });
      return;
    }

    setIsLoading(true);
    setLinkError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          emailRedirectTo: buildClientRedirectUrl(requestedRedirect),
          // Existing accounts keep the same user id; new emails create one account.
          shouldCreateUser: true,
        },
      });

      if (error && isStaleBundleAuthError(error)) {
        if (recoverFromStaleBundle(`client-login:${error.message}`)) return;
      }
      if (error) {
        // Never reveal whether the email exists — only surface true rate limits.
        console.error("Passwordless sign-in error:", error.message);
        if (/rate limit|too many/i.test(error.message)) {
          toast.error("Too many requests", {
            description: "Please wait a few minutes and try again.",
          });
          setIsLoading(false);
          return;
        }
      }

      recordSend(normalized);
      setEmail(normalized);
      setEmailSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(GENERIC_SENT_MESSAGE);
    } catch (err) {
      console.error("Passwordless sign-in exception:", err);
      // Still show the generic state so we never leak account existence.
      recordSend(normalized);
      setEmailSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (digits.length < 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: digits,
        type: "email",
      });
      if (error || !data.session) {
        toast.error("That code is invalid or has expired", {
          description: "Request a new sign-in email and try again.",
        });
        setIsLoading(false);
        return;
      }
      navigate("/client", { replace: true });
    } catch {
      toast.error("Something went wrong. Please request a new code.");
    } finally {
      setIsLoading(false);
    }
  };

  const Header = () => (
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
  );

  if (emailSent) {
    return (
      <div className="min-h-dvh bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md shadow-card">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
                  <p className="text-muted-foreground">{GENERIC_SENT_MESSAGE}</p>
                  <p className="text-sm text-muted-foreground">
                    Sent to <strong className="text-foreground">{email}</strong>
                  </p>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground space-y-1">
                <p>Tap the button in the email to sign in — no password needed.</p>
                <p className="text-xs">The link is single-use and expires in 1 hour.</p>
              </div>

              <form onSubmit={verifyCode} className="space-y-3">
                <Label htmlFor="otp-code">Or enter the 6-digit code from the email</Label>
                <Input
                  id="otp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="h-12 text-center text-xl tracking-[0.4em]"
                />
                <Button type="submit" className="w-full h-12" disabled={isLoading || code.length < 6}>
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Verify &amp; Sign In
                </Button>
              </form>

              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={cooldown > 0 || isLoading}
                  onClick={() => sendLink()}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend sign-in email"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setCode("");
                  }}
                >
                  Use a different email
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Client Portal</CardTitle>
            <CardDescription>
              Sign in with your email — no password to remember
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {linkError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {linkError}
              </div>
            )}

            <form onSubmit={sendLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12" disabled={isLoading || cooldown > 0}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    {cooldown > 0 ? `Try again in ${cooldown}s` : "Email me a secure login link"}
                  </>
                )}
              </Button>
            </form>

            <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <p>
                We'll email you a secure, single-use sign-in link. Your existing account and booking
                history stay exactly the same.
              </p>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link to="/" className="text-primary hover:underline">
                Book care
              </Link>{" "}
              and your account is created automatically.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientLogin;

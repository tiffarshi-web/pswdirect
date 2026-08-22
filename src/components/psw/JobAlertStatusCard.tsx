import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, CheckCircle2, AlertTriangle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotificationStatus } from "@/hooks/usePushNotificationStatus";
import { toast } from "@/hooks/use-toast";

interface Readiness {
  ready: boolean;
  reasons: string[] | null;
  vetting_status: string | null;
  vsc_status: string | null;
  police_check_date: string | null;
  has_home_coords: boolean;
}

const REASON_COPY: Record<string, { title: string; action: string }> = {
  police_check_expired: {
    title: "Your Police Check (VSC) has expired",
    action: "Upload a current Vulnerable Sector Check in the Documents tab. Job alerts resume once the office approves it.",
  },
  not_approved: {
    title: "Your account is not approved yet",
    action: "The office is reviewing your profile. You'll start receiving job alerts as soon as you're approved.",
  },
  no_home_coordinates: {
    title: "Your home address isn't on the map yet",
    action: "Add or re-save your home address in the Profile tab so we can match you to nearby jobs.",
  },
  test_account_isolated: {
    title: "This is a test account",
    action: "Test accounts only receive test jobs.",
  },
};

const lifecycleCopy = (reason: string) => ({
  title: `Your account is ${reason.replace("lifecycle_", "")}`,
  action: "Contact the office to restore your account and start receiving job alerts again.",
});

export const JobAlertStatusCard = () => {
  const push = usePushNotificationStatus();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("my_dispatch_readiness");
    if (!error && Array.isArray(data) && data.length > 0) {
      setReadiness(data[0] as unknown as Readiness);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sendTestPing = async () => {
    setPinging(true);
    try {
      const { data, error } = await supabase.functions.invoke("psw-test-ping");
      if (error) throw error;
      if (data?.ok) {
        toast({
          title: "Test alert sent",
          description: "Check your phone. If nothing appeared, notifications are blocked in your device settings.",
        });
      } else {
        toast({
          title: "Test alert could not be delivered",
          description: "Your device isn't registered for alerts yet. Tap Turn On Alerts, then try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Could not send test alert",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setPinging(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking your job alerts…
        </CardContent>
      </Card>
    );
  }

  const reasons = readiness?.reasons ?? [];
  const blocked = !readiness?.ready && reasons.length > 0;
  const pushOn = push.isEnabled;
  const allGood = !blocked && pushOn;

  return (
    <Card className={`mb-4 ${blocked ? "border-destructive/50" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {allGood ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          )}
          Job Alerts
          <Badge variant={allGood ? "secondary" : "destructive"} className="ml-auto">
            {allGood ? "Active" : blocked ? "Blocked" : "Needs setup"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {blocked && (
          <div className="space-y-3">
            {reasons.map((r) => {
              const copy = REASON_COPY[r] ?? (r.startsWith("lifecycle_") ? lifecycleCopy(r) : null);
              if (!copy) return null;
              return (
                <div key={r} className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-sm font-semibold text-foreground">{copy.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{copy.action}</p>
                </div>
              );
            })}
          </div>
        )}

        {!blocked && (
          <p className="text-sm text-muted-foreground">
            Your account is eligible for new job alerts.
          </p>
        )}

        <div className="flex items-center gap-2 text-sm">
          {pushOn ? (
            <>
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-foreground">Phone alerts are on</span>
            </>
          ) : (
            <>
              <BellOff className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Phone alerts are off</span>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {!pushOn && (
            <Button onClick={() => void push.requestPermission()} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Turn On Alerts
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void sendTestPing()}
            disabled={pinging}
          >
            {pinging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Me a Test Alert
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

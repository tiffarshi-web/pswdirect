import { useState, useEffect } from "react";
import { Clock, AlertTriangle, User, Calendar, DollarSign, CheckCircle2, CreditCard, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OvertimeCharge {
  id: string;
  booking_id: string;
  booking_code: string;
  client_email: string;
  client_name: string;
  psw_id: string;
  psw_name: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_sign_out: string;
  overtime_minutes: number;
  billable_minutes: number;
  hourly_rate: number;
  overtime_amount: number;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  stripe_payment_intent_id: string | null;
  status: string;
  failure_reason: string | null;
  admin_approved_by: string | null;
  approved_at: string | null;
  charged_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_admin: { label: "Pending Approval", color: "bg-amber-100 text-amber-800 border-amber-300" },
  charged: { label: "Charged", color: "bg-green-100 text-green-800 border-green-300" },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/30" },
  rejected: { label: "Rejected", color: "bg-muted text-muted-foreground border-border" },
};

export const OvertimeBillingSection = () => {
  const [charges, setCharges] = useState<OvertimeCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchCharges = async () => {
    const { data, error } = await supabase
      .from("overtime_charges" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCharges(data as unknown as OvertimeCharge[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharges();
    const interval = setInterval(fetchCharges, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (chargeId: string, action: "approve" | "reject") => {
    setProcessingIds(prev => new Set([...prev, chargeId]));
    try {
      const { data, error } = await supabase.functions.invoke("charge-overtime", {
        body: { overtimeChargeId: chargeId, action },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (action === "approve" && data?.status === "charged") {
        toast.success(`Overtime charged: $${data.overtimeAmount?.toFixed(2)}`);
      } else if (action === "approve" && data?.status === "failed") {
        toast.error("Charge failed", { description: data.message });
      } else if (action === "reject") {
        toast.success("Overtime charge rejected");
      }

      await fetchCharges();
    } catch (err: any) {
      toast.error("Action failed", { description: err.message });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(chargeId);
        return next;
      });
    }
  };

  const pendingCharges = charges.filter(c => c.status === "pending_admin");
  const processedCharges = charges.filter(c => c.status !== "pending_admin");
  const totalCharged = charges.filter(c => c.status === "charged").reduce((sum, c) => sum + c.overtime_amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCharges.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Overtime Charged</p>
                <p className="text-2xl font-bold text-green-600">${totalCharged.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{charges.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approval Queue */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Overtime Approval Queue
              </CardTitle>
              <CardDescription>
                Review and approve overtime charges. Off-session charges use saved payment methods.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCharges}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : pendingCharges.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">No pending overtime charges</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCharges.map((charge) => (
                <div key={charge.id} className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/10 dark:border-amber-800 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono font-bold text-foreground">{charge.booking_code}</p>
                      <p className="text-sm text-muted-foreground">{charge.client_name} • {charge.client_email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="bg-amber-500 text-white">+{charge.overtime_minutes} min</Badge>
                      <Badge variant="outline">${charge.overtime_amount.toFixed(2)}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Booked: {charge.scheduled_start} – {charge.scheduled_end}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Signed out: {new Date(charge.actual_sign_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CreditCard className="w-3 h-3" />
                      Billable: {charge.billable_minutes} min @ ${charge.hourly_rate}/hr
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="w-3 h-3" />
                      PSW: {charge.psw_name}
                    </div>
                  </div>

                  {!charge.stripe_payment_method_id && (
                    <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                      ⚠️ No saved payment method — charge will require manual payment link
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingIds.has(charge.id)}
                      onClick={() => handleAction(charge.id, "reject")}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={processingIds.has(charge.id)}
                      onClick={() => handleAction(charge.id, "approve")}
                    >
                      {processingIds.has(charge.id) ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      )}
                      Approve & Charge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Charges */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Processed Overtime Charges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processedCharges.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No processed charges yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Booking</th>
                    <th className="text-left py-2 px-3">Client</th>
                    <th className="text-left py-2 px-3">PSW</th>
                    <th className="text-right py-2 px-3">OT Min</th>
                    <th className="text-right py-2 px-3">Amount</th>
                    <th className="text-center py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {processedCharges.map((charge) => {
                    const cfg = statusConfig[charge.status] || { label: charge.status, color: "bg-muted text-muted-foreground" };
                    return (
                      <tr key={charge.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-mono text-xs">{charge.booking_code}</td>
                        <td className="py-2 px-3">{charge.client_name}</td>
                        <td className="py-2 px-3">{charge.psw_name}</td>
                        <td className="py-2 px-3 text-right">{charge.overtime_minutes}</td>
                        <td className="py-2 px-3 text-right font-medium">${charge.overtime_amount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {new Date(charge.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

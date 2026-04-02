import { useState, useEffect } from "react";
import { CreditCard, Eye, EyeOff, Save, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminBankingSectionProps {
  pswId: string;
  pswName: string;
}

interface BankingData {
  id?: string;
  account_holder_name: string;
  institution_number: string;
  transit_number: string;
  account_number: string;
  banking_note: string;
}

export const AdminBankingSection = ({ pswId, pswName }: AdminBankingSectionProps) => {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<BankingData>({
    account_holder_name: "",
    institution_number: "",
    transit_number: "",
    account_number: "",
    banking_note: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data: row } = await supabase
        .from("psw_banking")
        .select("*")
        .eq("psw_id", pswId)
        .maybeSingle();

      if (row) {
        setData({
          id: row.id,
          account_holder_name: (row as any).account_holder_name || "",
          institution_number: row.institution_number || "",
          transit_number: row.transit_number || "",
          account_number: row.account_number || "",
          banking_note: (row as any).banking_note || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [pswId]);

  const mask = (val: string) => {
    if (!val || val.length <= 3) return val ? "•".repeat(val.length) : "—";
    return "•".repeat(val.length - 3) + val.slice(-3);
  };

  const hasData = data.account_number && data.transit_number && data.institution_number;

  const handleSave = async () => {
    if (!data.institution_number || !data.transit_number || !data.account_number) {
      toast.error("Institution, transit, and account numbers are required");
      return;
    }
    setSaving(true);
    try {
      if (data.id) {
        const { error } = await supabase
          .from("psw_banking")
          .update({
            account_number: data.account_number,
            transit_number: data.transit_number,
            institution_number: data.institution_number,
            account_holder_name: data.account_holder_name,
            banking_note: data.banking_note,
          } as any)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { data: row, error } = await supabase
          .from("psw_banking")
          .insert({
            psw_id: pswId,
            account_number: data.account_number,
            transit_number: data.transit_number,
            institution_number: data.institution_number,
            account_holder_name: data.account_holder_name,
            banking_note: data.banking_note,
          } as any)
          .select()
          .single();
        if (error) throw error;
        setData((prev) => ({ ...prev, id: row.id }));
      }
      toast.success("Banking details saved");
      setEditing(false);
    } catch (err: any) {
      console.error("Save banking error:", err);
      toast.error("Failed to save banking details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-16 bg-muted rounded" />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          Banking / Payroll Details
          {hasData ? (
            <Badge variant="secondary" className="text-xs">Complete</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Incomplete</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Account Holder Name</Label>
              <Input
                value={data.account_holder_name}
                onChange={(e) => setData((p) => ({ ...p, account_holder_name: e.target.value }))}
                placeholder="Full name on account"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Institution # (3 digits)</Label>
                <Input
                  value={data.institution_number}
                  onChange={(e) => setData((p) => ({ ...p, institution_number: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                  maxLength={3}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transit # (5 digits)</Label>
                <Input
                  value={data.transit_number}
                  onChange={(e) => setData((p) => ({ ...p, transit_number: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
                  maxLength={5}
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Account Number</Label>
              <Input
                value={data.account_number}
                onChange={(e) => setData((p) => ({ ...p, account_number: e.target.value.replace(/\D/g, "") }))}
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Admin Note (optional)</Label>
              <Textarea
                value={data.banking_note}
                onChange={(e) => setData((p) => ({ ...p, banking_note: e.target.value }))}
                placeholder="Internal note..."
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="w-3 h-3 mr-1" />{saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        ) : hasData ? (
          <div className="space-y-2">
            {data.account_holder_name && (
              <p className="text-sm"><span className="text-muted-foreground">Holder:</span> {data.account_holder_name}</p>
            )}
            <div className="font-mono text-sm space-y-1 p-2 bg-muted rounded">
              <p><span className="text-muted-foreground">Inst:</span> {showFull ? data.institution_number : mask(data.institution_number)}</p>
              <p><span className="text-muted-foreground">Transit:</span> {showFull ? data.transit_number : mask(data.transit_number)}</p>
              <p><span className="text-muted-foreground">Acct:</span> {showFull ? data.account_number : mask(data.account_number)}</p>
            </div>
            {data.banking_note && (
              <p className="text-xs text-muted-foreground italic">Note: {data.banking_note}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowFull(!showFull)}>
                {showFull ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {showFull ? "Hide" : "Reveal"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-2">No banking info on file</p>
            <Button size="sm" onClick={() => setEditing(true)}>
              <CreditCard className="w-3 h-3 mr-1" />Add Banking Info
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

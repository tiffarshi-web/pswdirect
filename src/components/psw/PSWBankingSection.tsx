import { useState, useEffect } from "react";
import { CreditCard, Save, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PSWBankingSectionProps {
  pswProfileId: string;
}

interface BankingInfo {
  id?: string;
  account_number: string;
  transit_number: string;
  institution_number: string;
}

export const PSWBankingSection = ({ pswProfileId }: PSWBankingSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankingInfo, setBankingInfo] = useState<BankingInfo>({
    account_number: "",
    transit_number: "",
    institution_number: "",
  });

  // Load banking info
  useEffect(() => {
    const loadBankingInfo = async () => {
      if (!pswProfileId) return;

      const { data, error } = await supabase
        .from("psw_banking")
        .select("*")
        .eq("psw_id", pswProfileId)
        .maybeSingle();

      if (error) {
        console.error("Error loading banking info:", error);
      } else if (data) {
        setBankingInfo({
          id: data.id,
          account_number: data.account_number || "",
          transit_number: data.transit_number || "",
          institution_number: data.institution_number || "",
        });
      }
      setLoading(false);
    };

    loadBankingInfo();
  }, [pswProfileId]);

  const handleSave = async () => {
    if (!pswProfileId) return;

    // Validate
    if (!bankingInfo.account_number || !bankingInfo.transit_number || !bankingInfo.institution_number) {
      toast.error("Please fill in all banking fields");
      return;
    }

    if (bankingInfo.transit_number.length !== 5) {
      toast.error("Transit number must be 5 digits");
      return;
    }

    if (bankingInfo.institution_number.length !== 3) {
      toast.error("Institution number must be 3 digits");
      return;
    }

    setSaving(true);

    try {
      if (bankingInfo.id) {
        // Update existing
        const { error } = await supabase
          .from("psw_banking")
          .update({
            account_number: bankingInfo.account_number,
            transit_number: bankingInfo.transit_number,
            institution_number: bankingInfo.institution_number,
          })
          .eq("id", bankingInfo.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("psw_banking")
          .insert({
            psw_id: pswProfileId,
            account_number: bankingInfo.account_number,
            transit_number: bankingInfo.transit_number,
            institution_number: bankingInfo.institution_number,
          })
          .select()
          .single();

        if (error) throw error;
        setBankingInfo((prev) => ({ ...prev, id: data.id }));
      }

      toast.success("Banking information saved securely");
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error saving banking info:", error);
      toast.error("Failed to save banking information");
    } finally {
      setSaving(false);
    }
  };

  const maskNumber = (num: string) => {
    if (!num || num.length < 4) return num;
    return "•".repeat(num.length - 4) + num.slice(-4);
  };

  const hasBankingInfo = bankingInfo.account_number && bankingInfo.transit_number && bankingInfo.institution_number;

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-card ${!hasBankingInfo ? "ring-2 ring-amber-400" : ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Direct Deposit Banking
          {!hasBankingInfo && (
            <span className="text-xs text-amber-600 font-normal">(Required for payroll)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                🔒 Your banking information is encrypted and stored securely. Only payroll administrators can access this data.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution Number (3 digits)</Label>
              <Input
                id="institution"
                placeholder="e.g., 004"
                value={bankingInfo.institution_number}
                onChange={(e) => setBankingInfo((prev) => ({ ...prev, institution_number: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                maxLength={3}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Found on your cheque or bank app</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transit">Transit Number (5 digits)</Label>
              <Input
                id="transit"
                placeholder="e.g., 12345"
                value={bankingInfo.transit_number}
                onChange={(e) => setBankingInfo((prev) => ({ ...prev, transit_number: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
                maxLength={5}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Account Number</Label>
              <Input
                id="account"
                placeholder="e.g., 1234567890"
                value={bankingInfo.account_number}
                onChange={(e) => setBankingInfo((prev) => ({ ...prev, account_number: e.target.value.replace(/\D/g, "") }))}
                className="font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {hasBankingInfo ? (
              <>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="space-y-1 font-mono text-sm">
                    <p>
                      <span className="text-muted-foreground">Institution:</span>{" "}
                      {showNumbers ? bankingInfo.institution_number : maskNumber(bankingInfo.institution_number)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Transit:</span>{" "}
                      {showNumbers ? bankingInfo.transit_number : maskNumber(bankingInfo.transit_number)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Account:</span>{" "}
                      {showNumbers ? bankingInfo.account_number : maskNumber(bankingInfo.account_number)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowNumbers(!showNumbers)}
                      className="text-muted-foreground"
                    >
                      {showNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="w-full">
                  Update Banking Info
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-3">
                  No banking information on file. Add your direct deposit details to receive payments.
                </p>
                <Button onClick={() => setIsEditing(true)}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Banking Info
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

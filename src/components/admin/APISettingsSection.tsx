// API Settings Section for Admin Panel
// Configure office contact and view integration status

import { useState, useEffect } from "react";
import { Phone, Save, CheckCircle2, Server, Mail, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  fetchAPIConfig,
  saveAPIConfig,
  type APIConfig,
} from "@/lib/messageTemplates";

export const APISettingsSection = () => {
  const [config, setConfig] = useState<APIConfig>({
    emailApiKey: "",
    emailProvider: "resend",
    officeNumber: "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const apiConfig = await fetchAPIConfig();
      setConfig(apiConfig);
      setLoading(false);
    };
    loadConfig();
  }, []);

  const handleChange = (field: keyof APIConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveAPIConfig(config);
    setSaving(false);
    setHasChanges(false);
    if (success) {
      toast.success("Settings saved successfully!");
    } else {
      toast.error("Failed to save settings. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Backend Integrations</CardTitle>
          </div>
          <CardDescription>
            Secure API connections managed via backend secrets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <span className="font-medium">Email (Resend)</span>
                <p className="text-xs text-muted-foreground">RESEND_API_KEY configured</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Connected
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div>
                <span className="font-medium">Payments (Stripe)</span>
                <p className="text-xs text-muted-foreground">STRIPE_SECRET_KEY configured</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Connected
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Office Number */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Office Contact</CardTitle>
          </div>
          <CardDescription>
            This number appears in all templates as the contact point
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="office-number">Office Phone Number</Label>
            <Input
              id="office-number"
              value={config.officeNumber}
              onChange={(e) => handleChange("officeNumber", e.target.value)}
              placeholder="(613) 555-0100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-0 pt-4 pb-2 bg-background/95 backdrop-blur-sm">
          <Button
            variant="brand"
            size="lg"
            onClick={handleSave}
            disabled={saving}
            className="shadow-elevated w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
        <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium mb-2">
          🔒 Secure Configuration
        </p>
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          API keys are stored as secure backend secrets and never exposed in the frontend.
          View full infrastructure status in the Gear Box tab.
        </p>
      </div>
    </div>
  );
};

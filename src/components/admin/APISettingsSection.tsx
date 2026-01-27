// API Settings Section for Admin Panel
// Configure Email API credentials

import { useState, useEffect } from "react";
import { Mail, Phone, Save, Eye, EyeOff, CheckCircle2, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchAPIConfig,
  saveAPIConfig,
  isEmailConfigured,
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
  const [showSecrets, setShowSecrets] = useState({
    emailApiKey: false,
  });

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

  const toggleShowSecret = (field: "emailApiKey") => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const emailConfigured = isEmailConfigured();

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
            <CardTitle className="text-lg">Integration Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Email Service</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <Badge variant="default">Connected</Badge>
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

      {/* Email Configuration */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Email Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure your email service provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-provider">Email Provider</Label>
            <Select
              value={config.emailProvider}
              onValueChange={(value: "resend" | "sendgrid") =>
                handleChange("emailProvider", value)
              }
            >
              <SelectTrigger id="email-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-api-key">API Key</Label>
            <div className="relative">
              <Input
                id="email-api-key"
                type={showSecrets.emailApiKey ? "text" : "password"}
                value={config.emailApiKey}
                onChange={(e) => handleChange("emailApiKey", e.target.value)}
                placeholder="Enter API key..."
                className="pr-20"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret("emailApiKey")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.emailApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
        <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
          ✅ Database-backed Settings
        </p>
        <p className="text-xs text-green-700 dark:text-green-300">
          Your office number is stored securely in the database and will persist
          across all devices and after publishing.
        </p>
      </div>
    </div>
  );
};

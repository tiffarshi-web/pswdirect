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
  getAPIConfig,
  saveAPIConfig,
  isEmailConfigured,
  type APIConfig,
} from "@/lib/messageTemplates";

export const APISettingsSection = () => {
  const [config, setConfig] = useState<APIConfig>(getAPIConfig());
  const [hasChanges, setHasChanges] = useState(false);
  const [showSecrets, setShowSecrets] = useState({
    emailApiKey: false,
  });

  useEffect(() => {
    setConfig(getAPIConfig());
  }, []);

  const handleChange = (field: keyof APIConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveAPIConfig(config);
    setHasChanges(false);
    toast.success("Settings saved successfully!");
  };

  const toggleShowSecret = (field: "emailApiKey") => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const emailConfigured = isEmailConfigured();

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
            className="shadow-elevated w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
          ⚠️ Security Note
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          In production, these credentials should be stored as secure environment
          variables. The current setup stores them in localStorage for development
          purposes only.
        </p>
      </div>
    </div>
  );
};

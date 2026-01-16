// API Settings Section for Admin Panel
// Configure Twilio SMS and Email API credentials

import { useState, useEffect } from "react";
import { SMS_ENABLED, SMS_DISABLED_REASON } from "@/lib/notificationService";
import { Mail, MessageSquare, Key, Phone, Save, Eye, EyeOff, CheckCircle2, XCircle, Server } from "lucide-react";
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
  isSMSConfigured,
  type APIConfig,
} from "@/lib/messageTemplates";

export const APISettingsSection = () => {
  const [config, setConfig] = useState<APIConfig>(getAPIConfig());
  const [hasChanges, setHasChanges] = useState(false);
  const [showSecrets, setShowSecrets] = useState({
    twilioAuthToken: false,
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
    toast.success("API settings saved successfully!");
  };

  const toggleShowSecret = (field: "twilioAuthToken" | "emailApiKey") => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const emailConfigured = isEmailConfigured();
  const smsConfigured = isSMSConfigured();

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
            {emailConfigured ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <Badge variant="default">Connected</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary">Not Configured</Badge>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">SMS Service (Twilio)</span>
            </div>
            {SMS_ENABLED ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <Badge variant="default">Connected</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                  ⏳ Pending Approval
                </Badge>
              </div>
            )}
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

      {/* Twilio SMS Configuration */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Twilio SMS Configuration</CardTitle>
          </div>
          <CardDescription>
            Enter your Twilio credentials to enable SMS notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pending Approval Banner */}
          {!SMS_ENABLED && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                ⏳ SMS Temporarily Disabled
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                {SMS_DISABLED_REASON}. SMS notifications will show as toast messages until the account is cleared.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="twilio-sid">Account SID</Label>
            <div className="relative">
              <Input
                id="twilio-sid"
                value={config.twilioAccountSid}
                onChange={(e) => handleChange("twilioAccountSid", e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="pr-10"
              />
              <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilio-token">Auth Token</Label>
            <div className="relative">
              <Input
                id="twilio-token"
                type={showSecrets.twilioAuthToken ? "text" : "password"}
                value={config.twilioAuthToken}
                onChange={(e) => handleChange("twilioAuthToken", e.target.value)}
                placeholder="Enter auth token..."
                className="pr-20"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret("twilioAuthToken")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.twilioAuthToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilio-phone">Twilio Phone Number</Label>
            <Input
              id="twilio-phone"
              value={config.twilioPhoneNumber}
              onChange={(e) => handleChange("twilioPhoneNumber", e.target.value)}
              placeholder="+16135550100"
            />
            <p className="text-xs text-muted-foreground">
              Format: +1XXXXXXXXXX (with country code)
            </p>
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
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button
            variant="brand"
            size="lg"
            onClick={handleSave}
            className="shadow-elevated"
          >
            <Save className="w-4 h-4 mr-2" />
            Save API Settings
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

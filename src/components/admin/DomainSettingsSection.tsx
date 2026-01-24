import { useState, useEffect } from "react";
import { Globe, Save, RotateCcw, ExternalLink, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  getDomainConfig,
  saveDomainConfig,
  resetDomainConfig,
  type DomainConfig,
} from "@/lib/domainConfig";

export const DomainSettingsSection = () => {
  const [config, setConfig] = useState<DomainConfig>(getDomainConfig());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setConfig(getDomainConfig());
  }, []);

  const handleBaseUrlChange = (value: string) => {
    setConfig(prev => ({ ...prev, baseUrl: value }));
    setHasChanges(true);
  };

  const handleDisplayNameChange = (value: string) => {
    setConfig(prev => ({ ...prev, displayName: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Validate URL format
    if (!config.baseUrl.startsWith("https://")) {
      toast.error("Base URL must start with https://");
      return;
    }

    if (!config.displayName) {
      toast.error("Display name is required");
      return;
    }

    saveDomainConfig(config);
    setHasChanges(false);
    toast.success("Domain settings saved! All URLs will now use the new domain.");
  };

  const handleReset = () => {
    resetDomainConfig();
    setConfig(getDomainConfig());
    setHasChanges(false);
    toast.success("Domain reset to default");
  };

  // Generate preview URLs
  const previewUrls = {
    pswLogin: `${config.baseUrl}/psw-login`,
    clientPortal: `${config.baseUrl}/client-portal`,
    install: `${config.baseUrl}/install`,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            App Domain Settings
          </CardTitle>
          <CardDescription>
            Configure the domain used for all app URLs including QR codes, email links, and install prompts.
            Update this before migrating to a new domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> When you switch domains, update these settings FIRST. 
              All QR codes and links will immediately use the new domain.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={config.baseUrl}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                placeholder="https://pswdirect.ca"
              />
              <p className="text-xs text-muted-foreground">
                Full URL including https:// (e.g., https://pswdirect.ca)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (for emails)</Label>
              <Input
                id="displayName"
                value={config.displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="pswdirect.ca"
              />
              <p className="text-xs text-muted-foreground">
                Shown in email footers and notifications (e.g., pswdirect.ca)
              </p>
            </div>
          </div>

          {/* URL Preview */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">URL Preview</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-28">PSW Login:</span>
                <code className="bg-background px-2 py-1 rounded text-xs flex-1 truncate">
                  {previewUrls.pswLogin}
                </code>
                <a 
                  href={previewUrls.pswLogin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-28">Client Portal:</span>
                <code className="bg-background px-2 py-1 rounded text-xs flex-1 truncate">
                  {previewUrls.clientPortal}
                </code>
                <a 
                  href={previewUrls.clientPortal} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-28">Install App:</span>
                <code className="bg-background px-2 py-1 rounded text-xs flex-1 truncate">
                  {previewUrls.install}
                </code>
                <a 
                  href={previewUrls.install} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ✅ PSW approval emails will include QR codes pointing to the PSW Login URL above.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Domain Settings
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

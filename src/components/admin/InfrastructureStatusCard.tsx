// Infrastructure Status Card for Admin Panel
// Displays the status of all backend integrations

import { Mail, CreditCard, Smartphone, Globe, CheckCircle2, ExternalLink, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROGRESSIER_CONFIG, INFRASTRUCTURE_STATUS } from "@/lib/progressierConfig";
import { getDomainConfig } from "@/lib/domainConfig";

interface IntegrationRowProps {
  icon: React.ReactNode;
  name: string;
  provider: string;
  status: "connected" | "active" | "not_configured";
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const IntegrationRow = ({ icon, name, provider, status, description, action }: IntegrationRowProps) => (
  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-background">{icon}</div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{name}</p>
          <span className="text-xs text-muted-foreground">({provider})</span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge
        variant={status === "not_configured" ? "secondary" : "default"}
        className={
          status !== "not_configured"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : ""
        }
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {status === "connected" ? "Connected" : status === "active" ? "Active" : "Not Configured"}
      </Badge>
      {action && action.href && (
        <Button variant="ghost" size="sm" asChild>
          <a href={action.href} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
      )}
    </div>
  </div>
);

export const InfrastructureStatusCard = () => {
  const domainConfig = getDomainConfig();

  return (
    <Card className="shadow-card mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Infrastructure & Integrations</CardTitle>
            <CardDescription>Backend services powering your application</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Email Service */}
        <IntegrationRow
          icon={<Mail className="w-4 h-4 text-primary" />}
          name="Email Service"
          provider={INFRASTRUCTURE_STATUS.email.provider}
          status={INFRASTRUCTURE_STATUS.email.status as "connected"}
          description={INFRASTRUCTURE_STATUS.email.description}
        />

        {/* Payments */}
        <IntegrationRow
          icon={<CreditCard className="w-4 h-4 text-primary" />}
          name="Payments"
          provider={INFRASTRUCTURE_STATUS.payments.provider}
          status={INFRASTRUCTURE_STATUS.payments.status as "connected"}
          description={INFRASTRUCTURE_STATUS.payments.description}
        />

        {/* Push Notifications */}
        <IntegrationRow
          icon={<Bell className="w-4 h-4 text-primary" />}
          name="Push Notifications"
          provider={INFRASTRUCTURE_STATUS.pushNotifications.provider}
          status={INFRASTRUCTURE_STATUS.pushNotifications.status as "connected"}
          description={INFRASTRUCTURE_STATUS.pushNotifications.description}
        />

        {/* PWA */}
        <IntegrationRow
          icon={<Smartphone className="w-4 h-4 text-primary" />}
          name="PWA"
          provider={INFRASTRUCTURE_STATUS.pwa.provider}
          status="active"
          description={`App ID: ${PROGRESSIER_CONFIG.appId.substring(0, 8)}...`}
          action={{
            label: "Dashboard",
            href: PROGRESSIER_CONFIG.dashboardUrl,
          }}
        />

        {/* Domain */}
        <IntegrationRow
          icon={<Globe className="w-4 h-4 text-primary" />}
          name="Domain"
          provider={domainConfig.displayName}
          status="active"
          description={domainConfig.baseUrl}
        />

        {/* Info Note */}
        <div className="pt-2 mt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            API keys are securely stored as backend secrets and not exposed in the frontend
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InfrastructureStatusCard;

// Risk Engine Alerts Panel - Central monitoring dashboard for operational risks
// Routes alerts to Financial, Payroll, Shift Risk, and Operational categories

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  DollarSign,
  CreditCard,
  Clock,
  Settings,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Shield,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getAllAlerts,
  getAlertsByCategory,
  getUnresolvedAlerts,
  resolveAlert,
  deleteAlert,
  clearResolvedAlerts,
  getSeverityBadgeClass,
  countBySeverity,
  type RiskAlert,
  type AlertCategory,
} from "@/lib/riskAlertStore";
import { runInitialRiskScan } from "@/lib/riskEngineScan";
import { toast } from "sonner";

const getCategoryIcon = (category: AlertCategory) => {
  switch (category) {
    case "financial": return <DollarSign className="w-4 h-4" />;
    case "payroll": return <CreditCard className="w-4 h-4" />;
    case "shift": return <Clock className="w-4 h-4" />;
    case "operational": return <Settings className="w-4 h-4" />;
  }
};

const getCategoryLabel = (category: AlertCategory) => {
  switch (category) {
    case "financial": return "Financial Alerts";
    case "payroll": return "Payroll Alerts";
    case "shift": return "Shift Risk Alerts";
    case "operational": return "Operational Alerts";
  }
};

const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case "critical": return "🔴 CRITICAL";
    case "high": return "🟠 HIGH";
    case "medium": return "🟡 MEDIUM";
    case "low": return "🔵 LOW";
    default: return severity.toUpperCase();
  }
};

interface AlertCardProps {
  alert: RiskAlert;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}

const AlertCard = ({ alert, onResolve, onDelete }: AlertCardProps) => {
  return (
    <Card className={`mb-3 border-l-4 ${
      alert.severity === "critical" ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20" :
      alert.severity === "high" ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20" :
      alert.severity === "medium" ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20" :
      "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
    }`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Badge className={getSeverityBadgeClass(alert.severity)}>
              {getSeverityLabel(alert.severity)}
            </Badge>
            {alert.resolved && (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                ✓ Resolved
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {format(parseISO(alert.timestamp), "MMM d, HH:mm")}
          </span>
        </div>
        
        <h4 className="font-semibold text-sm mb-2">{alert.title}</h4>
        
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">DETECTED ISSUE: </span>
            <span>{alert.detectedIssue}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">WHY THIS MATTERS: </span>
            <span>{alert.whyItMatters}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">LIKELY ROOT CAUSE: </span>
            <span>{alert.likelyRootCause}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">RECOMMENDED ACTION: </span>
            <span className="text-primary font-medium">{alert.recommendedAction}</span>
          </div>
        </div>
        
        {!alert.resolved && (
          <div className="flex gap-2 mt-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onResolve(alert.id)}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Resolve
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Dismiss
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Dismiss this alert?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the alert without marking it as resolved.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(alert.id)} className="bg-destructive">
                    Dismiss
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        
        {alert.resolved && alert.resolvedAt && (
          <div className="mt-3 text-xs text-muted-foreground border-t pt-2">
            Resolved {format(parseISO(alert.resolvedAt), "MMM d, HH:mm")} by {alert.resolvedBy || "Admin"}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface CategoryPanelProps {
  category: AlertCategory;
  alerts: RiskAlert[];
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}

const CategoryPanel = ({ category, alerts, onResolve, onDelete }: CategoryPanelProps) => {
  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);
  
  return (
    <div className="space-y-4">
      {unresolvedAlerts.length === 0 ? (
        <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium text-green-700 dark:text-green-300">
              No Active {getCategoryLabel(category)}
            </p>
            <p className="text-sm text-muted-foreground">
              All systems operating normally in this category.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          {unresolvedAlerts.map(alert => (
            <AlertCard 
              key={alert.id} 
              alert={alert} 
              onResolve={onResolve}
              onDelete={onDelete}
            />
          ))}
        </ScrollArea>
      )}
      
      {resolvedAlerts.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            View {resolvedAlerts.length} resolved alert(s)
          </summary>
          <div className="mt-2 opacity-60">
            {resolvedAlerts.slice(0, 5).map(alert => (
              <AlertCard 
                key={alert.id} 
                alert={alert} 
                onResolve={onResolve}
                onDelete={onDelete}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export const RiskEngineAlerts = () => {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [activeCategory, setActiveCategory] = useState<AlertCategory>("financial");
  const [isScanning, setIsScanning] = useState(false);
  
  const loadAlerts = () => {
    setAlerts(getAllAlerts());
  };
  
  useEffect(() => {
    const existingAlerts = getAllAlerts();
    if (existingAlerts.length === 0) {
      // Run initial scan if no alerts exist
      runInitialRiskScan();
    }
    loadAlerts();
  }, []);
  
  const handleRunScan = () => {
    setIsScanning(true);
    // Clear existing alerts and run fresh scan
    localStorage.removeItem("pswdirect_risk_alerts");
    const result = runInitialRiskScan();
    loadAlerts();
    setIsScanning(false);
    toast.success(`Risk scan complete: ${result.alertsCreated} alerts generated`);
  };
  
  const handleResolve = (alertId: string) => {
    resolveAlert(alertId, "Admin");
    loadAlerts();
    toast.success("Alert marked as resolved");
  };
  
  const handleDelete = (alertId: string) => {
    deleteAlert(alertId);
    loadAlerts();
    toast.success("Alert dismissed");
  };
  
  const handleClearResolved = () => {
    const count = clearResolvedAlerts();
    loadAlerts();
    toast.success(`Cleared ${count} resolved alert(s)`);
  };
  
  const severityCounts = countBySeverity();
  const unresolvedCount = getUnresolvedAlerts().length;
  
  const getCategoryAlerts = (category: AlertCategory) => 
    alerts.filter(a => a.category === category);
  
  const getCategoryUnresolvedCount = (category: AlertCategory) =>
    getCategoryAlerts(category).filter(a => !a.resolved).length;

  return (
    <div className="space-y-6">
      {/* Risk Engine Header */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-primary">
                Central Live Risk Engine
              </h3>
              <p className="text-sm text-muted-foreground">
                Real-time operational defense system monitoring financial, payroll, shift, and system health.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleRunScan}
                disabled={isScanning}
              >
                <Zap className="w-4 h-4 mr-1" />
                {isScanning ? "Scanning..." : "Run Scan"}
              </Button>
              <Button variant="outline" size="sm" onClick={loadAlerts}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Severity Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{severityCounts.critical}</p>
            <p className="text-xs text-red-600/80">🔴 CRITICAL</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{severityCounts.high}</p>
            <p className="text-xs text-orange-600/80">🟠 HIGH</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{severityCounts.medium}</p>
            <p className="text-xs text-yellow-600/80">🟡 MEDIUM</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{severityCounts.low}</p>
            <p className="text-xs text-blue-600/80">🔵 LOW</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Risk Alerts ({unresolvedCount} active)
            </CardTitle>
            {alerts.some(a => a.resolved) && (
              <Button variant="ghost" size="sm" onClick={handleClearResolved}>
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Resolved
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as AlertCategory)}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="financial" className="text-xs sm:text-sm">
                <DollarSign className="w-4 h-4 mr-1 hidden sm:inline" />
                Financial
                {getCategoryUnresolvedCount("financial") > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {getCategoryUnresolvedCount("financial")}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="payroll" className="text-xs sm:text-sm">
                <CreditCard className="w-4 h-4 mr-1 hidden sm:inline" />
                Payroll
                {getCategoryUnresolvedCount("payroll") > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {getCategoryUnresolvedCount("payroll")}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="shift" className="text-xs sm:text-sm">
                <Clock className="w-4 h-4 mr-1 hidden sm:inline" />
                Shift Risk
                {getCategoryUnresolvedCount("shift") > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {getCategoryUnresolvedCount("shift")}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="operational" className="text-xs sm:text-sm">
                <Settings className="w-4 h-4 mr-1 hidden sm:inline" />
                Operational
                {getCategoryUnresolvedCount("operational") > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {getCategoryUnresolvedCount("operational")}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="financial">
              <CategoryPanel 
                category="financial" 
                alerts={getCategoryAlerts("financial")}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            </TabsContent>
            <TabsContent value="payroll">
              <CategoryPanel 
                category="payroll" 
                alerts={getCategoryAlerts("payroll")}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            </TabsContent>
            <TabsContent value="shift">
              <CategoryPanel 
                category="shift" 
                alerts={getCategoryAlerts("shift")}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            </TabsContent>
            <TabsContent value="operational">
              <CategoryPanel 
                category="operational" 
                alerts={getCategoryAlerts("operational")}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

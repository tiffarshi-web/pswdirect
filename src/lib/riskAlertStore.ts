// Risk Engine Alert Store - Persistent alert management for operational risks
// Alerts persist until manually resolved

import { supabase } from "@/integrations/supabase/client";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertCategory = "financial" | "payroll" | "shift" | "operational";

export interface RiskAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  detectedIssue: string;
  whyItMatters: string;
  likelyRootCause: string;
  recommendedAction: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

const STORAGE_KEY = "pswdirect_risk_alerts";

// Get all alerts from localStorage
export const getAllAlerts = (): RiskAlert[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Get unresolved alerts by category
export const getAlertsByCategory = (category: AlertCategory): RiskAlert[] => {
  return getAllAlerts().filter(a => a.category === category && !a.resolved);
};

// Get all unresolved alerts
export const getUnresolvedAlerts = (): RiskAlert[] => {
  return getAllAlerts().filter(a => !a.resolved);
};

// Get resolved alerts (for history)
export const getResolvedAlerts = (): RiskAlert[] => {
  return getAllAlerts().filter(a => a.resolved);
};

// Create a new alert
export const createAlert = (
  severity: AlertSeverity,
  category: AlertCategory,
  title: string,
  detectedIssue: string,
  whyItMatters: string,
  likelyRootCause: string,
  recommendedAction: string
): RiskAlert => {
  const alert: RiskAlert = {
    id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    severity,
    category,
    title,
    detectedIssue,
    whyItMatters,
    likelyRootCause,
    recommendedAction,
    timestamp: new Date().toISOString(),
    resolved: false,
  };
  
  const alerts = getAllAlerts();
  alerts.unshift(alert);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  
  return alert;
};

// Resolve an alert
export const resolveAlert = (alertId: string, resolvedBy: string = "Admin"): boolean => {
  const alerts = getAllAlerts();
  const index = alerts.findIndex(a => a.id === alertId);
  
  if (index === -1) return false;
  
  alerts[index].resolved = true;
  alerts[index].resolvedAt = new Date().toISOString();
  alerts[index].resolvedBy = resolvedBy;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  return true;
};

// Delete an alert permanently
export const deleteAlert = (alertId: string): boolean => {
  const alerts = getAllAlerts();
  const filtered = alerts.filter(a => a.id !== alertId);
  
  if (filtered.length === alerts.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

// Clear all resolved alerts
export const clearResolvedAlerts = (): number => {
  const alerts = getAllAlerts();
  const unresolvedOnly = alerts.filter(a => !a.resolved);
  const cleared = alerts.length - unresolvedOnly.length;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unresolvedOnly));
  return cleared;
};

// Write daily health status (clears previous health entries)
export const writeDailyHealthStatus = (
  financialConfidence: "high" | "medium" | "low",
  payrollStatus: "normal" | "warning" | "critical",
  shiftOperations: "healthy" | "degraded" | "critical",
  activeRisks: number
): RiskAlert => {
  // Remove previous health status entries
  const alerts = getAllAlerts().filter(a => !a.title.startsWith("DAILY HEALTH STATUS"));
  
  const status = activeRisks === 0 ? "STABLE" : activeRisks <= 2 ? "MONITORING" : "ELEVATED";
  
  const healthAlert: RiskAlert = {
    id: `HEALTH-${new Date().toISOString().split('T')[0]}`,
    severity: activeRisks === 0 ? "low" : activeRisks <= 2 ? "medium" : "high",
    category: "operational",
    title: `DAILY HEALTH STATUS: ${status}`,
    detectedIssue: activeRisks === 0 
      ? "No active risks detected. All systems operating normally."
      : `${activeRisks} active risk(s) require attention.`,
    whyItMatters: "Daily operational health summary for management oversight.",
    likelyRootCause: "Automated health check by Risk Engine.",
    recommendedAction: activeRisks === 0 
      ? "Continue monitoring. No action required."
      : "Review active alerts and address prioritized by severity.",
    timestamp: new Date().toISOString(),
    resolved: false,
  };
  
  alerts.unshift(healthAlert);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  
  return healthAlert;
};

// Get severity color
export const getSeverityColor = (severity: AlertSeverity): string => {
  switch (severity) {
    case "critical": return "bg-red-500 text-white";
    case "high": return "bg-orange-500 text-white";
    case "medium": return "bg-yellow-500 text-black";
    case "low": return "bg-blue-500 text-white";
  }
};

// Get severity badge variant
export const getSeverityBadgeClass = (severity: AlertSeverity): string => {
  switch (severity) {
    case "critical": return "bg-red-100 text-red-700 border-red-300";
    case "high": return "bg-orange-100 text-orange-700 border-orange-300";
    case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "low": return "bg-blue-100 text-blue-700 border-blue-300";
  }
};

// Count alerts by severity
export const countBySeverity = (): Record<AlertSeverity, number> => {
  const alerts = getUnresolvedAlerts();
  return {
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
    low: alerts.filter(a => a.severity === "low").length,
  };
};

import { useState, useEffect } from "react";
import { Save, MapPin, AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DEFAULT_PRICING,
  getPricing,
  savePricing,
  SERVICE_RADIUS_KM,
  OFFICE_LOCATION,
  type PricingConfig,
} from "@/lib/businessConfig";
import { PricingSection } from "@/components/admin/PricingSection";
import { TaskManagementSection } from "@/components/admin/TaskManagementSection";
import { BookingManagementSection } from "@/components/admin/BookingManagementSection";
import { PSWOversightSection } from "@/components/admin/PSWOversightSection";
import { RadiusAlertsSection } from "@/components/admin/RadiusAlertsSection";
import { PendingPSWSection } from "@/components/admin/PendingPSWSection";
import { DevSettingsSection } from "@/components/admin/DevSettingsSection";
import { MessagingTemplatesSection } from "@/components/admin/MessagingTemplatesSection";
import { APISettingsSection } from "@/components/admin/APISettingsSection";
import { PayrollCalendarSection } from "@/components/admin/PayrollCalendarSection";
import { PayrollApprovalSection } from "@/components/admin/PayrollApprovalSection";
import { SecurityAuditSection } from "@/components/admin/SecurityAuditSection";
import { AdminSidebar, AdminMobileNav, type AdminTab } from "@/components/navigation/AdminSidebar";
import logo from "@/assets/logo.png";

const AdminPortal = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("pricing");

  // Redirect if not authenticated or wrong role
  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    setPricing(getPricing());
  }, []);

  const handleRateChange = (service: keyof PricingConfig["baseHourlyRates"], value: string) => {
    const numValue = parseFloat(value) || 0;
    setPricing((prev) => ({
      ...prev,
      baseHourlyRates: {
        ...prev.baseHourlyRates,
        [service]: numValue,
      },
    }));
    setHasChanges(true);
  };

  const handleSurgeChange = (value: number[]) => {
    setPricing((prev) => ({
      ...prev,
      surgeMultiplier: value[0],
    }));
    setHasChanges(true);
  };

  const handleMinHoursChange = (value: string) => {
    const numValue = parseFloat(value) || 1;
    setPricing((prev) => ({
      ...prev,
      minimumHours: numValue,
    }));
    setHasChanges(true);
  };

  const handleDoctorEscortMinChange = (value: string) => {
    const numValue = parseFloat(value) || 2;
    setPricing((prev) => ({
      ...prev,
      doctorEscortMinimumHours: numValue,
    }));
    setHasChanges(true);
  };

  const handleTaskDurationChange = (service: string, value: string) => {
    const numValue = parseInt(value) || 30;
    setPricing((prev) => ({
      ...prev,
      taskDurations: {
        ...prev.taskDurations,
        [service]: numValue,
      },
    }));
    setHasChanges(true);
  };

  const handleOvertimeRateChange = (value: string) => {
    const numValue = parseInt(value) || 50;
    setPricing((prev) => ({
      ...prev,
      overtimeRatePercentage: Math.min(100, Math.max(10, numValue)),
    }));
    setHasChanges(true);
  };

  const handleOvertimeGraceChange = (value: string) => {
    const numValue = parseInt(value) || 14;
    setPricing((prev) => ({
      ...prev,
      overtimeGraceMinutes: Math.min(30, Math.max(0, numValue)),
    }));
    setHasChanges(true);
  };

  const handleOvertimeBlockChange = (value: string) => {
    const numValue = parseInt(value) || 30;
    setPricing((prev) => ({
      ...prev,
      overtimeBlockMinutes: Math.min(60, Math.max(15, numValue)),
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    savePricing(pricing);
    setHasChanges(false);
    toast.success("Configuration saved successfully!");
  };

  const handleReset = () => {
    setPricing(DEFAULT_PRICING);
    setHasChanges(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "pricing":
        return (
          <div className="space-y-6">
            <PricingSection
              pricing={pricing}
              onRateChange={handleRateChange}
              onSurgeChange={handleSurgeChange}
              onMinHoursChange={handleMinHoursChange}
              onDoctorEscortMinChange={handleDoctorEscortMinChange}
              onTaskDurationChange={handleTaskDurationChange}
              onOvertimeRateChange={handleOvertimeRateChange}
              onOvertimeGraceChange={handleOvertimeGraceChange}
              onOvertimeBlockChange={handleOvertimeBlockChange}
            />

            {/* Service Radius Card */}
            <Card className="shadow-card">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">Service Area</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Maximum distance from central office</p>
                    <p className="text-xs text-muted-foreground mt-1">{OFFICE_LOCATION.address}</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">{SERVICE_RADIUS_KM} km</span>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Clients beyond {SERVICE_RADIUS_KM}km see: <em>"Address outside of 75km service radius."</em>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reset Button */}
            <Button variant="outline" onClick={handleReset} className="w-full">
              Reset to Default Pricing
            </Button>
          </div>
        );
      case "tasks":
        return <TaskManagementSection />;
      case "payroll":
        return <PayrollCalendarSection />;
      case "approval":
        return <PayrollApprovalSection />;
      case "bookings":
        return <BookingManagementSection />;
      case "psw":
        return <PSWOversightSection />;
      case "pending":
        return <PendingPSWSection />;
      case "radius":
        return <RadiusAlertsSection />;
      case "messaging":
        return <MessagingTemplatesSection />;
      case "api":
        return <APISettingsSection />;
      case "security":
        return <SecurityAuditSection />;
      case "settings":
        return <DevSettingsSection />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3 lg:hidden">
              <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
              <span className="font-semibold text-foreground">Admin</span>
            </div>
            <h1 className="hidden lg:block text-xl font-semibold text-foreground">
              {activeTab === "pricing" && "Pricing & Billing"}
              {activeTab === "payroll" && "Payroll Calendar"}
              {activeTab === "approval" && "Payroll Approval"}
              {activeTab === "tasks" && "Task Management"}
              {activeTab === "bookings" && "Booking Management"}
              {activeTab === "psw" && "PSW Oversight"}
              {activeTab === "pending" && "Pending PSW Applications"}
              {activeTab === "radius" && "Radius Alerts"}
              {activeTab === "messaging" && "Messaging Templates"}
              {activeTab === "api" && "API Settings"}
              {activeTab === "security" && "Security Audit Log"}
              {activeTab === "settings" && "Developer Settings"}
            </h1>
            <div className="flex items-center gap-2">
              {activeTab === "pricing" && (
                <Button 
                  variant="brand" 
                  onClick={handleSave}
                  disabled={!hasChanges}
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={logout}
                className="lg:hidden text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-6 py-6 pb-24 lg:pb-6 max-w-4xl mx-auto w-full">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <AdminMobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default AdminPortal;

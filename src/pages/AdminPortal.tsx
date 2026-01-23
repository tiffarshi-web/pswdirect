import { useState, useEffect } from "react";
import { Save, LogOut, Settings, DollarSign, Shield, ListChecks, Play, FlaskConical, BarChart3, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DEFAULT_PRICING,
  getPricing,
  savePricing,
  type PricingConfig,
} from "@/lib/businessConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PSWOversightSection } from "@/components/admin/PSWOversightSection";
import { PendingPSWSection } from "@/components/admin/PendingPSWSection";
import { DailyOperationsCalendar } from "@/components/admin/DailyOperationsCalendar";
import { ClientRecordsSection } from "@/components/admin/ClientRecordsSection";
import { SecurityAuditSection } from "@/components/admin/SecurityAuditSection";
import { PricingSection } from "@/components/admin/PricingSection";
import { StaffPayScaleSection } from "@/components/admin/StaffPayScaleSection";
import { PayrollDashboardSection } from "@/components/admin/PayrollDashboardSection";
import { APISettingsSection } from "@/components/admin/APISettingsSection";
import { MessagingTemplatesSection } from "@/components/admin/MessagingTemplatesSection";
import { RadiusAlertsSection } from "@/components/admin/RadiusAlertsSection";
import { DevSettingsSection } from "@/components/admin/DevSettingsSection";
import { ActiveShiftsMapView } from "@/components/admin/ActiveShiftsMapView";
import { ActiveShiftsSection } from "@/components/admin/ActiveShiftsSection";
import { TestingPanelSection } from "@/components/admin/TestingPanelSection";
import { PSWCoverageMapView } from "@/components/admin/PSWCoverageMapView";
import { OrderStatisticsSection } from "@/components/admin/OrderStatisticsSection";
import { OrderListSection } from "@/components/admin/OrderListSection";
import { StripeSettingsSection } from "@/components/admin/StripeSettingsSection";
import { AdminManagementSection } from "@/components/admin/AdminManagementSection";

import { getDevConfig } from "@/lib/devConfig";
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from "@/assets/logo.png";

type AdminTab = "active-psws" | "pending-review" | "psw-coverage-map" | "active-shifts" | "orders-calendar" | "order-stats" | "order-list" | "active-shifts-map" | "client-database" | "payroll" | "pricing-tasks" | "security" | "testing";
type SettingsPanel = "api" | "messaging" | "radius" | "dev" | "stripe" | "admin-mgmt" | null;

const AdminPortal = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("active-psws");
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsPanel>(null);
  const devConfig = getDevConfig();

  // Redirect if not authenticated or wrong role
  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    setPricing(getPricing());
  }, []);

  const handleSave = () => {
    savePricing(pricing);
    setHasChanges(false);
    toast.success("Configuration saved successfully!");
  };

  const handleSurgeChange = (value: number[]) => {
    setPricing(prev => ({ ...prev, surgeMultiplier: value[0] }));
    setHasChanges(true);
  };

  const handleMinHoursChange = (value: string) => {
    setPricing(prev => ({ ...prev, minimumHours: parseFloat(value) || 1 }));
    setHasChanges(true);
  };

  const handleDoctorEscortMinChange = (value: string) => {
    setPricing(prev => ({ ...prev, doctorEscortMinimumHours: parseFloat(value) || 2 }));
    setHasChanges(true);
  };

  const handleTaskDurationChange = (service: string, value: string) => {
    setPricing(prev => ({
      ...prev,
      taskDurations: { ...prev.taskDurations, [service]: parseInt(value) || 0 }
    }));
    setHasChanges(true);
  };

  const handleOvertimeRateChange = (value: string) => {
    setPricing(prev => ({ ...prev, overtimeRatePercentage: parseInt(value) || 50 }));
    setHasChanges(true);
  };

  const handleOvertimeGraceChange = (value: string) => {
    setPricing(prev => ({ ...prev, overtimeGraceMinutes: parseInt(value) || 15 }));
    setHasChanges(true);
  };

  const handleOvertimeBlockChange = (value: string) => {
    setPricing(prev => ({ ...prev, overtimeBlockMinutes: parseInt(value) || 30 }));
    setHasChanges(true);
  };

  const handleRegionalSurgeToggle = (enabled: boolean) => {
    setPricing(prev => ({ ...prev, regionalSurgeEnabled: enabled }));
    setHasChanges(true);
  };

  const handleSurgeZoneUpdate = (zones: import("@/lib/businessConfig").SurgeZone[]) => {
    setPricing(prev => ({ ...prev, surgeZones: zones }));
    setHasChanges(true);
  };

  const getSettingsPanelTitle = () => {
    switch (activeSettingsPanel) {
      case "api": return "API Settings";
      case "messaging": return "Messaging Templates";
      case "radius": return "Radius Alerts";
      case "dev": return "Developer Settings";
      case "stripe": return "Stripe & Refunds";
      case "admin-mgmt": return "Admin Management";
      default: return "Settings";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground hidden sm:inline">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveSettingsPanel("api")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Email Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveSettingsPanel("messaging")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Messaging Templates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveSettingsPanel("stripe")}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Stripe & Refunds
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveSettingsPanel("radius")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Radius Alerts
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveSettingsPanel("admin-mgmt")}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Admin Management
                </DropdownMenuItem>
                {!devConfig.liveAuthEnabled && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveSettingsPanel("dev")}>
                      <Shield className="w-4 h-4 mr-2" />
                      Dev Settings
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasChanges && (
              <Button 
                variant="brand" 
                onClick={handleSave}
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
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="flex-1 flex flex-col">
        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as AdminTab)}
          className="flex-1 flex flex-col"
        >
          {/* Top Tab Navigation */}
          <div className="sticky top-16 z-40 bg-background border-b border-border px-4 lg:px-6">
            <ScrollArea className="w-full">
              <TabsList className="h-12 w-max justify-start gap-1 bg-transparent p-0 rounded-none">
                <TabsTrigger 
                  value="active-psws"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  Active PSWs
                </TabsTrigger>
                <TabsTrigger 
                  value="pending-review"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  Pending Review
                </TabsTrigger>
                <TabsTrigger 
                  value="psw-coverage-map"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  PSW Coverage
                </TabsTrigger>
                <TabsTrigger 
                  value="active-shifts"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Active Shifts
                </TabsTrigger>
                <TabsTrigger 
                  value="orders-calendar"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  Orders/Calendar
                </TabsTrigger>
                <TabsTrigger 
                  value="order-stats"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Statistics
                </TabsTrigger>
                <TabsTrigger 
                  value="order-list"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  Order List
                </TabsTrigger>
                <TabsTrigger 
                  value="active-shifts-map"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  Live Map
                </TabsTrigger>
                <TabsTrigger 
                  value="client-database"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  Client Database
                </TabsTrigger>
                <TabsTrigger 
                  value="payroll"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Payroll
                </TabsTrigger>
                <TabsTrigger 
                  value="pricing-tasks"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  <ListChecks className="w-4 h-4 mr-1" />
                  Pricing & Tasks
                </TabsTrigger>
                <TabsTrigger 
                  value="security"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Security
                </TabsTrigger>
                {!devConfig.liveAuthEnabled && (
                  <TabsTrigger 
                    value="testing"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6 whitespace-nowrap"
                  >
                    <FlaskConical className="w-4 h-4 mr-1" />
                    Testing
                  </TabsTrigger>
                )}
              </TabsList>
            </ScrollArea>
          </div>

          {/* Tab Content */}
          <div className="flex-1 px-4 lg:px-6 py-6 max-w-6xl mx-auto w-full overflow-y-auto max-h-[calc(100vh-8rem)]">
            <TabsContent value="active-psws" className="m-0">
              <PSWOversightSection />
            </TabsContent>
            
            <TabsContent value="pending-review" className="m-0">
              <PendingPSWSection />
            </TabsContent>

            <TabsContent value="psw-coverage-map" className="m-0">
              <PSWCoverageMapView />
            </TabsContent>
            
            <TabsContent value="active-shifts" className="m-0">
              <ActiveShiftsSection />
            </TabsContent>
            
            <TabsContent value="orders-calendar" className="m-0">
              <DailyOperationsCalendar />
            </TabsContent>

            <TabsContent value="order-stats" className="m-0">
              <OrderStatisticsSection />
            </TabsContent>

            <TabsContent value="order-list" className="m-0">
              <OrderListSection />
            </TabsContent>

            <TabsContent value="active-shifts-map" className="m-0">
              <ActiveShiftsMapView />
            </TabsContent>
            
            <TabsContent value="client-database" className="m-0">
              <ClientRecordsSection />
            </TabsContent>

            <TabsContent value="payroll" className="m-0">
              <PayrollDashboardSection />
            </TabsContent>

            <TabsContent value="pricing-tasks" className="m-0">
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="space-y-6 pr-4">
                  <StaffPayScaleSection />
                  <PricingSection
                    pricing={pricing}
                    onSurgeChange={handleSurgeChange}
                    onMinHoursChange={handleMinHoursChange}
                    onDoctorEscortMinChange={handleDoctorEscortMinChange}
                    onTaskDurationChange={handleTaskDurationChange}
                    onOvertimeRateChange={handleOvertimeRateChange}
                    onOvertimeGraceChange={handleOvertimeGraceChange}
                    onOvertimeBlockChange={handleOvertimeBlockChange}
                    onRegionalSurgeToggle={handleRegionalSurgeToggle}
                    onSurgeZoneUpdate={handleSurgeZoneUpdate}
                    onSave={handleSave}
                    hasChanges={hasChanges}
                  />
                </div>
              </ScrollArea>
            </TabsContent>


            <TabsContent value="security" className="m-0">
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="pr-4">
                  <SecurityAuditSection />
                </div>
              </ScrollArea>
            </TabsContent>

            {!devConfig.liveAuthEnabled && (
              <TabsContent value="testing" className="m-0">
                <TestingPanelSection />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </main>

      {/* Settings Dialog */}
      <Dialog open={activeSettingsPanel !== null} onOpenChange={(open) => !open && setActiveSettingsPanel(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{getSettingsPanelTitle()}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="pb-20">
              {activeSettingsPanel === "api" && <APISettingsSection />}
              {activeSettingsPanel === "messaging" && <MessagingTemplatesSection />}
              {activeSettingsPanel === "radius" && <RadiusAlertsSection />}
              {activeSettingsPanel === "dev" && <DevSettingsSection />}
              {activeSettingsPanel === "stripe" && <StripeSettingsSection />}
              {activeSettingsPanel === "admin-mgmt" && <AdminManagementSection />}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPortal;

import { useState, useEffect } from "react";
import { Save, LogOut, Shield } from "lucide-react";
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
import { DailyOperationsCalendar } from "@/components/admin/DailyOperationsCalendar";
import { ClientRecordsSection } from "@/components/admin/ClientRecordsSection";
import { ActivePSWTable } from "@/components/admin/ActivePSWTable";
import { PendingReviewSection } from "@/components/admin/PendingReviewSection";
import logo from "@/assets/logo.png";

type AdminTab = "active-psw" | "pending-review" | "orders-calendar" | "client-database";

const AdminPortal = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("active-psw");

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

  const getTabTitle = () => {
    switch (activeTab) {
      case "active-psw": return "Active PSWs";
      case "pending-review": return "Pending Review";
      case "orders-calendar": return "Orders / Calendar";
      case "client-database": return "Client Database";
      default: return "Admin Portal";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <span className="font-semibold text-foreground">Admin Portal</span>
              <span className="text-muted-foreground mx-2">|</span>
              <span className="text-muted-foreground">{getTabTitle()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="flex-1 px-4 lg:px-6 py-6 max-w-6xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTab)} className="space-y-6">
          {/* Top Tab Navigation */}
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger 
              value="active-psw" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 text-sm font-medium"
            >
              Active PSWs
            </TabsTrigger>
            <TabsTrigger 
              value="pending-review" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 text-sm font-medium"
            >
              Pending Review
            </TabsTrigger>
            <TabsTrigger 
              value="orders-calendar" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 text-sm font-medium"
            >
              Orders/Calendar
            </TabsTrigger>
            <TabsTrigger 
              value="client-database" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 text-sm font-medium"
            >
              Client Database
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="active-psw" className="mt-6">
            <ActivePSWTable />
          </TabsContent>

          <TabsContent value="pending-review" className="mt-6">
            <PendingReviewSection />
          </TabsContent>

          <TabsContent value="orders-calendar" className="mt-6">
            <DailyOperationsCalendar />
          </TabsContent>

          <TabsContent value="client-database" className="mt-6">
            <ClientRecordsSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPortal;

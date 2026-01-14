import { useState, useEffect } from "react";
import { Save, LogOut } from "lucide-react";
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
import { PSWOversightSection } from "@/components/admin/PSWOversightSection";
import { PendingPSWSection } from "@/components/admin/PendingPSWSection";
import { DailyOperationsCalendar } from "@/components/admin/DailyOperationsCalendar";
import { ClientRecordsSection } from "@/components/admin/ClientRecordsSection";
import logo from "@/assets/logo.png";

type AdminTab = "active-psws" | "pending-review" | "orders-calendar" | "client-database";

const AdminPortal = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("active-psws");

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
      case "active-psws":
        return "Active PSWs";
      case "pending-review":
        return "Pending Review";
      case "orders-calendar":
        return "Orders / Calendar";
      case "client-database":
        return "Client Database";
      default:
        return "Admin";
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
            <TabsList className="h-12 w-full justify-start gap-1 bg-transparent p-0 rounded-none">
              <TabsTrigger 
                value="active-psws"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6"
              >
                Active PSWs
              </TabsTrigger>
              <TabsTrigger 
                value="pending-review"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6"
              >
                Pending Review
              </TabsTrigger>
              <TabsTrigger 
                value="orders-calendar"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6"
              >
                Orders/Calendar
              </TabsTrigger>
              <TabsTrigger 
                value="client-database"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none h-10 px-4 sm:px-6"
              >
                Client Database
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="flex-1 px-4 lg:px-6 py-6 max-w-6xl mx-auto w-full">
            <TabsContent value="active-psws" className="m-0">
              <PSWOversightSection />
            </TabsContent>
            
            <TabsContent value="pending-review" className="m-0">
              <PendingPSWSection />
            </TabsContent>
            
            <TabsContent value="orders-calendar" className="m-0">
              <DailyOperationsCalendar />
            </TabsContent>
            
            <TabsContent value="client-database" className="m-0">
              <ClientRecordsSection />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPortal;

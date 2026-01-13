import { useState, useEffect } from "react";
import { ArrowLeft, Save, MapPin, AlertCircle, DollarSign, Calendar, Users, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
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
import { BookingManagementSection } from "@/components/admin/BookingManagementSection";
import { PSWOversightSection } from "@/components/admin/PSWOversightSection";
import { RadiusAlertsSection } from "@/components/admin/RadiusAlertsSection";

export const AdminPanel = () => {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("pricing");

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
    const numValue = parseFloat(value) || 2;
    setPricing((prev) => ({
      ...prev,
      minimumHours: numValue,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    savePricing(pricing);
    setHasChanges(false);
    toast.success("Pricing configuration saved successfully!");
  };

  const handleReset = () => {
    setPricing(DEFAULT_PRICING);
    setHasChanges(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Admin Command Center</h1>
                <p className="text-sm text-muted-foreground">Manage pricing, bookings, PSWs & service area</p>
              </div>
            </div>
            {activeTab === "pricing" && (
              <Button 
                variant="brand" 
                onClick={handleSave}
                disabled={!hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="pricing" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="psw" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">PSWs</span>
            </TabsTrigger>
            <TabsTrigger value="radius" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
          </TabsList>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <PricingSection
              pricing={pricing}
              onRateChange={handleRateChange}
              onSurgeChange={handleSurgeChange}
              onMinHoursChange={handleMinHoursChange}
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

            {/* Admin Note */}
            <Card className="shadow-card bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground text-center">
                  <strong className="text-foreground">Client Disclaimer:</strong> "Prices are subject to 
                  final adjustment by admin based on service requirements."
                </p>
              </CardContent>
            </Card>

            {/* Reset Button */}
            <Button variant="outline" onClick={handleReset} className="w-full">
              Reset to Default Pricing
            </Button>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <BookingManagementSection />
          </TabsContent>

          {/* PSW Oversight Tab */}
          <TabsContent value="psw">
            <PSWOversightSection />
          </TabsContent>

          {/* Radius Alerts Tab */}
          <TabsContent value="radius">
            <RadiusAlertsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;

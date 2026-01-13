import { useState } from "react";
import { Plus, Calendar, History, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveCareSection } from "@/components/client/ActiveCareSection";
import { UpcomingBookingsSection } from "@/components/client/UpcomingBookingsSection";
import { PastServicesSection } from "@/components/client/PastServicesSection";
import { ClientBookingFlow } from "@/components/client/ClientBookingFlow";
import logo from "@/assets/logo.png";

// Mock client data - in production, this comes from auth
const mockClient = {
  name: "Sarah Thompson",
  email: "sarah.thompson@email.com",
  phone: "(416) 555-1234",
};

const ClientDashboard = () => {
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  if (showBookingFlow) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 py-6">
          <ClientBookingFlow 
            onBack={() => setShowBookingFlow(false)}
            clientName={mockClient.name}
            clientEmail={mockClient.email}
            clientPhone={mockClient.phone}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSW DIRECT</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24 max-w-md mx-auto">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {mockClient.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your care services
          </p>
        </div>

        {/* Request New Service Button */}
        <Button 
          variant="brand" 
          size="lg" 
          className="w-full h-14 text-base font-semibold shadow-card mb-6"
          onClick={() => setShowBookingFlow(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Request New Service
        </Button>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Active Care Section */}
            <ActiveCareSection clientName={mockClient.name} />

            {/* Upcoming Bookings */}
            <UpcomingBookingsSection />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {/* Past Services with Care Reports */}
            <PastServicesSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientDashboard;

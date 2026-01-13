import { useState } from "react";
import { Plus, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceRequestForm } from "./ServiceRequestForm";

export const BookingsTab = () => {
  const [showRequestForm, setShowRequestForm] = useState(false);

  if (showRequestForm) {
    return <ServiceRequestForm onBack={() => setShowRequestForm(false)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Bookings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Request and manage your care services
        </p>
      </div>

      {/* Request New Service Button */}
      <Button 
        variant="brand" 
        size="lg" 
        className="w-full h-14 text-base font-semibold shadow-card"
        onClick={() => setShowRequestForm(true)}
      >
        <Plus className="w-5 h-5 mr-2" />
        Request New Service
      </Button>

      {/* Recent Bookings Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Recent Requests
        </h3>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Personal Care Assistance</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Jan 20, 2025
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Morning
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                Pending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Companionship Visit</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Jan 18, 2025
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Afternoon
                  </span>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                Confirmed
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

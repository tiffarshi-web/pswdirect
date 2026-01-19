import { useState, useEffect } from "react";
import { Calendar, Clock, DollarSign, FileText, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatServiceType } from "@/lib/businessConfig";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface CareSheet {
  moodOnArrival: string;
  moodOnDeparture: string;
  tasksCompleted: string[];
  observations: string;
  pswFirstName: string;
}

interface PastService {
  id: string;
  service_type: string[];
  scheduled_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  total: number;
  psw_first_name: string | null;
  patient_name: string;
  care_sheet: CareSheet | null;
  care_sheet_psw_name: string | null;
  care_sheet_submitted_at: string | null;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const PastServicesSection = () => {
  const { user } = useSupabaseAuth();
  const [pastServices, setPastServices] = useState<PastService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCareSheet, setSelectedCareSheet] = useState<CareSheet | null>(null);
  const [selectedService, setSelectedService] = useState<PastService | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchPastServices();
    }
  }, [user?.id]);

  const fetchPastServices = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("id, service_type, scheduled_date, start_time, end_time, hours, total, psw_first_name, patient_name, care_sheet, care_sheet_psw_name, care_sheet_submitted_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("scheduled_date", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching past services:", error);
    } else {
      const typedServices = (data || []).map(s => ({
        ...s,
        care_sheet: s.care_sheet as unknown as CareSheet | null,
      }));
      setPastServices(typedServices);
    }
    setLoading(false);
  };

  const viewCareSheet = (service: PastService) => {
    setSelectedService(service);
    setSelectedCareSheet(service.care_sheet);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Past Services
        </h3>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading past services...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pastServices.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Past Services
        </h3>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            No completed services yet. Your care history will appear here after your first visit.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Past Services
      </h3>
      
      {pastServices.map((service) => (
        <Card key={service.id} className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">
                    {service.service_type.map(s => formatServiceType(s)).join(", ")}
                  </p>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                    Completed
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(service.scheduled_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(service.start_time)} - {formatTime(service.end_time)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    ${service.total.toFixed(2)}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Caregiver:</span> {service.psw_first_name || service.care_sheet_psw_name || "Not assigned"}
                </p>
              </div>
              
              {service.care_sheet && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewCareSheet(service)}
                  className="shrink-0"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  View Care Report
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Care Report Dialog */}
      <Dialog open={!!selectedCareSheet} onOpenChange={() => setSelectedCareSheet(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Care Report
            </DialogTitle>
          </DialogHeader>
          
          {selectedCareSheet && selectedService && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-medium text-foreground">{formatDate(selectedService.scheduled_date)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium text-foreground">{selectedService.hours} hours</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Caregiver:</span>
                    <p className="font-medium text-foreground">{selectedCareSheet.pswFirstName || selectedService.care_sheet_psw_name}</p>
                  </div>
                </div>
              </div>

              {/* Patient Status */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Patient Status
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Mood on Arrival</p>
                    <p className="text-sm font-medium text-foreground">{selectedCareSheet.moodOnArrival}</p>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Mood on Departure</p>
                    <p className="text-sm font-medium text-foreground">{selectedCareSheet.moodOnDeparture}</p>
                  </div>
                </div>
              </div>

              {/* Services Provided */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Tasks Completed</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCareSheet.tasksCompleted?.map((task, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {task}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Caregiver Observations</h4>
                <p className="text-sm text-muted-foreground leading-relaxed p-3 bg-muted rounded-lg">
                  {selectedCareSheet.observations || "No observations recorded."}
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg">
                <strong className="text-foreground">Privacy Note:</strong> For caregiver's privacy, 
                only their first name is shown. For any concerns or feedback, please contact the office.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
import { useState } from "react";
import { Calendar, Clock, DollarSign, FileText, User, X } from "lucide-react";
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

interface CareReport {
  pswFirstName: string;
  date: string;
  duration: string;
  servicesProvided: string[];
  notes: string;
  mood: string;
  appetite: string;
  mobility: string;
}

interface PastService {
  id: string;
  serviceType: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  total: number;
  pswFirstName: string;
  patientName: string;
  careReport: CareReport;
}

// Mock past services data
const mockPastServices: PastService[] = [
  {
    id: "PS001",
    serviceType: "personal-care",
    date: "2025-01-10",
    startTime: "09:00",
    endTime: "13:00",
    hours: 4,
    total: 140,
    pswFirstName: "Jennifer",
    patientName: "Margaret Thompson",
    careReport: {
      pswFirstName: "Jennifer",
      date: "2025-01-10",
      duration: "4 hours",
      servicesProvided: ["Bathing assistance", "Dressing", "Medication reminder", "Light meal preparation"],
      notes: "Patient was in good spirits today. Completed all morning routines without issue. Reminded to take afternoon medication at 2pm.",
      mood: "Happy & Engaged",
      appetite: "Good - ate full breakfast",
      mobility: "Stable with walker",
    },
  },
  {
    id: "PS002",
    serviceType: "companionship",
    date: "2025-01-08",
    startTime: "14:00",
    endTime: "17:00",
    hours: 3,
    total: 96,
    pswFirstName: "Amanda",
    patientName: "Margaret Thompson",
    careReport: {
      pswFirstName: "Amanda",
      date: "2025-01-08",
      duration: "3 hours",
      servicesProvided: ["Card games", "Reading together", "Afternoon walk", "Tea time"],
      notes: "Wonderful visit! Patient enjoyed looking through photo albums and sharing stories. We took a short walk in the garden.",
      mood: "Content & Talkative",
      appetite: "Moderate - had tea and biscuits",
      mobility: "Good with supervision",
    },
  },
  {
    id: "PS003",
    serviceType: "meal-prep",
    date: "2025-01-05",
    startTime: "11:00",
    endTime: "14:00",
    hours: 3,
    total: 90,
    pswFirstName: "Patricia",
    patientName: "Margaret Thompson",
    careReport: {
      pswFirstName: "Patricia",
      date: "2025-01-05",
      duration: "3 hours",
      servicesProvided: ["Lunch preparation", "Meal portioning for week", "Kitchen organization", "Grocery list creation"],
      notes: "Prepared several meals for the week including soups and casseroles. All meals labeled and stored properly. Created a grocery list for next week.",
      mood: "Appreciative",
      appetite: "Good - enjoyed fresh lunch",
      mobility: "Limited - stayed seated",
    },
  },
  {
    id: "PS004",
    serviceType: "medication",
    date: "2025-01-03",
    startTime: "08:00",
    endTime: "10:00",
    hours: 2,
    total: 70,
    pswFirstName: "Jennifer",
    patientName: "Margaret Thompson",
    careReport: {
      pswFirstName: "Jennifer",
      date: "2025-01-03",
      duration: "2 hours",
      servicesProvided: ["Morning medication", "Blood pressure check", "Pill organizer setup", "Pharmacy coordination"],
      notes: "Organized weekly pill organizer. Blood pressure was 128/82. Contacted pharmacy regarding upcoming prescription refill.",
      mood: "Calm",
      appetite: "Light - had toast",
      mobility: "Steady in morning",
    },
  },
];

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
  const [selectedReport, setSelectedReport] = useState<CareReport | null>(null);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Past Services
      </h3>
      
      {mockPastServices.map((service) => (
        <Card key={service.id} className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">
                    {formatServiceType(service.serviceType)}
                  </p>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                    Completed
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(service.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(service.startTime)} - {formatTime(service.endTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    ${service.total.toFixed(2)}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Caregiver:</span> {service.pswFirstName}
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReport(service.careReport)}
                className="shrink-0"
              >
                <FileText className="w-4 h-4 mr-1" />
                View Care Report
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Care Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Care Report
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-medium text-foreground">{formatDate(selectedReport.date)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium text-foreground">{selectedReport.duration}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Caregiver:</span>
                    <p className="font-medium text-foreground">{selectedReport.pswFirstName}</p>
                  </div>
                </div>
              </div>

              {/* Patient Status */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Patient Status
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Mood</p>
                    <p className="text-sm font-medium text-foreground">{selectedReport.mood}</p>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Appetite</p>
                    <p className="text-sm font-medium text-foreground">{selectedReport.appetite}</p>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Mobility</p>
                    <p className="text-sm font-medium text-foreground">{selectedReport.mobility}</p>
                  </div>
                </div>
              </div>

              {/* Services Provided */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Services Provided</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.servicesProvided.map((service, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Caregiver Notes</h4>
                <p className="text-sm text-muted-foreground leading-relaxed p-3 bg-muted rounded-lg">
                  {selectedReport.notes}
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

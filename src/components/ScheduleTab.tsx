import { useState } from "react";
import { Clock, MapPin, User, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShiftDetails } from "./ShiftDetails";

interface Shift {
  id: string;
  clientName: string;
  date: string;
  time: string;
  location: string;
  status: "confirmed" | "pending";
}

const upcomingShifts: Shift[] = [
  {
    id: "1",
    clientName: "Margaret Thompson",
    date: "Today",
    time: "9:00 AM - 1:00 PM",
    location: "123 Maple Street, Toronto",
    status: "confirmed",
  },
  {
    id: "2",
    clientName: "Robert Chen",
    date: "Today",
    time: "2:30 PM - 6:30 PM",
    location: "456 Oak Avenue, Toronto",
    status: "confirmed",
  },
  {
    id: "3",
    clientName: "Dorothy Williams",
    date: "Tomorrow",
    time: "8:00 AM - 12:00 PM",
    location: "789 Pine Road, Mississauga",
    status: "pending",
  },
  {
    id: "4",
    clientName: "James Miller",
    date: "Jan 15",
    time: "10:00 AM - 2:00 PM",
    location: "321 Elm Street, Brampton",
    status: "confirmed",
  },
];

export const ScheduleTab = () => {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  if (selectedShift) {
    return (
      <ShiftDetails 
        shift={selectedShift} 
        onBack={() => setSelectedShift(null)} 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Upcoming Shifts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your scheduled visits for the next few days
        </p>
      </div>

      <div className="space-y-3">
        {upcomingShifts.map((shift) => (
          <Card 
            key={shift.id} 
            className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
            onClick={() => setSelectedShift(shift)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{shift.clientName}</h3>
                    <p className="text-sm text-muted-foreground">{shift.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={shift.status === "confirmed" ? "default" : "secondary"}
                    className={shift.status === "confirmed" ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}
                  >
                    {shift.status === "confirmed" ? "Confirmed" : "Pending"}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{shift.time}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{shift.location}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

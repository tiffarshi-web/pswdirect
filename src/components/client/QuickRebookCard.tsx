import { Calendar, MapPin, RefreshCw, Settings2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatServiceType } from "@/lib/businessConfig";
import type { Booking } from "@/hooks/useClientBookings";

interface QuickRebookCardProps {
  lastBooking: Booking;
  onRebookLast: (booking: Booking) => void;
  onChangeDetails: (booking: Booking) => void;
}

export const QuickRebookCard = ({ lastBooking, onRebookLast, onChangeDetails }: QuickRebookCardProps) => {
  const services = lastBooking.service_type || [];
  const joined = services.join(" ").toLowerCase();

  let suggestion = "Book again for ongoing support";
  if (joined.includes("doctor") || joined.includes("escort")) {
    suggestion = "Need another appointment visit?";
  } else if (joined.includes("hospital") || joined.includes("discharge")) {
    suggestion = "Need follow-up home care?";
  }

  return (
    <Card className="shadow-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Quick Rebook
          </h3>
          <Badge variant="secondary" className="text-xs">{suggestion}</Badge>
        </div>

        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-foreground">
            {services.map((s) => formatServiceType(s)).join(", ")}
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{lastBooking.patient_name}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{lastBooking.client_address}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Last visit {new Date(lastBooking.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="brand" size="sm" onClick={() => onRebookLast(lastBooking)}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Rebook Last Visit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onChangeDetails(lastBooking)}>
            <Settings2 className="w-4 h-4 mr-1.5" />
            Change Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

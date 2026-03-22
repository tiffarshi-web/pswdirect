import { User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceForType } from "./types";

interface StepWhoIsThisForProps {
  onSelect: (type: ServiceForType) => void;
}

export const StepWhoIsThisFor = ({ onSelect }: StepWhoIsThisForProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Who is this order for?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5"
          onClick={() => onSelect("myself")}
        >
          <User className="w-6 h-6 text-primary" />
          <span className="font-medium">Myself</span>
          <span className="text-xs text-muted-foreground">I need care services</span>
        </Button>
        <Button
          variant="outline"
          className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5"
          onClick={() => onSelect("someone-else")}
        >
          <Users className="w-6 h-6 text-primary" />
          <span className="font-medium">A Family Member</span>
          <span className="text-xs text-muted-foreground">Booking for a family member or friend</span>
        </Button>
      </CardContent>
    </Card>
  );
};

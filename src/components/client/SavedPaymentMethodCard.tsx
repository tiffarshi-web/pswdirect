import { CreditCard, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSavedPaymentMethod } from "@/hooks/useSavedPaymentMethod";

export const SavedPaymentMethodCard = () => {
  const { savedMethod, isLoading } = useSavedPaymentMethod();

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading payment info...</span>
        </CardContent>
      </Card>
    );
  }

  if (!savedMethod) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-full">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No payment method saved</p>
              <p className="text-xs text-muted-foreground">A card will be saved after your first booking</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Card ending in {savedMethod.last4}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {savedMethod.brand}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
            Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

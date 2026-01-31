// Client-facing banner showing PSW proximity notification
// Displays when PSW is within 500m of the service address

import { useState, useEffect } from "react";
import { Car, MapPin, X, CheckCircle2, Navigation } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useProximityAlert } from "@/hooks/useProximityAlert";

interface ProximityAlertBannerProps {
  bookingId: string;
  clientAddress: string;
  pswName?: string;
  onDismiss?: () => void;
}

export const ProximityAlertBanner = ({
  bookingId,
  clientAddress,
  pswName = "Your PSW",
  onDismiss,
}: ProximityAlertBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const {
    isWithinProximity,
    distanceFormatted,
    hasAlerted,
    isLoading,
    clientCoords,
  } = useProximityAlert({
    bookingId,
    clientAddress,
    proximityThresholdMeters: 500,
    enabled: !isDismissed,
  });

  // Trigger animation when PSW enters proximity
  useEffect(() => {
    if (isWithinProximity && hasAlerted && !isDismissed) {
      setShowAnimation(true);
      
      // Auto-dismiss animation class after delay
      const timer = setTimeout(() => setShowAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isWithinProximity, hasAlerted, isDismissed]);

  // Don't show if dismissed, still loading, or not within proximity
  if (isDismissed || isLoading || !isWithinProximity || !clientCoords) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert
      className={`
        border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800
        ${showAnimation ? "animate-pulse ring-2 ring-emerald-400" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {pswName} is Almost There!
          </AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-300 mt-1">
            <div className="flex items-center gap-1.5 text-sm">
              <Navigation className="w-3.5 h-3.5" />
              <span>
                Currently <strong>{distanceFormatted}</strong> away from your location
              </span>
            </div>
            <p className="text-xs mt-1 opacity-80">
              They should arrive within a few minutes
            </p>
          </AlertDescription>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Alert>
  );
};

export default ProximityAlertBanner;

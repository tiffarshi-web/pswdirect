import { useEffect, useState } from "react";
import { DollarSign, Lock, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EARNINGS_UNAVAILABLE, ONTARIO_PSW_RATE_CENTS } from "@/lib/pswPay";
import { fetchHistoricalStaffPayRates, type StaffPayRates } from "@/lib/payrollStore";

/**
 * Read-only caregiver pay scale.
 *
 * There is exactly ONE approved Ontario PSW rate and it lives in the backend
 * approved-rate table. Service-specific caregiver rates (Hospital Visit /
 * Doctor Visit) are retired: they are shown only as inactive historical data
 * and no longer feed any booking, trigger, payroll or display calculation.
 */
export const StaffPayScaleSection = () => {
  const [historical, setHistorical] = useState<StaffPayRates | null>(null);

  useEffect(() => {
    fetchHistoricalStaffPayRates().then(setHistorical);
  }, []);

  const approved = (ONTARIO_PSW_RATE_CENTS / 100).toFixed(2);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Caregiver Pay Scale
        </CardTitle>
        <CardDescription>
          One approved rate applies to every eligible Ontario PSW visit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-base font-medium text-foreground">
                Ontario PSW — approved rate
              </p>
              <p className="text-sm text-muted-foreground">
                Requested booking hours × ${approved} per hour. Home care, doctor escort
                and hospital discharge visits all pay the same approved rate.
              </p>
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">${approved}/hr</p>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Caregiver pay is calculated only from the hours the client requested and the
            approved rate. Clocked time, GPS, care-sheet times, travel, premiums, tips,
            taxes and the client price never change it. Rates for nurses and Alberta
            provider types are set under “Approved caregiver pay rates”; any provider type
            left unset shows “{EARNINGS_UNAVAILABLE}”.
          </p>
        </div>

        {historical && (
          <div className="p-4 border border-border rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Retired service-specific rates
              </p>
              <Badge variant="outline">Inactive historical data</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Kept as audit evidence only. These values are not used by any booking,
              payroll or payment calculation.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <div className="p-2 bg-muted/50 rounded">
                <p className="text-sm font-medium line-through text-muted-foreground">
                  ${historical.standardHomeCare.toFixed(2)}
                </p>
                <p className="text-[11px] text-muted-foreground">Home Care (retired)</p>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <p className="text-sm font-medium line-through text-muted-foreground">
                  ${historical.hospitalVisit.toFixed(2)}
                </p>
                <p className="text-[11px] text-muted-foreground">Hospital (retired)</p>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <p className="text-sm font-medium line-through text-muted-foreground">
                  ${historical.doctorVisit.toFixed(2)}
                </p>
                <p className="text-[11px] text-muted-foreground">Doctor (retired)</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

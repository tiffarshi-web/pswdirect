// Unified Payroll Section — combines Payout Requests, Shift Earnings, and Accounting
// into a single admin tab with sub-tabs.

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, DollarSign, Calculator } from "lucide-react";
import { PayoutQueueSection } from "./PayoutQueueSection";
import { PayrollDashboardSection } from "./PayrollDashboardSection";
import { AccountingDashboardSection } from "./AccountingDashboardSection";

export const UnifiedPayrollSection = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Payroll & Payouts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage payout requests, shift earnings, and accounting in one place.
        </p>
      </div>

      <Tabs defaultValue="payout-requests" className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="payout-requests" className="gap-1.5">
            <Banknote className="w-4 h-4" />
            Payout Requests
          </TabsTrigger>
          <TabsTrigger value="shift-earnings" className="gap-1.5">
            <DollarSign className="w-4 h-4" />
            Shift Earnings
          </TabsTrigger>
          <TabsTrigger value="accounting" className="gap-1.5">
            <Calculator className="w-4 h-4" />
            Accounting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payout-requests" className="mt-4">
          <PayoutQueueSection />
        </TabsContent>

        <TabsContent value="shift-earnings" className="mt-4">
          <PayrollDashboardSection />
        </TabsContent>

        <TabsContent value="accounting" className="mt-4">
          <AccountingDashboardSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Unified Payroll Section — combines Payout Requests, Shift Earnings, and Accounting
// into a single admin tab with sub-tabs.

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Banknote, DollarSign, Calculator, AlertTriangle } from "lucide-react";
import { PayoutQueueSection } from "./PayoutQueueSection";
import { PayrollDashboardSection } from "./PayrollDashboardSection";
import { AccountingDashboardSection } from "./AccountingDashboardSection";
import { FlaggedReviewSection } from "./FlaggedReviewSection";
import { supabase } from "@/integrations/supabase/client";

export const UnifiedPayrollSection = () => {
  const [flaggedCount, setFlaggedCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("payroll_entries")
        .select("id", { count: "exact", head: true })
        .eq("requires_admin_review", true);
      setFlaggedCount(count ?? 0);
    };
    load();
    const channel = supabase
      .channel("payroll-flagged-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "payroll_entries" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Payroll & Payouts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage payout requests, shift earnings, accounting, and flagged reviews.
        </p>
      </div>

      <Tabs defaultValue={flaggedCount > 0 ? "flagged" : "payout-requests"} className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1 flex-wrap h-auto">
          <TabsTrigger value="flagged" className="gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Flagged for Review
            {flaggedCount > 0 && (
              <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-800 border-amber-300 h-5 px-1.5">
                {flaggedCount}
              </Badge>
            )}
          </TabsTrigger>
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

        <TabsContent value="flagged" className="mt-4">
          <FlaggedReviewSection />
        </TabsContent>

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

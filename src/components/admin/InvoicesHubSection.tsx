// Wrap Invoice Management with sub-tabs for Invoices + Adjustment Charges.
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InvoiceManagementSection } from "./InvoiceManagementSection";
import { BillingAdjustmentsSection } from "./BillingAdjustmentsSection";
import { supabase } from "@/integrations/supabase/client";

export const InvoicesHubSection = () => {
  const [needsActionCount, setNeedsActionCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("bookings")
        .select("id", { head: true, count: "exact" })
        .eq("billing_adjustment_required", true);
      if (!cancelled) setNeedsActionCount(count || 0);
    };
    load();
    const channel = supabase
      .channel("billing-adjustments-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: "billing_adjustment_required=eq.true" }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  return (
    <Tabs defaultValue="invoices" className="w-full">
      <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1">
        <TabsTrigger value="invoices" className="gap-1.5">
          <FileText className="w-4 h-4" />
          Invoices
        </TabsTrigger>
        <TabsTrigger value="adjustments" className="gap-1.5">
          <Receipt className="w-4 h-4" />
          Adjustment Charges
          {needsActionCount > 0 && (
            <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5">
              {needsActionCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="invoices" className="mt-4">
        <InvoiceManagementSection />
      </TabsContent>
      <TabsContent value="adjustments" className="mt-4">
        <BillingAdjustmentsSection />
      </TabsContent>
    </Tabs>
  );
};

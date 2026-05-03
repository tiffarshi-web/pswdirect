// Unified Orders Section — combines Calendar, Statistics, Order List, and the
// Payment Recovery Queue into a single admin tab with sub-tabs.

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BarChart3, List, AlertCircle, DollarSign, AlertTriangle } from "lucide-react";
import { DailyOperationsCalendar } from "./DailyOperationsCalendar";
import { OrderStatisticsSection } from "./OrderStatisticsSection";
import { OrderListSection } from "./OrderListSection";
import { RecoveryQueueSection } from "./RecoveryQueueSection";
import { RefundDecisionsSection } from "./RefundDecisionsSection";
import { IncompletePaymentsSection } from "./IncompletePaymentsSection";

export const UnifiedOrdersSection = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Orders & Operations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Daily calendar, statistics, full order list, and payment recovery queue.
        </p>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1 flex-wrap h-auto">
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="statistics" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="order-list" className="gap-1.5">
            <List className="w-4 h-4" />
            Order List
          </TabsTrigger>
          <TabsTrigger value="recovery" className="gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Recovery Queue
          </TabsTrigger>
          <TabsTrigger value="incomplete" className="gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Incomplete Payments
          </TabsTrigger>
          <TabsTrigger value="refunds" className="gap-1.5">
            <DollarSign className="w-4 h-4" />
            Refund Decisions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <DailyOperationsCalendar />
        </TabsContent>

        <TabsContent value="statistics" className="mt-4">
          <OrderStatisticsSection />
        </TabsContent>

        <TabsContent value="order-list" className="mt-4">
          <OrderListSection />
        </TabsContent>

        <TabsContent value="recovery" className="mt-4">
          <RecoveryQueueSection />
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          <RefundDecisionsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

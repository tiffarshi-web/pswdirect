// Unified Orders Section — combines Calendar, Statistics, and Order List
// into a single admin tab with sub-tabs.

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BarChart3, List } from "lucide-react";
import { DailyOperationsCalendar } from "./DailyOperationsCalendar";
import { OrderStatisticsSection } from "./OrderStatisticsSection";
import { OrderListSection } from "./OrderListSection";

export const UnifiedOrdersSection = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Orders & Operations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Daily calendar, statistics, and full order list.
        </p>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1">
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
      </Tabs>
    </div>
  );
};

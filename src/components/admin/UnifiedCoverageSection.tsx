import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, Radar, Activity } from "lucide-react";
import { PSWCoverageMapView } from "./PSWCoverageMapView";
import { PSWCoverageDiagnostics } from "./PSWCoverageDiagnostics";
import { ActiveShiftsMapView } from "./ActiveShiftsMapView";

/**
 * Unified Coverage section — merges the former "PSW Coverage" and "Live Map"
 * top-level admin tabs into a single area with sub-tabs.
 *
 * Sub-tabs:
 *  1. Live Map        — real-time active shift positions (ActiveShiftsMapView)
 *  2. Coverage Radius — dispatch radius slider + diagnostics (PSWCoverageMapView + PSWCoverageDiagnostics)
 */
export const UnifiedCoverageSection = () => {
  return (
    <Tabs defaultValue="live-map" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="live-map" className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span>Live Map</span>
        </TabsTrigger>
        <TabsTrigger value="coverage-radius" className="flex items-center gap-2">
          <Radar className="w-4 h-4" />
          <span>PSW Coverage & Radius</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="live-map" className="m-0">
        <ActiveShiftsMapView />
      </TabsContent>

      <TabsContent value="coverage-radius" className="m-0 space-y-6">
        <PSWCoverageDiagnostics />
        <PSWCoverageMapView />
      </TabsContent>
    </Tabs>
  );
};

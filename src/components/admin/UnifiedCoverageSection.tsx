import { PSWCoverageDiagnostics } from "./PSWCoverageDiagnostics";
import { UnifiedAdminMap } from "./UnifiedAdminMap";

/**
 * Unified Coverage section — single Admin Coverage & Orders Map.
 *
 * Replaces the former two-tab experience ("Live Map" + "PSW Coverage & Radius")
 * with one map that shows PSWs, open/pending/assigned/active/unserved/completed
 * orders, per-city supply & demand, and per-PSW radius circles. Diagnostics for
 * PSWs missing coordinates are kept above the map so admins can heal data.
 */
export const UnifiedCoverageSection = () => {
  return (
    <div className="space-y-6">
      <PSWCoverageDiagnostics />
      <UnifiedAdminMap />
    </div>
  );
};

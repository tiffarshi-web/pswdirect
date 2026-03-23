// Legacy AvailableShiftsTab - redirects to PSWAvailableJobsTab
// This component used localStorage-based shifts which are now deprecated.
// The real implementation is in PSWAvailableJobsTab which uses Supabase.

import { PSWAvailableJobsTab } from "./PSWAvailableJobsTab";

export const AvailableShiftsTab = () => {
  return <PSWAvailableJobsTab />;
};

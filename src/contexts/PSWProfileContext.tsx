import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPSWProfileByIdFromDB,
  getPSWProfileByEmailFromDB,
  type PSWProfile,
} from "@/lib/pswDatabaseStore";

/**
 * Shared PSW profile source. Hoists the psw_profiles lookup out of individual
 * dashboard tabs (PSWDashboard, PSWEarningsTab, PSWAvailableJobsTab,
 * PSWProfileTab, PSWCareSheetsTab, EarningsSnapshotWidget) so we make ONE
 * fetch per session instead of five parallel queries every time the user
 * switches tabs.
 *
 * The context does NOT own the vetting-status decision — that stays with
 * checkPSWApproval in the dashboard. It only exposes the row so tabs can
 * read pswId, homeCity, homeLat/Lng, languages, etc.
 */

interface PSWProfileContextValue {
  profile: PSWProfile | null;
  pswId: string | undefined;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PSWProfileContext = createContext<PSWProfileContextValue | undefined>(undefined);

export function PSWProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PSWProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      let p: PSWProfile | null = null;
      if (user?.id) p = await getPSWProfileByIdFromDB(user.id);
      if (!p && user?.email) p = await getPSWProfileByEmailFromDB(user.email);
      setProfile(p);
    } catch (e) {
      console.warn("[PSWProfileContext] fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return (
    <PSWProfileContext.Provider
      value={{ profile, pswId: profile?.id, loading, refresh: load }}
    >
      {children}
    </PSWProfileContext.Provider>
  );
}

export function usePSWProfileContext(): PSWProfileContextValue {
  const ctx = useContext(PSWProfileContext);
  if (!ctx) {
    // Safe fallback — tabs used outside the dashboard (rare) still work.
    return { profile: null, pswId: undefined, loading: false, refresh: async () => {} };
  }
  return ctx;
}

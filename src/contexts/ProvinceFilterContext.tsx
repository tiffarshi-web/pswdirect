import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { LEGACY_PROVINCE_CODE, recordInProvince } from "@/lib/provinceScope";

/** "all" is still accepted for backwards compatibility; the UI selects one province. */
export type ProvinceFilter = "all" | string;

const STORAGE_KEY = "admin.selectedProvince";

interface ProvinceFilterValue {
  province: ProvinceFilter;
  setProvince: (p: ProvinceFilter) => void;
  /** True when a record in this province should be shown under the filter. */
  matches: (recordProvince?: string | null) => boolean;
  /** Province code to apply to a Supabase query, or null for All Provinces. */
  eqValue: string | null;
}

const Ctx = createContext<ProvinceFilterValue | null>(null);

const initialProvince = (): string => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && /^[A-Z]{2}$/.test(saved)) return saved;
  } catch { /* ignore */ }
  return LEGACY_PROVINCE_CODE;
};

export const ProvinceFilterProvider = ({ children }: { children: ReactNode }) => {
  const [province, setProvinceState] = useState<ProvinceFilter>(initialProvince);

  const value = useMemo<ProvinceFilterValue>(() => {
    const eqValue = province === "all" ? null : province.toUpperCase();
    return {
      province,
      setProvince: (p) => {
        setProvinceState(p);
        try { window.localStorage.setItem(STORAGE_KEY, p); } catch { /* ignore */ }
      },
      matches: (recordProvince) => recordInProvince(recordProvince, eqValue),
      eqValue,
    };
  }, [province]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

/** Safe outside the provider (defaults to All Provinces). */
export const useProvinceFilter = (): ProvinceFilterValue => {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  return { province: "all", setProvince: () => undefined, matches: () => true, eqValue: null };
};

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** "all" = All Provinces, otherwise a province code such as "ON" or "AB". */
export type ProvinceFilter = "all" | string;

interface ProvinceFilterValue {
  province: ProvinceFilter;
  setProvince: (p: ProvinceFilter) => void;
  /** True when a record in this province should be shown under the filter. */
  matches: (recordProvince?: string | null) => boolean;
  /** Province code to apply to a Supabase `.eq()`, or null for All Provinces. */
  eqValue: string | null;
}

const Ctx = createContext<ProvinceFilterValue | null>(null);

export const ProvinceFilterProvider = ({ children }: { children: ReactNode }) => {
  const [province, setProvince] = useState<ProvinceFilter>("all");

  const value = useMemo<ProvinceFilterValue>(
    () => ({
      province,
      setProvince,
      matches: (recordProvince) =>
        province === "all" || (recordProvince || "ON").toUpperCase() === province,
      eqValue: province === "all" ? null : province,
    }),
    [province],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

/** Safe outside the provider (defaults to All Provinces). */
export const useProvinceFilter = (): ProvinceFilterValue => {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  return {
    province: "all",
    setProvince: () => undefined,
    matches: () => true,
    eqValue: null,
  };
};

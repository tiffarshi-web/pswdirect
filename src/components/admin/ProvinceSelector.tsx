import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProvinceFilter } from "@/contexts/ProvinceFilterContext";
import { fetchProvinces, type ProvinceConfig } from "@/lib/provinceConfig";

/**
 * All Provinces / Ontario / Alberta selector for the admin dashboard.
 * The selection is shared through ProvinceFilterContext and applied by
 * workers, applications, orders, coverage, pricing, payouts, documents,
 * incidents and reports.
 */
export const ProvinceSelector = () => {
  const { province, setProvince } = useProvinceFilter();
  const [options, setOptions] = useState<ProvinceConfig[]>([]);

  useEffect(() => {
    fetchProvinces().then((all) =>
      setOptions(Object.values(all).filter((p) => p.isActive).sort((a, b) => a.name.localeCompare(b.name))),
    );
  }, []);

  return (
    <Select value={province} onValueChange={setProvince}>
      <SelectTrigger className="h-9 w-[160px]" aria-label="Province filter">
        <SelectValue placeholder="All Provinces" />
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        <SelectItem value="all">All Provinces</SelectItem>
        {options.map((p) => (
          <SelectItem key={p.code} value={p.code}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

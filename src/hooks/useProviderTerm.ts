/**
 * Worker wording for the province currently selected in the admin top bar.
 *
 * Ontario  -> "PSW" / "Personal Support Worker"
 * Alberta  -> "HCA" / "Health Care Aide"
 * Future provinces resolve straight from the provinces configuration, so no
 * code change is needed when a province is added.
 *
 * Nurses and other provider types keep their own designations — this hook only
 * supplies the province's DEFAULT support-worker title.
 */
import { useEffect, useState } from "react";
import { useProvinceFilter } from "@/contexts/ProvinceFilterContext";
import {
  DEFAULT_PROVINCES,
  DEFAULT_PROVINCE_CODE,
  fetchProvinces,
  type ProvinceConfig,
} from "@/lib/provinceConfig";

export interface ProviderTerm {
  /** e.g. "PSW" or "HCA" */
  short: string;
  /** e.g. "Personal Support Worker" or "Health Care Aide" */
  long: string;
  /** e.g. "PSWs" / "HCAs" */
  plural: string;
  /** Default provider type code for the province, e.g. "PSW" / "HCA". */
  providerType: string;
  /** Every provider type the province supports, e.g. ["HCA","LPN","RN"]. */
  providerTypes: string[];
  /** Resolved province code. */
  provinceCode: string;
  /** Province display name. */
  provinceName: string;
  /** Registration wording, e.g. "Alberta HCA registration / practice permit number". */
  registrationLabel: string | null;
  registrationRequired: boolean;
  config: ProvinceConfig | null;
}

const build = (cfg: ProvinceConfig | null, fallbackCode: string): ProviderTerm => {
  const resolved = cfg ?? DEFAULT_PROVINCES[fallbackCode] ?? DEFAULT_PROVINCES[DEFAULT_PROVINCE_CODE];
  return {
    short: resolved.providerTermShort,
    long: resolved.providerTermLong,
    plural: `${resolved.providerTermShort}s`,
    providerType: resolved.providerType,
    providerTypes: resolved.providerTypes,
    provinceCode: resolved.code,
    provinceName: resolved.name,
    registrationLabel: resolved.registrationLabel ?? null,
    registrationRequired: resolved.registrationRequired,
    config: resolved,
  };
};

/** Worker title for the admin's currently selected province. */
export const useProviderTerm = (): ProviderTerm => {
  const { province } = useProvinceFilter();
  const code = (province === "all" ? DEFAULT_PROVINCE_CODE : province).toUpperCase();
  const [cfg, setCfg] = useState<ProvinceConfig | null>(DEFAULT_PROVINCES[code] ?? null);

  useEffect(() => {
    let active = true;
    fetchProvinces().then((all) => {
      if (active) setCfg(all[code] ?? DEFAULT_PROVINCES[code] ?? null);
    });
    return () => {
      active = false;
    };
  }, [code]);

  return build(cfg, code);
};

/** Title for a specific provider type; nurses keep their own designation. */
export const providerTypeLabel = (
  providerType: string | null | undefined,
  term: ProviderTerm,
): string => {
  const code = (providerType || "").trim().toUpperCase();
  if (!code) return term.short;
  const NURSE_TITLES: Record<string, string> = {
    RN: "Registered Nurse (RN)",
    RPN: "Registered Practical Nurse (RPN)",
    LPN: "Licensed Practical Nurse (LPN)",
    NP: "Nurse Practitioner (NP)",
  };
  if (NURSE_TITLES[code]) return NURSE_TITLES[code];
  if (code === term.providerType) return `${term.long} (${term.short})`;
  if (code === "PSW") return "Personal Support Worker (PSW)";
  if (code === "HCA") return "Health Care Aide (HCA)";
  return code;
};

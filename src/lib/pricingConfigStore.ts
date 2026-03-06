// Pricing Config Store — Single source of truth for client pricing rates
// Stored in app_settings DB table (key: "category_rates")
// localStorage used only as fast cache.

import { supabase } from "@/integrations/supabase/client";
import type { ServiceCategory } from "./taskConfig";

export interface CategoryRateConfig {
  firstHour: number;
  per30Min: number;
}

export interface PricingRatesConfig {
  standard: CategoryRateConfig;
  "doctor-appointment": CategoryRateConfig;
  "hospital-discharge": CategoryRateConfig;
  minimumBookingFee: number;
}

// Default values — used only as last-resort fallback
const DEFAULT_PRICING_RATES: PricingRatesConfig = {
  standard:            { firstHour: 30, per30Min: 15 },
  "doctor-appointment": { firstHour: 35, per30Min: 17.50 },
  "hospital-discharge": { firstHour: 40, per30Min: 20 },
  minimumBookingFee: 30,
};

const CACHE_KEY = "pswdirect_category_rates";
const DB_SETTING_KEY = "category_rates";

// ── Synchronous cache read (for immediate use in calculations) ──
export const getCategoryRates = (): PricingRatesConfig => {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_PRICING_RATES, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_PRICING_RATES;
    }
  }
  return DEFAULT_PRICING_RATES;
};

// ── Helper: get rates for a specific service category ──
export const getRatesForCategory = (category: ServiceCategory): CategoryRateConfig => {
  const config = getCategoryRates();
  return config[category] || config.standard;
};

// ── Async DB fetch + cache update ──
export const fetchPricingRatesFromDB = async (): Promise<PricingRatesConfig> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", DB_SETTING_KEY)
      .maybeSingle();

    if (error) {
      console.error("Error fetching pricing rates:", error);
      return getCategoryRates();
    }

    if (data?.setting_value) {
      const rates = JSON.parse(data.setting_value) as PricingRatesConfig;
      const merged = { ...DEFAULT_PRICING_RATES, ...rates };
      localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      return merged;
    }

    // No DB entry yet — seed it with defaults
    await savePricingRates(DEFAULT_PRICING_RATES);
    return DEFAULT_PRICING_RATES;
  } catch (err) {
    console.error("Error fetching pricing rates:", err);
    return getCategoryRates();
  }
};

// ── Save to DB + cache ──
export const savePricingRates = async (rates: PricingRatesConfig): Promise<boolean> => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(rates));

  try {
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { setting_key: DB_SETTING_KEY, setting_value: JSON.stringify(rates), updated_at: new Date().toISOString() },
        { onConflict: "setting_key" }
      );

    if (error) {
      console.error("Error saving pricing rates:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error saving pricing rates:", err);
    return false;
  }
};

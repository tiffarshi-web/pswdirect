// Rush (ASAP) pricing sync — DISPLAY ONLY.
//
// The authoritative rush fee is computed server-side in
// `supabase/functions/create-booking/index.ts` from `app_settings`
// (`asap_pricing_enabled`, `asap_multiplier`). This module keeps the browser's
// cached pricing config in sync with those same DB values so the quote the
// client sees matches what the server charges.

import { supabase } from "@/integrations/supabase/client";

export interface RushConfig {
  enabled: boolean;
  multiplier: number;
}

const STORAGE_KEY = "adminPricing";

/** Fetch the live rush settings from the database and cache them for display. */
export const syncRushPricingFromDB = async (): Promise<RushConfig | null> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["asap_pricing_enabled", "asap_multiplier"]);

    if (error || !data) return null;

    const map: Record<string, string> = {};
    data.forEach((row: { setting_key: string; setting_value: string }) => {
      map[row.setting_key] = row.setting_value;
    });

    if (map["asap_multiplier"] === undefined && map["asap_pricing_enabled"] === undefined) {
      return null;
    }

    const parsedMultiplier = Number(map["asap_multiplier"]);
    const config: RushConfig = {
      enabled: map["asap_pricing_enabled"] !== "false",
      multiplier:
        isFinite(parsedMultiplier) && parsedMultiplier >= 1 && parsedMultiplier <= 3
          ? parsedMultiplier
          : 1.25,
    };

    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      existing = {};
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...existing,
        asapPricingEnabled: config.enabled,
        asapMultiplier: config.multiplier,
      })
    );

    return config;
  } catch {
    return null;
  }
};

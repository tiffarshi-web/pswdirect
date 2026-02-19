// Developer Configuration Store
// Controls development mode settings and authentication bypasses
// PRODUCTION KILL SWITCH: Forces live auth on production domain

// Production domain check - hard-coded for safety
const PRODUCTION_DOMAIN = "psadirect.ca";

export interface DevConfig {
  // When true, enables live authentication (production mode)
  liveAuthEnabled: boolean;
  // Current dev role for bypass (only used when liveAuthEnabled is false)
  devRole: "admin" | "psw" | "client" | null;
}

const DEFAULT_DEV_CONFIG: DevConfig = {
  liveAuthEnabled: false,
  devRole: null,
};

// Check if we're on the production domain
export const isProductionDomain = (): boolean => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  return hostname === PRODUCTION_DOMAIN || hostname === `www.${PRODUCTION_DOMAIN}`;
};

// KILL DEV: Clear all dev mode keys from localStorage on production
export const killDevModeOnProduction = (): void => {
  if (isProductionDomain()) {
    // Clear all dev-related localStorage keys
    const devKeys = [
      "pswdirect_dev_config",
      "stripe_dry_run",
      "devMode",
      "showDebugMenu",
      "isDebug",
      "dev_mode",
    ];
    devKeys.forEach(key => localStorage.removeItem(key));
    console.log("🔒 Production mode: Dev keys cleared");
  }
};

// Get dev config from localStorage
// On production, ALWAYS returns live auth enabled
export const getDevConfig = (): DevConfig => {
  // KILL SWITCH: Force live auth on production
  if (isProductionDomain()) {
    return {
      liveAuthEnabled: true,
      devRole: null,
    };
  }

  const stored = localStorage.getItem("pswdirect_dev_config");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_DEV_CONFIG;
    }
  }
  return DEFAULT_DEV_CONFIG;
};

// Save dev config to localStorage
// BLOCKED on production domain
export const saveDevConfig = (config: Partial<DevConfig>): DevConfig => {
  // Block saving on production
  if (isProductionDomain()) {
    console.warn("🔒 Dev config changes blocked on production");
    return getDevConfig();
  }

  const current = getDevConfig();
  const updated = { ...current, ...config };
  localStorage.setItem("pswdirect_dev_config", JSON.stringify(updated));
  return updated;
};

// Toggle live authentication mode
// BLOCKED on production domain
export const toggleLiveAuth = (enabled: boolean): DevConfig => {
  if (isProductionDomain()) {
    return { liveAuthEnabled: true, devRole: null };
  }
  return saveDevConfig({ liveAuthEnabled: enabled });
};

// Set dev role for bypass
// BLOCKED on production domain
export const setDevRole = (role: "admin" | "psw" | "client" | null): DevConfig => {
  if (isProductionDomain()) {
    return { liveAuthEnabled: true, devRole: null };
  }
  return saveDevConfig({ devRole: role });
};

// Check if we're in development bypass mode
// ALWAYS false on production
export const isDevBypassMode = (): boolean => {
  if (isProductionDomain()) return false;
  const config = getDevConfig();
  return !config.liveAuthEnabled;
};

// Get current dev role
// ALWAYS null on production
export const getCurrentDevRole = (): "admin" | "psw" | "client" | null => {
  if (isProductionDomain()) return null;
  const config = getDevConfig();
  return config.devRole;
};

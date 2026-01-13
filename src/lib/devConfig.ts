// Developer Configuration Store
// Controls development mode settings and authentication bypasses

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

// Get dev config from localStorage
export const getDevConfig = (): DevConfig => {
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
export const saveDevConfig = (config: Partial<DevConfig>): DevConfig => {
  const current = getDevConfig();
  const updated = { ...current, ...config };
  localStorage.setItem("pswdirect_dev_config", JSON.stringify(updated));
  return updated;
};

// Toggle live authentication mode
export const toggleLiveAuth = (enabled: boolean): DevConfig => {
  return saveDevConfig({ liveAuthEnabled: enabled });
};

// Set dev role for bypass
export const setDevRole = (role: "admin" | "psw" | "client" | null): DevConfig => {
  return saveDevConfig({ devRole: role });
};

// Check if we're in development bypass mode
export const isDevBypassMode = (): boolean => {
  const config = getDevConfig();
  return !config.liveAuthEnabled;
};

// Get current dev role
export const getCurrentDevRole = (): "admin" | "psw" | "client" | null => {
  const config = getDevConfig();
  return config.devRole;
};

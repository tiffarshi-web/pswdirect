// Domain Configuration for PSW Direct
// Centralized domain management for easy domain migration
// Change these settings in Admin Portal > Settings > Domain when switching domains

export interface DomainConfig {
  baseUrl: string;      // Full URL including https:// (e.g., "https://pswdirect.ca")
  displayName: string;  // Display name for emails/UI (e.g., "pswdirect.ca")
}

const DOMAIN_CONFIG_KEY = "pswdirect_domain_config";

// Default domain - this will be used until admin sets a custom domain
const DEFAULT_DOMAIN: DomainConfig = {
  baseUrl: "https://pswdirect.lovable.app",
  displayName: "pswdirect.lovable.app",
};

/**
 * Get the current domain configuration
 * First checks localStorage for admin-configured domain, falls back to default
 */
export const getDomainConfig = (): DomainConfig => {
  if (typeof window === "undefined") {
    return DEFAULT_DOMAIN;
  }
  
  const stored = localStorage.getItem(DOMAIN_CONFIG_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Validate the stored config has required fields
      if (parsed.baseUrl && parsed.displayName) {
        return parsed;
      }
    } catch {
      // Invalid JSON, fall back to default
    }
  }
  return DEFAULT_DOMAIN;
};

/**
 * Save a new domain configuration
 * Used by Admin Portal to update the domain before migration
 */
export const saveDomainConfig = (config: DomainConfig): void => {
  // Ensure baseUrl doesn't have trailing slash
  const cleanConfig: DomainConfig = {
    baseUrl: config.baseUrl.replace(/\/$/, ""),
    displayName: config.displayName,
  };
  localStorage.setItem(DOMAIN_CONFIG_KEY, JSON.stringify(cleanConfig));
};

/**
 * Reset to default domain configuration
 */
export const resetDomainConfig = (): void => {
  localStorage.removeItem(DOMAIN_CONFIG_KEY);
};

// ============================================
// URL Generation Functions
// All URLs in the app should use these functions
// ============================================

/**
 * Get the install app URL
 */
export const getInstallUrl = (): string => {
  const { baseUrl } = getDomainConfig();
  return `${baseUrl}/install`;
};

/**
 * Get the client portal login URL
 */
export const getClientPortalLoginUrl = (): string => {
  const { baseUrl } = getDomainConfig();
  return `${baseUrl}/client-login`;
};

/**
 * Get the client portal URL with optional deep link to specific booking
 */
export const getClientPortalDeepLinkUrl = (bookingId?: string): string => {
  const { baseUrl } = getDomainConfig();
  const portalUrl = `${baseUrl}/client-portal`;
  return bookingId ? `${portalUrl}?order=${bookingId}` : portalUrl;
};

/**
 * Get the PSW login URL - used for QR codes in approval emails
 */
export const getPSWLoginUrlFromConfig = (): string => {
  const { baseUrl } = getDomainConfig();
  return `${baseUrl}/psw-login`;
};

/**
 * Get the client install URL (with type parameter)
 */
export const getClientInstallUrlFromConfig = (): string => {
  const { baseUrl } = getDomainConfig();
  return `${baseUrl}/install?type=client`;
};

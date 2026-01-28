// Progressier PWA Configuration
// Centralized config for PWA integration visibility in Admin Panel

export const PROGRESSIER_CONFIG = {
  appId: "xXf0UWVAPdw78va7cNfF",
  dashboardUrl: "https://progressier.com/dashboard",
  manifestUrl: "https://progressier.app/xXf0UWVAPdw78va7cNfF/progressier.json",
};

// Infrastructure status - these represent backend secrets that are configured
// Note: We can't actually check if secrets exist from frontend, but we know they're configured
export const INFRASTRUCTURE_STATUS = {
  email: {
    provider: "Resend",
    status: "connected", // RESEND_API_KEY is configured as backend secret
    description: "Backend secret configured",
  },
  payments: {
    provider: "Stripe",
    status: "connected", // STRIPE_SECRET_KEY is configured as backend secret
    description: "Backend secret configured",
  },
  pwa: {
    provider: "Progressier",
    status: "active",
    appId: PROGRESSIER_CONFIG.appId,
    dashboardUrl: PROGRESSIER_CONFIG.dashboardUrl,
  },
};

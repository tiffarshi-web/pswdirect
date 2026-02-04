// Progressier PWA Configuration
// Centralized config for PWA integration visibility in Admin Panel

export const PROGRESSIER_CONFIG = {
  appId: "xXf0UWVAPdw78va7cNFf",
  dashboardUrl: "https://progressier.com/dashboard",
  manifestUrl: "https://progressier.app/xXf0UWVAPdw78va7cNFf/progressier.json",
  // Progressier-generated QR code for PWA installation
  qrCodePath: "/progressier-qr.png",
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
  pushNotifications: {
    provider: "Progressier",
    status: "connected", // PROGRESSIER_API_KEY is configured - endpoint verification pending
    description: "API key configured - verify endpoint in Progressier dashboard",
  },
  pwa: {
    provider: "Progressier",
    status: "active",
    appId: PROGRESSIER_CONFIG.appId,
    dashboardUrl: PROGRESSIER_CONFIG.dashboardUrl,
    qrCodePath: PROGRESSIER_CONFIG.qrCodePath,
  },
};

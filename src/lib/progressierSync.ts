// Progressier User Data Sync Utility
// Connects user data to Progressier for push notification targeting

declare global {
  interface Window {
    progressier?: {
      add: (data: { email?: string; id?: string; [key: string]: unknown }) => void;
    };
  }
}

/**
 * Syncs user data to Progressier SDK for push notification targeting.
 * Must be called after user authenticates to link their email/ID with their device.
 * 
 * From Progressier docs: "Connect your user data (e.g. a user ID or user email),
 * then call our Push API in your server-side code to send a push notification to a specific user."
 * 
 * @param email - User's email address
 * @param userId - Optional user ID (falls back to email if not provided)
 * @param additionalData - Optional additional user data to sync
 */
export const syncUserToProgressier = (
  email: string,
  userId?: string,
  additionalData?: Record<string, unknown>
): void => {
  if (typeof window === 'undefined') {
    console.warn('Progressier: Cannot sync - not in browser environment');
    return;
  }

  if (!window.progressier) {
    console.warn('Progressier: SDK not loaded yet, retrying in 1 second...');
    // Retry once after a short delay in case SDK is still loading
    setTimeout(() => {
      if (window.progressier) {
        performSync(email, userId, additionalData);
      } else {
        console.error('Progressier: SDK not available after retry');
      }
    }, 1000);
    return;
  }

  performSync(email, userId, additionalData);
};

/**
 * Internal function to perform the actual sync
 */
const performSync = (
  email: string,
  userId?: string,
  additionalData?: Record<string, unknown>
): void => {
  try {
    const syncData = {
      email: email,
      id: userId || email, // Use user ID or email as fallback
      ...additionalData,
    };

    window.progressier?.add(syncData);
    console.log('Progressier: User data synced successfully', { email, userId });
  } catch (error) {
    console.error('Progressier: Failed to sync user data', error);
  }
};

/**
 * Clears user data from Progressier (call on logout)
 */
export const clearProgressierUser = (): void => {
  if (typeof window === 'undefined' || !window.progressier) {
    return;
  }

  try {
    // Setting empty values effectively clears the user association
    window.progressier.add({
      email: undefined,
      id: undefined,
    });
    console.log('Progressier: User data cleared');
  } catch (error) {
    console.error('Progressier: Failed to clear user data', error);
  }
};

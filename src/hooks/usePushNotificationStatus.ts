import { useState, useEffect, useCallback } from "react";

const DISMISSED_KEY = "psw_push_prompt_dismissed";
const ENABLED_KEY = "psw_push_enabled";

export const usePushNotificationStatus = () => {
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "default" | "unsupported">("default");
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkPermission = useCallback(() => {
    if (!("Notification" in window)) {
      setPermissionState("unsupported");
      setIsLoading(false);
      return;
    }
    const perm = Notification.permission as "granted" | "denied" | "default";
    setPermissionState(perm);
    if (perm === "granted") {
      localStorage.setItem(ENABLED_KEY, "true");
    } else {
      localStorage.removeItem(ENABLED_KEY);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setPromptDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    checkPermission();
  }, [checkPermission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    try {
      const result = await Notification.requestPermission();
      setPermissionState(result as any);
      if (result === "granted") {
        localStorage.setItem(ENABLED_KEY, "true");
        localStorage.removeItem(DISMISSED_KEY);
        setPromptDismissed(false);
        return true;
      }
    } catch (e) {
      console.warn("Push permission request failed:", e);
    }
    return false;
  }, []);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setPromptDismissed(true);
  }, []);

  const isEnabled = permissionState === "granted";
  const shouldShowModal = !isLoading && !isEnabled && !promptDismissed;
  const shouldShowBanner = !isLoading && !isEnabled && promptDismissed;

  return {
    permissionState,
    isEnabled,
    isLoading,
    shouldShowModal,
    shouldShowBanner,
    requestPermission,
    dismissPrompt,
    recheckPermission: checkPermission,
  };
};

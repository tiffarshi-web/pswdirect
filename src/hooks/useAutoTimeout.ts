// Auto-Timeout Hook - Logs users out after 15 minutes of inactivity
// PHIPA compliance requirement for protecting open screens

import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  updateLastActivity, 
  hasSessionTimedOut, 
  AUTO_TIMEOUT_MS,
  clearSessionOnTimeout 
} from "@/lib/securityStore";
import { toast } from "sonner";

const WARNING_BEFORE_TIMEOUT_MS = 60 * 1000; // 1 minute warning

export const useAutoTimeout = () => {
  const { isAuthenticated, logout } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  const handleLogout = useCallback(() => {
    clearSessionOnTimeout();
    logout();
    toast.error("Session expired due to inactivity. Please log in again.", {
      duration: 5000,
    });
  }, [logout]);

  const showWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true;
      toast.warning("Your session will expire in 1 minute due to inactivity.", {
        duration: 10000,
        action: {
          label: "Stay Logged In",
          onClick: () => {
            updateLastActivity();
            warningShownRef.current = false;
            resetTimers();
          },
        },
      });
    }
  }, []);

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }
    
    // Update last activity
    updateLastActivity();
    warningShownRef.current = false;
    
    // Set warning timer (1 minute before timeout)
    warningRef.current = setTimeout(() => {
      showWarning();
    }, AUTO_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS);
    
    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, AUTO_TIMEOUT_MS);
  }, [handleLogout, showWarning]);

  // Activity event handlers
  const handleActivity = useCallback(() => {
    if (isAuthenticated) {
      resetTimers();
    }
  }, [isAuthenticated, resetTimers]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timers when not authenticated
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      return;
    }

    // Check if already timed out
    if (hasSessionTimedOut()) {
      handleLogout();
      return;
    }

    // Initialize timers
    resetTimers();

    // Listen for user activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [isAuthenticated, handleActivity, handleLogout, resetTimers]);

  return {
    resetTimers,
    remainingTime: AUTO_TIMEOUT_MS,
  };
};

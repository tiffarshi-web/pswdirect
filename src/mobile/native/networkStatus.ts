import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { isNativeApp } from "./platform";

export type ConnectionQuality = "online" | "slow" | "offline";

export interface NetworkState {
  connected: boolean;
  connectionType: string;
  quality: ConnectionQuality;
}

const SLOW_TYPES = new Set(["2g", "cellular-2g", "slow-2g", "3g"]);

export function qualityFor(connected: boolean, connectionType: string): ConnectionQuality {
  if (!connected || connectionType === "none") return "offline";
  return SLOW_TYPES.has(connectionType.toLowerCase()) ? "slow" : "online";
}

export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(() => ({
    connected: typeof navigator === "undefined" ? true : navigator.onLine,
    connectionType: "unknown",
    quality: "online",
  }));

  useEffect(() => {
    let active = true;
    const apply = (connected: boolean, connectionType: string) => {
      if (!active) return;
      setState({ connected, connectionType, quality: qualityFor(connected, connectionType) });
    };

    if (isNativeApp()) {
      Network.getStatus()
        .then((status) => apply(status.connected, status.connectionType))
        .catch(() => undefined);
      const handle = Network.addListener("networkStatusChange", (status) =>
        apply(status.connected, status.connectionType),
      );
      return () => {
        active = false;
        handle.then((h) => h.remove()).catch(() => undefined);
      };
    }

    const online = () => apply(true, "unknown");
    const offline = () => apply(false, "none");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      active = false;
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  return state;
}

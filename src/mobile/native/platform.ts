import { Capacitor } from "@capacitor/core";

export type NativePlatform = "ios" | "android" | "web";

/** True only inside the packaged Capacitor shell (not the website or preview). */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): NativePlatform {
  try {
    const platform = Capacitor.getPlatform();
    return platform === "ios" || platform === "android" ? platform : "web";
  } catch {
    return "web";
  }
}

export function isPluginAvailable(name: string): boolean {
  try {
    return Capacitor.isPluginAvailable(name);
  } catch {
    return false;
  }
}

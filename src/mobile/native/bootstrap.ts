import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { isNativeApp, isPluginAvailable } from "./platform";
import { resolveDeepLink } from "./deepLinks";
import { workerError } from "./logging";

export interface BootstrapHandlers {
  onDeepLink: (path: string) => void;
  onResume: () => void;
  onBack: () => boolean;
}

/**
 * Native shell setup: status bar, splash hand-off, keyboard behaviour, app
 * lifecycle, hardware back button and deep links.
 */
export async function bootstrapNativeShell(handlers: BootstrapHandlers): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;

  const cleanups: Array<() => void> = [];

  try {
    if (isPluginAvailable("StatusBar")) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (error) {
    workerError("statusbar", "Could not configure the status bar", error);
  }

  try {
    if (isPluginAvailable("Keyboard")) {
      await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
      await Keyboard.setScrollDisabled({ disabled: false });
    }
  } catch {
    /* keyboard plugin is Android/iOS only */
  }

  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url) handlers.onDeepLink(resolveDeepLink(launch.url));
  } catch {
    /* cold start without a link */
  }

  const listeners = await Promise.all([
    App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      handlers.onDeepLink(resolveDeepLink(event.url));
    }),
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) handlers.onResume();
    }),
    App.addListener("backButton", ({ canGoBack }) => {
      const handled = handlers.onBack();
      if (handled) return;
      if (canGoBack) {
        window.history.back();
      } else {
        void App.exitApp();
      }
    }),
  ]);

  listeners.forEach((listener) => cleanups.push(() => void listener.remove()));

  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    /* splash already hidden */
  }

  return () => cleanups.forEach((fn) => fn());
}

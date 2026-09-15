import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff, AlertTriangle } from "lucide-react";
import type { StartupDiagnostics, StartupErrorCode } from "../native/startup";

const MESSAGES: Record<StartupErrorCode, { title: string; body: string }> = {
  OFFLINE: {
    title: "No connection",
    body: "PSW Direct could not reach the network. Check Wi-Fi or mobile data, then try again.",
  },
  STARTUP_TIMEOUT: {
    title: "Taking too long to start",
    body: "The app could not finish starting up. This is usually a slow or dropped connection.",
  },
  SESSION_RESTORE_FAILED: {
    title: "Could not restore your sign-in",
    body: "You can continue and sign in again. Nothing you saved on this phone has been lost.",
  },
  BACKEND_CONFIG: {
    title: "This build is not configured correctly",
    body: "Please report this build to the office. Do not use it for visits.",
  },
  UNKNOWN: {
    title: "Something went wrong starting up",
    body: "Try again. If it keeps happening, send the office the code below.",
  },
};

interface Props {
  diagnostics: StartupDiagnostics;
  onRetry: () => void;
  onContinueToSignIn?: () => void;
}

/**
 * The one screen that guarantees the Worker app never sits on an endless
 * spinner. It always offers a retry and shows a short, privacy-safe code.
 */
export default function WorkerStartupFallback({ diagnostics, onRetry, onContinueToSignIn }: Props) {
  const code = diagnostics.errorCode ?? "UNKNOWN";
  const copy = MESSAGES[code];
  const Icon = code === "OFFLINE" ? WifiOff : AlertTriangle;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">{copy.title}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{copy.body}</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={onRetry} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Try again
        </Button>
        {onContinueToSignIn && code !== "BACKEND_CONFIG" && (
          <Button variant="outline" className="w-full" onClick={onContinueToSignIn}>
            Continue to sign in
          </Button>
        )}
      </div>

      <dl className="w-full max-w-xs space-y-1 rounded-md border border-border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
        <div className="flex justify-between"><dt>Code</dt><dd className="font-mono">{code}</dd></div>
        <div className="flex justify-between"><dt>Stage</dt><dd className="font-mono">{diagnostics.stage}</dd></div>
        <div className="flex justify-between">
          <dt>App</dt>
          <dd className="font-mono">{diagnostics.appVersion} ({diagnostics.buildNumber})</dd>
        </div>
        <div className="flex justify-between"><dt>Platform</dt><dd className="font-mono">{diagnostics.platform}</dd></div>
        {diagnostics.androidVersion && (
          <div className="flex justify-between"><dt>Android</dt><dd className="font-mono">{diagnostics.androidVersion}</dd></div>
        )}
        {diagnostics.webViewVersion && (
          <div className="flex justify-between"><dt>WebView</dt><dd className="font-mono">{diagnostics.webViewVersion}</dd></div>
        )}
        <div className="flex justify-between">
          <dt>Network</dt>
          <dd className="font-mono">{diagnostics.online ? "available" : "unavailable"}</dd>
        </div>
      </dl>
    </div>
  );
}

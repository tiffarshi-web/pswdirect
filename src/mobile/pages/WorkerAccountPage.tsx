import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Browser } from "@capacitor/browser";
import { Bell, FileText, LifeBuoy, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WORKER_APP_VERSION, WORKER_BUILD_NUMBER } from "../version";
import { isNativeApp } from "../native/platform";
import { clearLocalWorkerData } from "../native/nativeSession";
import { PUSH_RATIONALE, pushPermissionState, requestPushPermission, unregisterPushToken, type PushPermission } from "../native/pushNotifications";
import { workerError } from "../native/logging";

const LINKS = [
  { label: "Support", href: "https://pswdirect.ca/support", icon: LifeBuoy },
  { label: "Privacy policy", href: "https://pswdirect.ca/privacy", icon: ShieldCheck },
  { label: "Terms of service", href: "https://pswdirect.ca/terms", icon: FileText },
];

async function openExternal(href: string) {
  if (isNativeApp()) {
    await Browser.open({ url: href });
  } else {
    window.open(href, "_blank", "noopener,noreferrer");
  }
}

export default function WorkerAccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [push, setPush] = useState<PushPermission>("unsupported");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void pushPermissionState().then(setPush);
  }, []);

  const handleEnablePush = async () => {
    const result = await requestPushPermission();
    setPush(result);
    if (result === "granted") toast.success("Shift alerts are on.");
    if (result === "denied") toast.error("Turn notifications on for PSW Direct in your phone settings.");
  };

  const handleSignOut = async () => {
    try {
      await unregisterPushToken();
    } catch (error) {
      workerError("account", "Could not remove the device registration", error);
    }
    await clearLocalWorkerData();
    await supabase.auth.signOut();
    logout();
    navigate("/psw-login", { replace: true });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("worker-account-deletion", { body: {} });
      if (error) throw error;
      toast.success("Your deletion request was sent. We will confirm by email.");
      await handleSignOut();
    } catch (error) {
      workerError("account", "Deletion request failed", error);
      toast.error("We could not send the request. Please call the office at (249) 288-4787.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <h1 className="text-xl font-bold">Account</h1>
      <p className="text-sm text-muted-foreground">{user?.email}</p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shift alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{PUSH_RATIONALE}</p>
          {push === "granted" ? (
            <p className="text-sm font-medium text-primary">Alerts are on for this phone.</p>
          ) : push === "denied" ? (
            <p className="text-sm text-destructive">
              Alerts are blocked. Turn on notifications for PSW Direct in your phone settings.
            </p>
          ) : push === "unsupported" ? (
            <p className="text-sm text-muted-foreground">Alerts are available in the installed app.</p>
          ) : (
            <Button onClick={handleEnablePush} className="w-full">
              <Bell className="mr-2 h-4 w-4" /> Turn on shift alerts
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y p-0">
          {LINKS.map(({ label, href, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => void openExternal(href)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm"
            >
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={handleSignOut}>
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>

      <Button variant="ghost" className="w-full text-destructive" onClick={() => setConfirmDelete(true)}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete my account
      </Button>

      <p className="pt-2 text-center text-xs text-muted-foreground">
        PSW Direct Worker {WORKER_APP_VERSION} ({WORKER_BUILD_NUMBER})
      </p>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out and will no longer be offered work. Everything saved on this phone is removed.
              Completed care reports and payment records are kept as the law requires. If you have an accepted upcoming
              visit, we will contact you first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my account</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>
              {deleting ? "Sending…" : "Delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

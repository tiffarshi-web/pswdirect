import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PushNotificationModalProps {
  open: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export const PushNotificationModal = ({ open, onEnable, onDismiss }: PushNotificationModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Stay Connected to New Jobs
          </DialogTitle>
          <DialogDescription className="text-center text-sm space-y-3 pt-2">
            <p>
              Push notifications are essential for receiving:
            </p>
            <ul className="text-left space-y-2 mx-auto max-w-xs">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span><strong>New job alerts</strong> — be first to claim shifts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span><strong>Shift updates</strong> — schedule changes & reminders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span><strong>Account updates</strong> — payout confirmations & more</span>
              </li>
            </ul>
            <p className="text-muted-foreground text-xs pt-1">
              PSWs with notifications enabled claim jobs 3x faster.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={onEnable} className="w-full" size="lg">
            <Bell className="w-4 h-4 mr-2" />
            Enable Notifications
          </Button>
          <Button variant="ghost" onClick={onDismiss} className="w-full text-muted-foreground">
            Not Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

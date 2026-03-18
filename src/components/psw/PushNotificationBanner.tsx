import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PushNotificationBannerProps {
  onEnable: () => void;
}

export const PushNotificationBanner = ({ onEnable }: PushNotificationBannerProps) => {
  return (
    <div className="flex items-center gap-3 p-3 mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
        Push notifications are off. Enable them to receive job alerts instantly.
      </p>
      <Button size="sm" variant="outline" onClick={onEnable} className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100">
        Enable
      </Button>
    </div>
  );
};

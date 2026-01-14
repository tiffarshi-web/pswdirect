import { useState, useEffect } from "react";
import { X, Download, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const INSTALL_BANNER_DISMISSED_KEY = "pswdirect_install_banner_dismissed";

export const InstallAppBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY);
    if (dismissed) return;

    // Check if already running as standalone app
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Only show on mobile devices
    if (isIOSDevice || isAndroidDevice) {
      // Delay showing banner slightly
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, "true");
    setShowBanner(false);
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Install PSW Direct App
              </h3>
              {isIOS && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tap the <Share className="w-3 h-3 inline-block mx-0.5" /> Share icon, 
                  then select <strong>"Add to Home Screen"</strong> to save this as an app.
                </p>
              )}
              {isAndroid && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tap the <MoreVertical className="w-3 h-3 inline-block mx-0.5" /> menu, 
                  then select <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.
                </p>
              )}
              {!isIOS && !isAndroid && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Install this app for a better experience with quick access from your home screen.
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

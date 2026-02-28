import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share, MoreVertical, Smartphone, Bell, CheckCircle, MapPin, Clock } from "lucide-react";
import { ProgressierQRCode } from "@/components/ui/ProgressierQRCode";

interface InstallAppPromptProps {
  onDismiss?: () => void;
  clientName?: string;
}

type DeviceType = "ios" | "android" | "desktop";

export const InstallAppPrompt = ({ onDismiss, clientName }: InstallAppPromptProps) => {
  const navigate = useNavigate();
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDevice("ios");
    } else if (/android/.test(userAgent)) {
      setDevice("android");
    } else {
      setDevice("desktop");
    }

    // Check if already installed as PWA
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // Don't show if already installed or on desktop
  if (isStandalone || device === "desktop") {
    return null;
  }

  const handleInstallClick = () => {
    setShowInstructions(true);
  };

  const handleViewFullInstructions = () => {
    navigate("/install?type=client");
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="pt-6 pb-6">
        {!showInstructions ? (
          <div className="space-y-4">
            {/* Header with QR Code for quick scan */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">Stay Connected</h3>
                    <p className="text-sm text-muted-foreground">
                      Install our app to receive real-time updates on your care
                    </p>
                  </div>
                </div>
              </div>
              {/* Mini QR Code */}
              <ProgressierQRCode size="sm" showLabel={false} className="shrink-0" />
            </div>

            {/* Benefits */}
            <div className="space-y-2 pl-1">
              <div className="flex items-center gap-3 text-sm">
                <Bell className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground">Ping when caregiver accepts your booking</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground">Ping when they arrive at your location</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground">Ping when care is complete</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleInstallClick} className="w-full">
                <Smartphone className="w-4 h-4 mr-2" />
                Install App
              </Button>
              <Button variant="ghost" onClick={onDismiss} className="w-full text-muted-foreground">
                Maybe Later
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* iOS Instructions */}
            {device === "ios" && (
              <>
                <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">iOS</span>
                  Quick Install
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Tap the <Share className="inline w-4 h-4 text-blue-500" /> Share button
                      </p>
                      <p className="text-xs text-muted-foreground">
                        At the bottom of Safari
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Select "Add to Home Screen"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scroll down in the share menu
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Done!</p>
                      <p className="text-xs text-muted-foreground">
                        PSW DIRECT will appear on your home screen
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Android Instructions */}
            {device === "android" && (
              <>
                <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Android</span>
                  Quick Install
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Tap the <MoreVertical className="inline w-4 h-4" /> Menu (3 dots)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Top-right of Chrome
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Select "Install App"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Or "Add to Home Screen"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Done!</p>
                      <p className="text-xs text-muted-foreground">
                        PSW DIRECT will install automatically
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={handleViewFullInstructions} className="w-full text-sm">
                View Full Instructions
              </Button>
              <Button variant="ghost" onClick={onDismiss} className="w-full text-muted-foreground text-sm">
                Got it
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

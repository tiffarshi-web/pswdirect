import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share, MoreVertical, Download, Smartphone, CheckCircle } from "lucide-react";

type DeviceType = "ios" | "android" | "desktop";

const InstallApp = () => {
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [isInstalled, setIsInstalled] = useState(false);

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
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  const handleLoginRedirect = () => {
    window.location.href = "/psw-login";
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">App Installed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              PSW Direct is already installed on your device. You're all set!
            </p>
            <Button onClick={handleLoginRedirect} className="w-full" size="lg">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Smartphone className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Install PSW Direct</CardTitle>
          <p className="text-muted-foreground mt-2">
            Add our app to your home screen for quick access to shifts
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {device === "ios" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">iOS</span>
                One Simple Step
              </h3>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">
                      Tap the <Share className="inline w-5 h-5 text-blue-500" /> Share button
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Located at the bottom of Safari
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">
                      Select "Add to Home Screen"
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Scroll down in the share menu to find it
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Done!</p>
                    <p className="text-sm text-muted-foreground">
                      PSW Direct will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {device === "android" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">Android</span>
                One Simple Step
              </h3>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">
                      Tap the <MoreVertical className="inline w-5 h-5" /> Menu (3 dots)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Located at the top-right of Chrome
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-1">
                      Select "Install App" <Download className="w-4 h-4" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Or "Add to Home Screen"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Done!</p>
                    <p className="text-sm text-muted-foreground">
                      PSW Direct will install automatically
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {device === "desktop" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Desktop Instructions</h3>
              <p className="text-muted-foreground">
                For the best experience, scan this page's QR code on your mobile device, or:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                  <span><strong>Chrome:</strong> Click the install icon in the address bar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                  <span><strong>Edge:</strong> Click "Install PSW Direct" in the menu</span>
                </li>
              </ul>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button onClick={handleLoginRedirect} variant="outline" className="w-full">
              Skip - Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallApp;

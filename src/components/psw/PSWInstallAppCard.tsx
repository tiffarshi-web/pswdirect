import { Download, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const INSTALL_URL = "https://psadirect.ca/install";

export const PSWInstallAppCard = () => {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <Card className="border-primary/30 bg-primary/5 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="w-5 h-5 text-primary" />
          Download PSW Direct Mobile App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your application has been approved. You can now download the official PSW Direct mobile app to begin accepting visits and managing your schedule.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={INSTALL_URL} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />
              Download App
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowInstructions((v) => !v)}
          >
            Installation Instructions
          </Button>
        </div>

        {showInstructions && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">For iPhone:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open the link in Safari</li>
                <li>Tap the Share button</li>
                <li>Select "Add to Home Screen"</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-1">For Android:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open the link in Chrome</li>
                <li>Tap the browser menu (⋮)</li>
                <li>Select "Add to Home Screen"</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

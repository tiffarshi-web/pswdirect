import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, ExternalLink, ShieldAlert, LogIn } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { PROGRESSIER_CONFIG } from "@/lib/progressierConfig";

interface PSWAppAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PSWAppAccessDialog = ({ open, onOpenChange }: PSWAppAccessDialogProps) => {
  const { isAuthenticated, user } = useSupabaseAuth();
  const [pswStatus, setPswStatus] = useState<"loading" | "not_psw" | "pending" | "approved">("loading");

  useEffect(() => {
    if (!open || !isAuthenticated || !user) {
      setPswStatus("loading");
      return;
    }

    const checkPSWStatus = async () => {
      const { data } = await supabase
        .from("psw_profiles")
        .select("vetting_status")
        .eq("email", user.email ?? "")
        .maybeSingle();

      if (!data) {
        setPswStatus("not_psw");
      } else if (data.vetting_status === "approved") {
        setPswStatus("approved");
      } else {
        setPswStatus("pending");
      }
    };

    checkPSWStatus();
  }, [open, isAuthenticated, user]);

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="text-center py-8 space-y-4">
          <LogIn className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">Please log in to access the PSW App.</p>
          <p className="text-sm text-muted-foreground">You must be an authenticated PSW to use this feature.</p>
        </div>
      );
    }

    if (pswStatus === "loading") {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    if (pswStatus === "not_psw" || pswStatus === "pending") {
      return (
        <div className="text-center py-8 space-y-4">
          <ShieldAlert className="w-12 h-12 mx-auto text-destructive" />
          <p className="text-lg font-medium text-foreground">
            Your application must be approved before app access is granted.
          </p>
          <p className="text-sm text-muted-foreground">
            Please wait for admin review of your PSW profile.
          </p>
        </div>
      );
    }

    // Approved PSW
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground text-center mb-6">
          Download the PSW App to manage shifts, track location, and submit care sheets.
        </p>

        <Button variant="outline" className="w-full h-14 justify-start gap-3 text-base" asChild>
          <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">
            <Download className="w-5 h-5" />
            Download for iPhone
            <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
          </a>
        </Button>

        <Button variant="outline" className="w-full h-14 justify-start gap-3 text-base" asChild>
          <a href="https://play.google.com" target="_blank" rel="noopener noreferrer">
            <Download className="w-5 h-5" />
            Download for Android
            <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
          </a>
        </Button>

        {PROGRESSIER_CONFIG.appId && (
          <Button variant="outline" className="w-full h-14 justify-start gap-3 text-base" asChild>
            <a href={PROGRESSIER_CONFIG.manifestUrl} target="_blank" rel="noopener noreferrer">
              <Smartphone className="w-5 h-5" />
              Install Progressive Web App
              <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
            </a>
          </Button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            PSW App Access
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

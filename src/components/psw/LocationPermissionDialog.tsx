// Pre-permission dialog for PSWs explaining GPS usage
// Shows before the browser's native permission prompt to improve acceptance

import { useState } from "react";
import { MapPin, Shield, Bell, CheckCircle2, X, Smartphone } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";

interface LocationPermissionDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const LocationPermissionDialog = ({
  open,
  onAccept,
  onDecline,
}: LocationPermissionDialogProps) => {
  const benefits = [
    {
      icon: MapPin,
      title: "Seamless Check-In",
      description: "GPS verifies you're at the correct location, making check-in quick and hassle-free.",
    },
    {
      icon: Shield,
      title: "Your Safety First",
      description: "In case of emergencies, the office can locate you to send assistance.",
    },
    {
      icon: Bell,
      title: "Client Peace of Mind",
      description: "Clients can see you're on your way, building trust and reducing anxiety.",
    },
  ];

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-lg">
              Enable Location for Check-In
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            To start your shift, we need to verify your location. This helps ensure 
            you're at the right place and keeps everyone safe.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Benefits List */}
        <div className="space-y-3 my-4">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-0 bg-muted/50">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{benefit.title}</p>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-700 dark:text-emerald-300">
            <strong>Your Privacy Matters:</strong> Location is only tracked during active shifts 
            and stops automatically when you complete your care sheet.
          </div>
        </div>

        {/* What Happens Next */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 mt-2">
          <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Next Step:</strong> After clicking "Allow Location," your browser will 
            show a permission popup. Please tap <strong>"Allow"</strong> to proceed.
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel 
            onClick={onDecline}
            className="w-full sm:w-auto"
          >
            Not Now
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onAccept}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Allow Location
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LocationPermissionDialog;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Lock, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearProvinceCache } from "@/lib/provinceConfig";

export interface ProvinceActivationState {
  code: string;
  name: string;
  recruitment_enabled: boolean;
  bookings_enabled: boolean;
  payments_enabled: boolean;
  launch_status: string;
}

interface Props {
  province: ProvinceActivationState;
  /** Viewing settings and activating a province are separate permissions. */
  canActivate: boolean;
  onChanged: () => void;
}

/**
 * Province activation — recruitment, client bookings and payment are three
 * separate switches. Turning any of them on or off requires the activation
 * permission, an explicit confirmation and a written reason, and always
 * writes an audit record. Payment can never be on while bookings are off.
 */
export const ProvinceActivationCard = ({ province, canActivate, onChanged }: Props) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState({
    recruitment: province.recruitment_enabled,
    bookings: province.bookings_enabled,
    payments: province.payments_enabled,
  });
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty =
    draft.recruitment !== province.recruitment_enabled ||
    draft.bookings !== province.bookings_enabled ||
    draft.payments !== province.payments_enabled;

  const setField = (key: keyof typeof draft, value: boolean) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      // Payment can never be live while client bookings are closed.
      if (key === "bookings" && !value) next.payments = false;
      if (key === "payments" && value) next.bookings = true;
      return next;
    });
  };

  const apply = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("admin_set_province_activation", {
      p_code: province.code,
      p_recruitment: draft.recruitment,
      p_bookings: draft.bookings,
      p_payments: draft.payments,
      p_launch_status: draft.bookings && draft.payments ? "live" : province.launch_status,
      p_reason: reason.trim(),
    });
    setSaving(false);
    setConfirmOpen(false);
    if (error) {
      toast({
        title: "Activation change refused",
        description: error.message.includes("not_authorized")
          ? "You do not have permission to activate or pause a province."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    clearProvinceCache();
    setReason("");
    toast({ title: `${province.name} activation updated`, description: "An audit record was created." });
    onChanged();
  };

  const rows: { key: keyof typeof draft; label: string; help: string }[] = [
    {
      key: "recruitment",
      label: "Caregiver recruitment",
      help: "Applications and verification for this province.",
    },
    {
      key: "bookings",
      label: "Client booking",
      help: "Off means clients see Coming Soon and can join the waiting list only.",
    },
    {
      key: "payments",
      label: "Payment",
      help: "Off means no order in this province can reach checkout.",
    },
  ];

  return (
    <div className="rounded-md border border-border p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-medium flex items-center gap-2">
          Activation
          <Badge variant={province.launch_status === "live" ? "default" : "secondary"}>
            {province.launch_status}
          </Badge>
        </p>
        {!canActivate && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> View only
          </span>
        )}
      </div>

      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{row.label}</p>
            <p className="text-sm text-muted-foreground">{row.help}</p>
          </div>
          <Switch
            checked={draft[row.key]}
            disabled={!canActivate}
            onCheckedChange={(v) => setField(row.key, v)}
            aria-label={`${province.name} ${row.label}`}
          />
        </div>
      ))}

      {canActivate && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${province.code}`}>Reason (required, recorded in the audit history)</Label>
            <Textarea
              id={`reason-${province.code}`}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this changing?"
            />
          </div>
          <Button
            size="sm"
            disabled={!dirty || !reason.trim() || saving}
            onClick={() => setConfirmOpen(true)}
          >
            Apply activation change
          </Button>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Confirm {province.name} activation change
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Recruitment {draft.recruitment ? "ON" : "OFF"} · Client booking{" "}
                  {draft.bookings ? "ON" : "OFF"} · Payment {draft.payments ? "ON" : "OFF"}
                </p>
                <p>
                  Turning payment on lets real clients be charged in {province.name}. This is
                  recorded against your account.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={apply} disabled={saving}>
              {saving ? "Applying…" : "Yes, apply"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

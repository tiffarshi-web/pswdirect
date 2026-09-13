import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SERVICE_AREA_NOTICE } from "@/lib/serviceArea";
import type { ServiceAreaStatus } from "@/lib/serviceArea";

interface Props {
  status: ServiceAreaStatus;
  /** Pre-fill the waiting-list form from the booking flow. */
  defaults?: { name?: string; email?: string; phone?: string; city?: string; postalCode?: string };
}

/**
 * Shows the Ontario service-area note for bookable addresses, and a
 * "Coming Soon" panel with a waiting-list form for any province that is not
 * yet taking bookings. Payment is blocked by the booking flow in that case.
 */
export const ProvinceServiceAreaNotice = ({ status, defaults }: Props) => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(defaults?.name || "");
  const [email, setEmail] = useState(defaults?.email || "");
  const [phone, setPhone] = useState(defaults?.phone || "");
  const [notes, setNotes] = useState("");

  if (status.bookable) {
    return <p className="text-xs text-muted-foreground">{SERVICE_AREA_NOTICE}</p>;
  }

  const join = async () => {
    if (!name.trim() || !email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("province_waitlist" as never).insert({
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      province: status.province,
      city: defaults?.city || null,
      postal_code: defaults?.postalCode || null,
      notes: notes.trim() || null,
    } as never);
    setSaving(false);
    if (error) {
      toast({ title: "We couldn't save that", description: "Please try again in a moment.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Coming soon to {status.provinceName}
            </p>
            <p className="text-sm text-muted-foreground">{status.message}</p>
          </div>
        </div>

        {submitted ? (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            You're on the list — we'll be in touch.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="wl-name">Your name *</Label>
                <Input id="wl-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wl-email">Email *</Label>
                <Input id="wl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wl-phone">Phone</Label>
              <Input id="wl-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wl-notes">What kind of care do you need?</Label>
              <Textarea id="wl-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="button" onClick={join} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving…" : "Join the waiting list"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

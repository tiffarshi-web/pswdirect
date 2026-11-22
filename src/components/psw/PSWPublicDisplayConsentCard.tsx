import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const PUBLIC_DISPLAY_CONSENT_VERSION = "public-display-v1";

type ConsentState = { public_display_consent: boolean; public_photo_consent: boolean; public_display_consent_at: string | null };

/**
 * Caregiver opt-in for appearing on public city pages. Off by default; the
 * caregiver can revoke at any time. Changes go through an audited backend
 * function — never a direct profile update.
 */
export const PSWPublicDisplayConsentCard = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ConsentState | null>(null);
  const [agree, setAgree] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    let { data } = await (supabase as any).from("psw_profiles")
      .select("public_display_consent, public_photo_consent, public_display_consent_at").eq("id", user.id).maybeSingle();
    if (!data && user.email) {
      ({ data } = await (supabase as any).from("psw_profiles")
        .select("public_display_consent, public_photo_consent, public_display_consent_at").eq("email", user.email).maybeSingle());
    }
    if (data) { setState(data); setPhoto(!!data.public_photo_consent); }
  };
  useEffect(() => { load(); }, [user?.id]);

  const save = async (display: boolean) => {
    setSaving(true);
    const { error } = await (supabase as any).rpc("set_my_public_display_consent", {
      p_display: display, p_photo: display ? photo : false, p_version: PUBLIC_DISPLAY_CONSENT_VERSION,
    });
    setSaving(false);
    if (error) { toast.error("Could not save your choice. Please try again."); return; }
    toast.success(display ? "You now appear on public city pages" : "You no longer appear on public pages");
    setAgree(false);
    load();
  };

  if (!state) return null;
  const on = state.public_display_consent;
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Public website listing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Optional. If you opt in, your first name, last initial and service city may appear on PSW Direct city pages.
          Your address, phone, email, exact location and documents are never shown. You can turn this off at any time.
        </p>
        {on ? (
          <>
            <p className="font-medium">Status: listed{state.public_display_consent_at ? ` since ${new Date(state.public_display_consent_at).toLocaleDateString()}` : ""}{state.public_photo_consent ? " (with photo)" : " (no photo)"}</p>
            <Button variant="outline" disabled={saving} onClick={() => save(false)}>Remove me from public pages</Button>
          </>
        ) : (
          <>
            <p className="font-medium">Status: not listed</p>
            <div className="flex items-start gap-2">
              <Checkbox id="pd-photo" checked={photo} onCheckedChange={v => setPhoto(v === true)} />
              <Label htmlFor="pd-photo" className="font-normal">Also show my approved profile photo</Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="pd-agree" checked={agree} onCheckedChange={v => setAgree(v === true)} />
              <Label htmlFor="pd-agree" className="font-normal">I agree to PSW Direct showing my first name, last initial and service city on its public website. I understand I can withdraw this consent at any time.</Label>
            </div>
            <Button disabled={!agree || saving} onClick={() => save(true)}>Opt in to public listing</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PSWPublicDisplayConsentCard;

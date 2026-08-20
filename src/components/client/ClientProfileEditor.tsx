import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { normalizeCanadianPostalCode } from "@/lib/postalCodeUtils";

/**
 * Lets a signed-in client update the contact details they're permitted to change.
 * Email is immutable here (it is the auth identity) and historical bookings are
 * never rewritten — only the client_profiles default record.
 */
export const ClientProfileEditor = ({ onSaved }: { onSaved?: () => void }) => {
  const { clientProfile, updateClientProfile } = useSupabaseAuth();
  const [fullName, setFullName] = useState(clientProfile?.full_name || "");
  const [phone, setPhone] = useState(clientProfile?.phone || "");
  const [address, setAddress] = useState(clientProfile?.default_address || "");
  const [postalCode, setPostalCode] = useState(clientProfile?.default_postal_code || "");
  const [saving, setSaving] = useState(false);

  if (!clientProfile) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Your profile is created after your first completed booking. Contact our office if you
          need details changed sooner.
        </CardContent>
      </Card>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedPostal = postalCode ? normalizeCanadianPostalCode(postalCode) : "";
      const result = await updateClientProfile({
        full_name: fullName.trim() || null,
        first_name: (fullName.trim().split(" ")[0] || clientProfile.first_name) ?? null,
        phone: phone.trim() || null,
        default_address: address.trim() || null,
        default_postal_code: normalizedPostal || null,
      });
      if (result) {
        toast.success("Your details were updated");
        onSaved?.();
      } else {
        toast.error("Could not save your details", { description: "Please try again." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cp-name">Full name</Label>
          <Input id="cp-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-phone">Phone</Label>
          <Input
            id="cp-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-address">Default service address</Label>
          <Input id="cp-address" value={address} onChange={(e) => setAddress(e.target.value)} className="h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-postal">Postal code</Label>
          <Input
            id="cp-postal"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
            className="h-12"
            maxLength={7}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your email address is your sign-in identity and can't be changed here. Past bookings and
          invoices keep the details recorded at the time of service.
        </p>
        <Button onClick={handleSave} disabled={saving} className="w-full h-12">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
};

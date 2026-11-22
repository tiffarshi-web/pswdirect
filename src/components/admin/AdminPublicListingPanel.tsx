import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Row = { public_display_consent: boolean; public_photo_consent: boolean; public_display_consent_at: string | null; public_display_consent_version: string | null; public_display_revoked_at: string | null; public_summary: string | null; public_summary_approved_at: string | null };

/** Admin view of a caregiver's public-listing consent. Admins can revoke and approve a summary, never opt a caregiver in. */
const AdminPublicListingPanel = ({ pswProfileId }: { pswProfileId: string }) => {
  const [row, setRow] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).from("psw_profiles")
      .select("public_display_consent, public_photo_consent, public_display_consent_at, public_display_consent_version, public_display_revoked_at, public_summary, public_summary_approved_at")
      .eq("id", pswProfileId).maybeSingle();
    if (data) { setRow(data); setSummary(data.public_summary ?? ""); }
  };
  useEffect(() => { load(); }, [pswProfileId]);

  const call = async (fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(true);
    const { error } = await (supabase as any).rpc(fn, args);
    setBusy(false);
    if (error) { toast.error(error.message || "Could not save"); return; }
    toast.success(ok); setReason(""); load();
  };

  if (!row) return null;
  return (
    <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
      <p className="font-semibold">Public website listing</p>
      <p className="text-muted-foreground">
        {row.public_display_consent
          ? `Opted in ${row.public_display_consent_at ? new Date(row.public_display_consent_at).toLocaleDateString() : ""} (${row.public_display_consent_version ?? "unknown version"}), photo ${row.public_photo_consent ? "allowed" : "not allowed"}.`
          : row.public_display_revoked_at ? `Not listed (revoked ${new Date(row.public_display_revoked_at).toLocaleDateString()}).` : "Not listed (caregiver has not opted in)."}
        {" "}Only the caregiver can opt in. Listing also requires approval, active status and a current police check.
      </p>
      {row.public_display_consent && (
        <div className="space-y-1">
          <Label htmlFor="pl-reason">Reason for removing from public pages</Label>
          <Textarea id="pl-reason" rows={2} value={reason} onChange={e => setReason(e.target.value)} />
          <Button size="sm" variant="outline" disabled={busy || reason.trim().length < 3}
            onClick={() => call("admin_revoke_public_display_consent", { p_psw_id: pswProfileId, p_reason: reason }, "Removed from public pages")}>Revoke public listing</Button>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="pl-summary">Approved public summary (optional, max 300 characters, no contact details)</Label>
        <Textarea id="pl-summary" rows={2} maxLength={300} value={summary} onChange={e => setSummary(e.target.value)} />
        <Button size="sm" variant="outline" disabled={busy}
          onClick={() => call("admin_set_public_summary", { p_psw_id: pswProfileId, p_summary: summary }, summary.trim() ? "Summary approved" : "Summary cleared")}>
          {summary.trim() ? "Approve summary" : "Clear summary"}
        </Button>
      </div>
    </div>
  );
};

export default AdminPublicListingPanel;

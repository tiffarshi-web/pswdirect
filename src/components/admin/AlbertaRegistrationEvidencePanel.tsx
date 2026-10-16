import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ALBERTA_REGULATORY_BODIES,
  isAlbertaProviderType,
  permitRequired,
  submitAlbertaEvidence,
  validateAlbertaEvidence,
  type AlbertaEvidenceErrors,
  type AlbertaEvidenceInput,
} from "@/lib/albertaRegistrationEvidence";

interface AuthRow {
  id: string;
  psw_profile_id: string;
  provider_type: string;
  verification_status: string;
  job_eligible: boolean;
  registration_body: string | null;
  registration_number: string | null;
  permit_number: string | null;
  expires_at: string | null;
  evidence_reference: string | null;
  evidence_checked_at: string | null;
}

const blank = (type: string): AlbertaEvidenceInput => ({
  providerType: type,
  registrationBody: isAlbertaProviderType(type) ? ALBERTA_REGULATORY_BODIES[type.toUpperCase() as "HCA"][0] : "",
  registrationNumber: "",
  permitNumber: "",
  expiresAt: "",
  evidenceReference: "",
  verificationNote: "",
});

const EvidenceForm = ({ row, onDone }: { row: AuthRow; onDone: () => void }) => {
  const type = row.provider_type.toUpperCase();
  const [form, setForm] = useState<AlbertaEvidenceInput>(() => ({
    ...blank(type),
    registrationBody: row.registration_body || blank(type).registrationBody,
    registrationNumber: row.registration_number || "",
    permitNumber: row.permit_number || "",
  }));
  const [errors, setErrors] = useState<AlbertaEvidenceErrors>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof AlbertaEvidenceInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const v = validateAlbertaEvidence(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    const res = await submitAlbertaEvidence(row, form);
    setSaving(false);
    if (res.ok) {
      toast.success("Alberta registration verified", { description: "Recorded in the audit log. Worker is now authorized for Alberta jobs." });
      onDone();
    } else if (res.ok === false && res.stage === "validation") {
      setErrors(res.errors);
    } else if (res.ok === false) {
      toast.error(res.stage === "evidence" ? "Evidence not saved" : "Evidence saved, but verification refused", {
        description: res.message + (res.stage === "verify" ? " The worker remains ineligible." : ""),
      });
      if (res.stage === "verify") onDone();
    }
  };

  const field = (k: keyof AlbertaEvidenceInput, label: string, node: React.ReactNode) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {node}
      {errors[k] && <p className="text-xs text-destructive" role="alert">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="space-y-2 pt-2">
      {field("registrationBody", "Regulatory body checked", (
        <select
          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={form.registrationBody}
          onChange={(e) => set("registrationBody")(e.target.value)}
        >
          {(ALBERTA_REGULATORY_BODIES[type as "HCA"] ?? []).map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      ))}
      {field("registrationNumber", "Registration number", <Input maxLength={50} value={form.registrationNumber} onChange={(e) => set("registrationNumber")(e.target.value)} />)}
      {field("permitNumber", permitRequired(type) ? "Practice permit number (required)" : "Practice permit number (optional)",
        <Input maxLength={50} value={form.permitNumber} onChange={(e) => set("permitNumber")(e.target.value)} />)}
      {field("expiresAt", "Registration / permit expiry", <Input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt")(e.target.value)} />)}
      {field("evidenceReference", "Evidence source / reference", (
        <Input maxLength={500} placeholder="e.g. CLHA public register search, screenshot filed 2026-10-16" value={form.evidenceReference} onChange={(e) => set("evidenceReference")(e.target.value)} />
      ))}
      {field("verificationNote", "Admin verification note", (
        <Textarea maxLength={1000} rows={2} value={form.verificationNote} onChange={(e) => set("verificationNote")(e.target.value)} />
      ))}
      <p className="text-xs text-muted-foreground">
        Check the regulator's register yourself. This form does not look anything up automatically.
      </p>
      <Button size="sm" onClick={submit} disabled={saving} className="w-full">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Record evidence and verify
      </Button>
    </div>
  );
};

export const AlbertaRegistrationEvidencePanel = ({ pswProfileId }: { pswProfileId: string }) => {
  const [rows, setRows] = useState<AuthRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("provider_provincial_authorizations")
      .select("id, psw_profile_id, provider_type, verification_status, job_eligible, registration_body, registration_number, permit_number, expires_at, evidence_reference, evidence_checked_at")
      .eq("psw_profile_id", pswProfileId)
      .eq("province", "AB");
    if (error) { console.error(error); setRows([]); return; }
    setRows((data ?? []) as AuthRow[]);
  }, [pswProfileId]);

  useEffect(() => { load(); }, [load]);

  if (!rows || rows.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 border border-border rounded-lg space-y-3" data-testid="alberta-evidence-panel">
      <p className="font-medium text-sm">Alberta registration</p>
      {rows.map((r) => {
        const current = r.verification_status === "verified" && r.job_eligible && !!r.expires_at && r.expires_at >= today;
        return (
          <div key={r.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">{r.provider_type.toUpperCase()}</span>
              {current ? (
                <Badge variant="secondary"><ShieldCheck className="w-3 h-3 mr-1" />Verified to {r.expires_at}</Badge>
              ) : (
                <Badge variant="destructive"><ShieldAlert className="w-3 h-3 mr-1" />Not eligible for Alberta jobs</Badge>
              )}
            </div>
            {r.evidence_checked_at && (
              <p className="text-xs text-muted-foreground">
                {r.registration_body} #{r.registration_number}{r.permit_number ? ` · permit ${r.permit_number}` : ""} · checked {r.evidence_checked_at.slice(0, 10)}
              </p>
            )}
            {!isAlbertaProviderType(r.provider_type) ? (
              <p className="text-xs text-destructive">This provider type cannot be authorized in Alberta.</p>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                  {current ? "Re-record evidence" : "Record registration evidence"}
                </Button>
                {openId === r.id && <EvidenceForm row={r} onDone={() => { setOpenId(null); load(); }} />}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

import { useState } from "react";
import { User, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCareRecipients, type CareRecipientInput } from "@/hooks/useCareRecipients";
import { Loader2 } from "lucide-react";

export const CareRecipientsManager = () => {
  const { recipients, isLoading, addRecipient, updateRecipient, deleteRecipient } = useCareRecipients();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", relationship: "",
    defaultAddress: "", postalCode: "", city: "",
    buzzerCode: "", entryInstructions: "",
    careNotes: "", mobilityNotes: "", specialInstructions: "",
  });

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", relationship: "", defaultAddress: "", postalCode: "", city: "", buzzerCode: "", entryInstructions: "", careNotes: "", mobilityNotes: "", specialInstructions: "" });
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) { toast.error("First name is required"); return; }
    const input: CareRecipientInput = {
      full_name: `${form.firstName} ${form.lastName}`.trim(),
      first_name: form.firstName, last_name: form.lastName,
      relationship: form.relationship || null,
      default_address: form.defaultAddress || null,
      postal_code: form.postalCode || null,
      city: form.city || null, province: "ON",
      buzzer_code: form.buzzerCode || null,
      entry_instructions: form.entryInstructions || null,
      care_notes: form.careNotes || null,
      mobility_notes: form.mobilityNotes || null,
      special_instructions: form.specialInstructions || null,
      preferred_languages: ["en"], preferred_gender: "no-preference",
      is_self: false,
    };

    if (editingId) {
      await updateRecipient(editingId, input);
      toast.success("Recipient updated!");
    } else {
      await addRecipient(input);
      toast.success("Recipient added!");
    }
    resetForm();
    setShowAdd(false);
    setEditingId(null);
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      firstName: r.first_name || "", lastName: r.last_name || "",
      relationship: r.relationship || "",
      defaultAddress: r.default_address || "", postalCode: r.postal_code || "",
      city: r.city || "", buzzerCode: r.buzzer_code || "",
      entryInstructions: r.entry_instructions || "",
      careNotes: r.care_notes || "", mobilityNotes: r.mobility_notes || "",
      specialInstructions: r.special_instructions || "",
    });
    setShowAdd(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Care Recipients</h2>
        {!showAdd && (
          <Button variant="outline" size="sm" onClick={() => { resetForm(); setEditingId(null); setShowAdd(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {recipients.map(r => (
        <Card key={r.id} className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full"><User className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="font-medium text-foreground">{r.full_name}</p>
                  <div className="flex gap-2 mt-0.5">
                    {r.is_self && <Badge variant="secondary" className="text-xs">Self</Badge>}
                    {r.relationship && <Badge variant="outline" className="text-xs">{r.relationship}</Badge>}
                  </div>
                  {r.default_address && <p className="text-xs text-muted-foreground mt-1">{r.default_address}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(r)}><Edit2 className="w-3.5 h-3.5" /></Button>
                {!r.is_self && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                    if (confirm("Remove this recipient?")) { await deleteRecipient(r.id); toast.success("Removed"); }
                  }}><Trash2 className="w-3.5 h-3.5" /></Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {recipients.length === 0 && !showAdd && (
        <Card className="shadow-card"><CardContent className="p-6 text-center text-muted-foreground">No care recipients saved yet.</CardContent></Card>
      )}

      {showAdd && (
        <Card className="border-primary/30 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              {editingId ? "Edit Recipient" : "Add Recipient"}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowAdd(false); setEditingId(null); resetForm(); }}><X className="w-4 h-4" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">First Name *</Label><Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} /></div>
              <div><Label className="text-xs">Last Name</Label><Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Relationship</Label><Input value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} placeholder="e.g. Mother, Father, Spouse" /></div>
            <div><Label className="text-xs">Home Address</Label><Input value={form.defaultAddress} onChange={e => setForm(p => ({ ...p, defaultAddress: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
              <div><Label className="text-xs">Postal Code</Label><Input value={form.postalCode} onChange={e => setForm(p => ({ ...p, postalCode: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Buzzer Code</Label><Input value={form.buzzerCode} onChange={e => setForm(p => ({ ...p, buzzerCode: e.target.value }))} /></div>
              <div><Label className="text-xs">Entry Notes</Label><Input value={form.entryInstructions} onChange={e => setForm(p => ({ ...p, entryInstructions: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Care Notes</Label><Textarea value={form.careNotes} onChange={e => setForm(p => ({ ...p, careNotes: e.target.value }))} rows={2} /></div>
            <div><Label className="text-xs">Mobility Notes</Label><Textarea value={form.mobilityNotes} onChange={e => setForm(p => ({ ...p, mobilityNotes: e.target.value }))} rows={2} /></div>
            <div><Label className="text-xs">Special Instructions</Label><Textarea value={form.specialInstructions} onChange={e => setForm(p => ({ ...p, specialInstructions: e.target.value }))} rows={2} /></div>
            <Button variant="brand" className="w-full" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" /> {editingId ? "Update" : "Save"} Recipient
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

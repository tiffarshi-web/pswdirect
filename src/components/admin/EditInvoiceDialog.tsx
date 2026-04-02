import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface EditableInvoice {
  id: string;
  invoice_number: string;
  booking_code: string;
  booking_id: string;
  client_email: string;
  client_name: string | null;
  payer_type: string | null;
  payer_name: string | null;
  service_type: string | null;
  duration_hours: number | null;
  subtotal: number;
  tax: number;
  surge_amount: number;
  rush_amount: number;
  total: number;
  payment_terms_days: number | null;
  due_date: string | null;
  payment_note: string | null;
  stripe_payment_intent_id: string | null;
  document_status: string;
}

interface EditInvoiceDialogProps {
  invoice: EditableInvoice | null;
  onClose: () => void;
  onSaved: (updated: Partial<EditableInvoice> & { id: string }) => void;
}

const PAYER_TYPES = [
  { value: "client", label: "Client (Private Pay)" },
  { value: "insurance", label: "Insurance" },
  { value: "government", label: "Government / VAC" },
];

export const EditInvoiceDialog = ({ invoice, onClose, onSaved }: EditInvoiceDialogProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [payerType, setPayerType] = useState("client");
  const [payerName, setPayerName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [surgeAmount, setSurgeAmount] = useState("");
  const [rushAmount, setRushAmount] = useState("");
  const [total, setTotal] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  useEffect(() => {
    if (invoice) {
      setClientName(invoice.client_name || "");
      setClientEmail(invoice.client_email || "");
      setPayerType(invoice.payer_type || "client");
      setPayerName(invoice.payer_name || "");
      setServiceType(invoice.service_type || "");
      setDurationHours(invoice.duration_hours?.toString() || "");
      setSubtotal(invoice.subtotal.toFixed(2));
      setTax(invoice.tax.toFixed(2));
      setSurgeAmount(invoice.surge_amount.toFixed(2));
      setRushAmount(invoice.rush_amount.toFixed(2));
      setTotal(invoice.total.toFixed(2));
      setPaymentTermsDays(invoice.payment_terms_days?.toString() || "");
      setDueDate(invoice.due_date ? invoice.due_date.split("T")[0] : "");
      setPaymentNote(invoice.payment_note || "");
    }
  }, [invoice]);

  // Auto-calculate total when components change
  const recalcTotal = () => {
    const s = parseFloat(subtotal) || 0;
    const t = parseFloat(tax) || 0;
    const su = parseFloat(surgeAmount) || 0;
    const r = parseFloat(rushAmount) || 0;
    setTotal((s + t + su + r).toFixed(2));
  };

  const handleSave = async () => {
    if (!invoice) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        client_name: clientName.trim() || null,
        client_email: clientEmail.trim(),
        payer_type: payerType,
        payer_name: payerName.trim() || null,
        service_type: serviceType.trim() || null,
        duration_hours: durationHours ? parseFloat(durationHours) : null,
        subtotal: parseFloat(subtotal) || 0,
        tax: parseFloat(tax) || 0,
        surge_amount: parseFloat(surgeAmount) || 0,
        rush_amount: parseFloat(rushAmount) || 0,
        total: parseFloat(total) || 0,
        payment_terms_days: paymentTermsDays ? parseInt(paymentTermsDays) : null,
        due_date: dueDate ? new Date(dueDate + "T12:00:00").toISOString() : null,
        payment_note: paymentNote.trim() || null,
      };

      const { error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", invoice.id);

      if (error) throw error;

      toast.success(`Invoice ${invoice.invoice_number} updated`);
      onSaved({ id: invoice.id, ...updates } as any);
    } catch (e: any) {
      toast.error(`Save failed: ${e.message || "Unknown error"}`);
    }
    setSaving(false);
  };

  if (!invoice) return null;

  const isStripePaid = !!invoice.stripe_payment_intent_id && invoice.document_status === "paid";

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Read-only fields */}
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div><span className="font-medium">Invoice #:</span> {invoice.invoice_number}</div>
            <div><span className="font-medium">Order:</span> {invoice.booking_code}</div>
            {isStripePaid && (
              <div className="text-amber-700 text-xs mt-1">
                ⚠ This invoice was paid via Stripe. Financial edits will not change the Stripe charge.
              </div>
            )}
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-client-name">Client Name</Label>
              <Input id="edit-client-name" value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-client-email">Client Email</Label>
              <Input id="edit-client-email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
            </div>
          </div>

          {/* Payer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payer Type</Label>
              <Select value={payerType} onValueChange={setPayerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYER_TYPES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-payer-name">Payer Name</Label>
              <Input id="edit-payer-name" placeholder="e.g. Blue Cross, VAC" value={payerName} onChange={e => setPayerName(e.target.value)} />
            </div>
          </div>

          {/* Service */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-service-type">Service Type</Label>
              <Input id="edit-service-type" value={serviceType} onChange={e => setServiceType(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-duration">Duration (hours)</Label>
              <Input id="edit-duration" type="number" step="0.5" min="0" value={durationHours} onChange={e => setDurationHours(e.target.value)} />
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-subtotal">Subtotal ($)</Label>
              <Input id="edit-subtotal" type="number" step="0.01" min="0" value={subtotal} onChange={e => setSubtotal(e.target.value)} onBlur={recalcTotal} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-tax">HST ($)</Label>
              <Input id="edit-tax" type="number" step="0.01" min="0" value={tax} onChange={e => setTax(e.target.value)} onBlur={recalcTotal} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-surge">Surge ($)</Label>
              <Input id="edit-surge" type="number" step="0.01" min="0" value={surgeAmount} onChange={e => setSurgeAmount(e.target.value)} onBlur={recalcTotal} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-rush">Rush ($)</Label>
              <Input id="edit-rush" type="number" step="0.01" min="0" value={rushAmount} onChange={e => setRushAmount(e.target.value)} onBlur={recalcTotal} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-total">Total ($)</Label>
            <Input id="edit-total" type="number" step="0.01" min="0" value={total} onChange={e => setTotal(e.target.value)} className="font-bold text-lg" />
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-terms">Payment Terms (days)</Label>
              <Input id="edit-terms" type="number" min="0" value={paymentTermsDays} onChange={e => setPaymentTermsDays(e.target.value)} placeholder="e.g. 14" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-due">Due Date</Label>
              <Input id="edit-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-note">Admin Note</Label>
            <Textarea id="edit-note" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} rows={2} placeholder="Internal note..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canonicalEmail: string;
  canonicalName?: string;
  canonicalPhone?: string;
  suggestedAliasEmail?: string;
  onMerged?: () => void;
}

export const ClientMergeDialog = ({
  open, onOpenChange, canonicalEmail, canonicalName, canonicalPhone,
  suggestedAliasEmail, onMerged,
}: Props) => {
  const [aliasEmail, setAliasEmail] = useState(suggestedAliasEmail || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const handleMerge = async () => {
    if (!aliasEmail.trim() || aliasEmail.trim().toLowerCase() === canonicalEmail.toLowerCase()) {
      toast({ title: "Invalid alias", description: "Alias email must differ from canonical email.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_merge_clients", {
      p_canonical_email: canonicalEmail,
      p_alias_email: aliasEmail.trim(),
      p_canonical_name: canonicalName || null,
      p_canonical_phone: canonicalPhone || null,
      p_note: note || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Merge failed", description: error.message, variant: "destructive" });
      return;
    }
    const r = data as any;
    toast({
      title: "Clients merged",
      description: `${r?.bookings || 0} bookings, ${r?.invoices || 0} invoices, ${r?.other || 0} other rows updated.`,
    });
    onOpenChange(false);
    onMerged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Merge duplicate client
          </DialogTitle>
          <DialogDescription>
            All bookings, invoices, payments, and notes from the alias email will be re-attached to the canonical client. This action is logged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Canonical (keep)</Label>
            <Input value={canonicalEmail} disabled />
          </div>
          <div>
            <Label>Alias email to merge in</Label>
            <Input
              value={aliasEmail}
              onChange={(e) => setAliasEmail(e.target.value)}
              placeholder="old-or-misspelled@example.com"
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for merge" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleMerge} disabled={busy || !aliasEmail.trim()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

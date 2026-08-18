// Admin view for multi-day Home Care booking groups.
// One parent group → one grouped invoice → N independently managed visits.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CalendarDays, FileText, Download, Mail, RefreshCw, XCircle, Users, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { viewGroupInvoice, downloadGroupInvoicePdf } from "./GroupInvoiceDocument";
import { CancelOrderDialog } from "./CancelOrderDialog";

interface GroupVisit {
  id: string;
  bookingCode: string;
  visitIndex: number | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  hours: number | null;
  status: string;
  paymentStatus: string;
  assignedPswName: string | null;
  assignedPswId: string | null;
  cancelledAt: string | null;
  allocatedTotal: number | null;
}

interface BookingGroup {
  id: string;
  groupCode: string | null;
  createdAt: string;
  clientName: string | null;
  clientEmail: string | null;
  patientName: string | null;
  status: string;
  paymentStatus: string;
  paymentIntentId: string | null;
  subtotal: number;
  total: number;
  visitCount: number;
  totalHours: number;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  invoicePaidAt: string | null;
  visits: GroupVisit[];
}

const money = (n: unknown) => `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

const statusTone = (s: string) =>
  s === "cancelled" ? "bg-destructive/10 text-destructive border-destructive/20"
    : s === "completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : s === "assigned" || s === "in_progress" ? "bg-blue-100 text-blue-800 border-blue-200"
    : "bg-amber-100 text-amber-800 border-amber-200";

export const BookingGroupsSection = () => {
  const [groups, setGroups] = useState<BookingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ group: BookingGroup; visit: GroupVisit } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_booking_groups");
    if (error) {
      toast.error("Could not load booking groups");
      setGroups([]);
    } else {
      setGroups((data as unknown as BookingGroup[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const withInvoice = async (group: BookingGroup, action: "view" | "download") => {
    if (!group.invoiceId) { toast.error("No grouped invoice yet — payment not finalized."); return; }
    setBusy(group.id);
    const { data } = await supabase
      .from("invoices")
      .select("invoice_number, booking_code, client_name, client_email, total, subtotal, currency, paid_at, pricing_snapshot, html_snapshot, stripe_payment_intent_id")
      .eq("id", group.invoiceId)
      .maybeSingle();
    setBusy(null);
    if (!data) { toast.error("Invoice not found"); return; }
    action === "view" ? viewGroupInvoice(data) : downloadGroupInvoicePdf(data);
  };

  const resendInvoiceEmail = async (group: BookingGroup) => {
    if (!group.invoiceId) { toast.error("No grouped invoice to send yet."); return; }
    setBusy(group.id);
    const { data, error } = await supabase.functions.invoke("send-group-invoice-email", {
      body: { groupId: group.id, force: true },
    });
    setBusy(null);
    if (error || data?.error) toast.error("Send failed — the payment and invoice are unaffected.");
    else toast.success(`Grouped invoice ${data?.invoice_number || ""} re-sent`);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading multi-day groups…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-40" />
        No multi-day booking groups yet.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {groups.length} multi-day group{groups.length === 1 ? "" : "s"} — Home Care only, one invoice per group.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {groups.map((g) => (
          <AccordionItem key={g.id} value={g.id} className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-1 flex-wrap items-center gap-3 pr-3 text-left">
                <span className="font-semibold">{g.groupCode || "GRP-—"}</span>
                <Badge variant="outline" className={statusTone(g.status)}>{g.status}</Badge>
                <Badge variant="outline" className={g.paymentStatus === "paid"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"}>
                  {g.paymentStatus}
                </Badge>
                <span className="text-sm text-muted-foreground">{g.clientName}</span>
                <span className="ml-auto text-sm font-semibold">{money(g.total)}</span>
                <span className="text-xs text-muted-foreground">
                  {g.visitCount} visit{g.visitCount === 1 ? "" : "s"} · {Number(g.totalHours || 0)} hr
                </span>
              </div>
            </AccordionTrigger>

            <AccordionContent className="pb-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
                  <p className="font-medium">{g.clientName}</p>
                  <p className="text-muted-foreground text-xs">{g.clientEmail}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Patient</p>
                  <p className="font-medium">{g.patientName || g.clientName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Stripe PaymentIntent</p>
                  <p className="font-mono text-xs break-all">{g.paymentIntentId || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Lump-sum total</p>
                  <p className="font-semibold">{money(g.total)}</p>
                  <p className="text-xs text-muted-foreground">HST non-taxable · no parking</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {g.invoiceNumber || "No grouped invoice yet"}
                </Badge>
                <Badge variant="outline" className={g.invoiceStatus === "sent"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : g.invoiceStatus === "email_failed"
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-muted"}>
                  <Mail className="w-3.5 h-3.5 mr-1" />
                  {g.invoiceStatus === "sent" ? "Email sent"
                    : g.invoiceStatus === "email_failed" ? "Email failed"
                    : g.invoiceStatus || "not generated"}
                </Badge>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy === g.id || !g.invoiceId}
                    onClick={() => withInvoice(g, "view")}>
                    <FileText className="w-4 h-4 mr-1.5" /> View invoice
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === g.id || !g.invoiceId}
                    onClick={() => withInvoice(g, "download")}>
                    <Download className="w-4 h-4 mr-1.5" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === g.id || !g.invoiceId}
                    onClick={() => resendInvoiceEmail(g)}>
                    <Mail className="w-4 h-4 mr-1.5" /> Resend email
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Visits — each dispatched, managed and cancelled independently
              </p>
              <div className="space-y-2">
                {g.visits.map((v) => (
                  <div key={v.id}
                    className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{v.bookingCode}</span>
                    <span>{v.scheduledDate}</span>
                    <span className="text-muted-foreground">{v.startTime}–{v.endTime}</span>
                    <span className="text-muted-foreground">{Number(v.hours || 0)} hr</span>
                    <Badge variant="outline" className={statusTone(v.status)}>{v.status}</Badge>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Users className="w-3.5 h-3.5" />
                      {v.assignedPswName || "Unassigned"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Frozen value {money(v.allocatedTotal)}
                    </span>
                    {v.cancelledAt && (
                      <span className="text-xs text-destructive">
                        Cancelled {new Date(v.cancelledAt).toLocaleDateString("en-CA")}
                      </span>
                    )}
                    {v.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" className="ml-auto text-destructive"
                        onClick={() => setCancelTarget({ group: g, visit: v })}>
                        <XCircle className="w-4 h-4 mr-1.5" /> Cancel this visit
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {cancelTarget && (
        <CancelOrderDialog
          open={!!cancelTarget}
          onOpenChange={(o) => !o && setCancelTarget(null)}
          bookingId={cancelTarget.visit.id}
          bookingCode={cancelTarget.visit.bookingCode}
          clientName={cancelTarget.group.clientName || ""}
          clientEmail={cancelTarget.group.clientEmail || ""}
          pswAssigned={cancelTarget.visit.assignedPswName}
          paymentStatus={cancelTarget.visit.paymentStatus}
          onCancelled={() => { setCancelTarget(null); load(); }}
        />
      )}
    </div>
  );
};

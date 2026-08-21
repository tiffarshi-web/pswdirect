import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  bookingId: string;
}

interface LogRow {
  id: string;
  template_key: string;
  recipient_email: string;
  status: string;
  psw_display_name: string | null;
  assignment_version: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const statusStyles: Record<string, string> = {
  sent: "bg-green-100 text-green-700 border-green-300",
  failed: "bg-red-100 text-red-700 border-red-300",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
};

export const AssignmentEmailHistoryPanel = ({ bookingId }: Props) => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("psw_assignment_email_log")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });
    setRows((data as LogRow[]) || []);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const resend = async (row: LogRow) => {
    setRetryingId(row.id);
    try {
      const fn = row.template_key === "psw_reassigned"
        ? "send-psw-reassigned-email"
        : "send-psw-assignment-email";
      const { data, error } = await supabase.functions.invoke(fn, {
        body: {
          booking_id: bookingId,
          assignment_version: row.assignment_version,
          force_resend: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.success === false) {
        throw new Error((data as any)?.error || "Send failed");
      }
      toast({ title: "Assignment email resent", description: row.recipient_email });
      await load();
    } catch (err: any) {
      toast({
        title: "Resend failed",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-foreground flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" />
        Assignment Email History
      </h4>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No assignment emails sent yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border p-3 text-xs space-y-1 bg-card"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium text-foreground">
                  {row.template_key === "psw_reassigned"
                    ? "PSW reassignment email sent"
                    : "PSW assignment email sent"}
                </span>
                <Badge variant="outline" className={statusStyles[row.status] || ""}>
                  {row.status}
                </Badge>
              </div>
              <div className="text-muted-foreground">Recipient: {row.recipient_email}</div>
              <div className="text-muted-foreground">
                Assigned PSW: {row.psw_display_name || "—"}
              </div>
              <div className="text-muted-foreground">
                {new Date(row.updated_at || row.created_at).toLocaleString("en-CA")}
              </div>
              {row.error_message && (
                <div className="text-destructive">Error: {row.error_message}</div>
              )}
              {row.status !== "sent" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 gap-2"
                  disabled={retryingId === row.id}
                  onClick={() => resend(row)}
                >
                  {retryingId === row.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Retry send
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

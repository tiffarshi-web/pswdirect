import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, FileText, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  getAllPendingUpdates,
  approvePendingUpdate,
  rejectPendingUpdate,
  FIELD_LABELS,
  type PendingUpdate,
} from "@/lib/pswPendingUpdates";

type Row = PendingUpdate & {
  psw: { firstName: string; lastName: string; email: string } | null;
};

const renderValue = (val: any) => {
  if (!val) return <span className="text-muted-foreground italic">none</span>;
  if (typeof val === "object" && val.url) {
    return (
      <a
        href={val.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        <FileText className="w-3 h-3" />
        {val.name || "Document"}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }
  return <span className="text-foreground">{String(val)}</span>;
};

export const PendingPSWUpdatesSection = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getAllPendingUpdates();
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    const ok = await approvePendingUpdate(id, notes[id]);
    setBusyId(null);
    if (ok) {
      toast.success("Update approved", { description: "Verified document replaced." });
      load();
    } else {
      toast.error("Failed to approve update");
    }
  };

  const handleReject = async (id: string) => {
    if (!notes[id] || notes[id].trim().length < 3) {
      toast.error("Please add a short reason for the rejection");
      return;
    }
    setBusyId(id);
    const ok = await rejectPendingUpdate(id, notes[id]);
    setBusyId(null);
    if (ok) {
      toast.success("Update rejected");
      load();
    } else {
      toast.error("Failed to reject update");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Pending PSW Updates
            {rows.length > 0 && <Badge variant="secondary">{rows.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending updates.</p>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {r.psw ? `${r.psw.firstName} ${r.psw.lastName}` : "Unknown PSW"}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.psw?.email}</p>
                    </div>
                    <Badge variant="outline">
                      {FIELD_LABELS[r.fieldName] || r.fieldName}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Current
                      </p>
                      {renderValue(r.oldValue)}
                    </div>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Proposed
                      </p>
                      {renderValue(r.newValue)}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(r.submittedAt).toLocaleString()}
                  </p>

                  <Textarea
                    placeholder="Optional note (required if rejecting)"
                    value={notes[r.id] || ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                    }
                    rows={2}
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(r.id)}
                      disabled={busyId === r.id}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(r.id)}
                      disabled={busyId === r.id}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

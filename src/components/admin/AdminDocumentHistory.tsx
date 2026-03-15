import { useState, useEffect } from "react";
import { FileText, CheckCircle, Clock, XCircle, Eye, ThumbsUp, ThumbsDown, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { openPswDocument } from "@/lib/storageUtils";

interface DocumentRecord {
  id: string;
  psw_id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  version_number: number;
  uploaded_at: string;
  verified_by_admin: string | null;
  verified_at: string | null;
  status: string;
  admin_notes: string | null;
}

interface AdminDocumentHistoryProps {
  pswId: string;
  pswName: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  psw_certificate: "PSW Certificate",
  police_check: "Vulnerable Sector Check",
  gov_id: "Government ID",
  profile_photo: "Profile Photo",
  vehicle_photo: "Vehicle Photo",
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    case "pending":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/10 text-red-600 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    case "superseded":
      return <Badge variant="secondary">Superseded</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const AdminDocumentHistory = ({ pswId, pswName }: AdminDocumentHistoryProps) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDoc, setActionDoc] = useState<DocumentRecord | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "request_reupload" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("psw_documents")
        .select("*")
        .eq("psw_id", pswId)
        .order("document_type", { ascending: true })
        .order("version_number", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [pswId]);

  const handleAction = async () => {
    if (!actionDoc || !actionType) return;
    setProcessing(true);

    try {
      const newStatus = actionType === "approve" ? "approved" : actionType === "reject" ? "rejected" : "rejected";

      const { data: { user } } = await supabase.auth.getUser();

      const updateData: Record<string, any> = {
        status: newStatus,
        admin_notes: adminNotes || null,
      };

      if (actionType === "approve") {
        updateData.verified_by_admin = user?.id || null;
        updateData.verified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("psw_documents")
        .update(updateData)
        .eq("id", actionDoc.id);

      if (error) throw error;

      // Also update psw_profiles for backward compatibility
      if (actionType === "approve") {
        if (actionDoc.document_type === "psw_certificate") {
          await supabase.from("psw_profiles").update({ psw_cert_status: "verified" }).eq("id", pswId);
        } else if (actionDoc.document_type === "gov_id") {
          await supabase.from("psw_profiles").update({ gov_id_status: "verified" }).eq("id", pswId);
        }
      }

      // Notify PSW
      const { data: pswProfile } = await supabase.from("psw_profiles").select("email").eq("id", pswId).maybeSingle();
      if (pswProfile?.email) {
        const docLabel = DOC_TYPE_LABELS[actionDoc.document_type] || actionDoc.document_type;
        const title = actionType === "approve"
          ? `✅ ${docLabel} Verified`
          : actionType === "reject"
          ? `❌ ${docLabel} Rejected`
          : `🔄 ${docLabel} — Reupload Required`;
        const body = actionType === "approve"
          ? `Your ${docLabel} (v${actionDoc.version_number}) has been verified by an administrator.`
          : actionType === "reject"
          ? `Your ${docLabel} (v${actionDoc.version_number}) was rejected.${adminNotes ? ` Reason: ${adminNotes}` : ""}`
          : `Your ${docLabel} needs to be reuploaded.${adminNotes ? ` Reason: ${adminNotes}` : ""}`;

        await supabase.from("notifications").insert({
          user_email: pswProfile.email,
          title,
          body,
          type: "document_review",
        });
      }

      toast.success(`Document ${actionType === "approve" ? "approved" : actionType === "reject" ? "rejected" : "reupload requested"}`);
      setActionDoc(null);
      setActionType(null);
      setAdminNotes("");
      await loadDocuments();
    } catch (err: any) {
      toast.error("Action failed", { description: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDocument = async (fileUrl: string) => {
    const opened = await openPswDocument(fileUrl);
    if (!opened) toast.error("Could not open document");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
          Loading document history...
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Document History — {pswName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Document History — {pswName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map(doc => (
                  <TableRow key={doc.id} className={doc.status === "superseded" ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </TableCell>
                    <TableCell>v{doc.version_number}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(doc.uploaded_at).toLocaleDateString("en-CA")}
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.verified_at
                        ? new Date(doc.verified_at).toLocaleDateString("en-CA")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc.file_url)}>
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        {doc.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={() => { setActionDoc(doc); setActionType("approve"); }}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => { setActionDoc(doc); setActionType("reject"); }}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-600 hover:text-amber-700"
                              onClick={() => { setActionDoc(doc); setActionType("request_reupload"); }}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {documents.some(d => d.admin_notes) && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Admin Notes:</p>
              {documents.filter(d => d.admin_notes).map(d => (
                <div key={d.id} className="text-xs bg-muted/50 rounded p-2">
                  <span className="font-medium">{DOC_TYPE_LABELS[d.document_type]} v{d.version_number}:</span>{" "}
                  {d.admin_notes}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionDoc && !!actionType} onOpenChange={() => { setActionDoc(null); setActionType(null); setAdminNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Document"}
              {actionType === "reject" && "Reject Document"}
              {actionType === "request_reupload" && "Request Reupload"}
            </DialogTitle>
          </DialogHeader>
          {actionDoc && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Document:</span> {DOC_TYPE_LABELS[actionDoc.document_type]}</p>
                <p><span className="font-medium">Version:</span> v{actionDoc.version_number}</p>
                <p><span className="font-medium">File:</span> {actionDoc.file_name || "Unknown"}</p>
              </div>
              {(actionType === "reject" || actionType === "request_reupload") && (
                <div>
                  <p className="text-sm font-medium mb-1">
                    {actionType === "reject" ? "Rejection reason:" : "Reason for reupload:"}
                  </p>
                  <Textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Enter notes for the PSW..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDoc(null); setActionType(null); setAdminNotes(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionType === "approve" ? "default" : "destructive"}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {actionType === "approve" ? "Approve" : actionType === "reject" ? "Reject" : "Request Reupload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

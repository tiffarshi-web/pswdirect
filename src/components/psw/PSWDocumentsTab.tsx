import { useState, useEffect, useRef } from "react";
import { FileText, Upload, CheckCircle, Clock, XCircle, Shield, Award, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { openPswDocument } from "@/lib/storageUtils";

interface DocumentRecord {
  id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  version_number: number;
  uploaded_at: string;
  status: string;
  verified_at: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  psw_certificate: "PSW Certificate",
  police_check: "Vulnerable Sector Check (VSC)",
  gov_id: "Government ID",
  profile_photo: "Profile Photo",
  vehicle_photo: "Vehicle Photo",
};

const UPLOADABLE_DOC_TYPES = [
  { type: "psw_certificate", docType: "psw-certificate", label: "PSW Certificate" },
  { type: "police_check", docType: "police-check", label: "Vulnerable Sector Check" },
  { type: "gov_id", docType: "gov-id", label: "Government ID" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
    case "pending":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/10 text-red-600 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    case "superseded":
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Superseded</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const PSWDocumentsTab = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDocuments = async () => {
    if (!user?.email) return;

    try {
      // Get PSW profile id
      const { data: profile } = await supabase
        .from("psw_profiles")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

      if (!profile?.id) return;

      const { data, error } = await supabase
        .from("psw_documents")
        .select("*")
        .eq("psw_id", profile.id)
        .order("document_type", { ascending: true })
        .order("version_number", { ascending: false });

      if (error) {
        console.error("Error loading documents:", error);
        return;
      }

      setDocuments(data || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [user?.email]);

  const handleUpload = async (docType: string, file: File) => {
    if (!user?.email) return;

    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    setUploading(docType);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);

      const { data: { session } } = await supabase.auth.getSession();
      
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/upload-psw-document`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      toast.success("Document uploaded successfully", {
        description: `Version ${result.versionNumber} uploaded. Pending admin review.`,
      });

      await loadDocuments();
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (docType: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(docType, file);
    // Reset input
    if (e.target) e.target.value = "";
  };

  const handleViewDocument = async (fileUrl: string) => {
    const opened = await openPswDocument(fileUrl);
    if (!opened) toast.error("Could not open document");
  };

  // Group documents by type
  const groupedDocs = UPLOADABLE_DOC_TYPES.map(({ type, docType, label }) => {
    const docs = documents.filter(d => d.document_type === type);
    const current = docs.find(d => d.status !== "superseded") || docs[0];
    return { type, docType, label, docs, current };
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading documents...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            My Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {groupedDocs.map(({ type, docType, label, docs, current }) => (
            <div key={type} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{label}</span>
                </div>
                {current && getStatusBadge(current.status)}
              </div>

              {current && (
                <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Current Version: <span className="font-medium text-foreground">v{current.version_number}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDocument(current.file_url)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uploaded: {new Date(current.uploaded_at).toLocaleDateString("en-CA")}
                    {current.file_name && ` · ${current.file_name}`}
                  </p>
                  {current.verified_at && (
                    <p className="text-xs text-emerald-600">
                      Verified: {new Date(current.verified_at).toLocaleDateString("en-CA")}
                    </p>
                  )}
                </div>
              )}

              {!current && (
                <p className="text-sm text-muted-foreground">No document uploaded yet.</p>
              )}

              {/* Previous versions */}
              {docs.filter(d => d.id !== current?.id).length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Previous versions ({docs.filter(d => d.id !== current?.id).length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {docs.filter(d => d.id !== current?.id).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between pl-4 py-1 border-l-2 border-muted">
                        <span className="text-muted-foreground">
                          v{doc.version_number} · {new Date(doc.uploaded_at).toLocaleDateString("en-CA")}
                        </span>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(doc.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc.file_url)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Upload button */}
              <div>
                <input
                  ref={el => { fileInputRefs.current[docType] = el; }}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileChange(docType)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRefs.current[docType]?.click()}
                  disabled={uploading === docType}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {uploading === docType
                    ? "Uploading..."
                    : current
                    ? "Upload Updated Version"
                    : "Upload Document"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

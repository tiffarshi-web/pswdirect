import { useState, useRef } from "react";
import { Upload, Camera, X, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadedDoc {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface CareSheetDocUploadProps {
  bookingId: string;
  pswId: string;
  uploadedDocs: UploadedDoc[];
  onDocsChange: (docs: UploadedDoc[]) => void;
  disabled?: boolean;
}

export const CareSheetDocUpload = ({
  bookingId,
  pswId,
  uploadedDocs,
  onDocsChange,
  disabled = false,
}: CareSheetDocUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newDocs: UploadedDoc[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        const ext = file.name.split(".").pop() || "jpg";
        const timestamp = Date.now();
        const storagePath = `${pswId}/care-sheet-docs/${bookingId}/${timestamp}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("psw-documents")
          .upload(storagePath, file, { upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Get signed URL for immediate display
        const { data: signedData } = await supabase.storage
          .from("psw-documents")
          .createSignedUrl(storagePath, 60 * 60 * 24); // 24h

        newDocs.push({
          name: file.name,
          url: storagePath, // Store path, not signed URL
          type: file.type,
          size: file.size,
        });
      }

      if (newDocs.length > 0) {
        onDocsChange([...uploadedDocs, ...newDocs]);
        toast.success(`${newDocs.length} document(s) uploaded`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDoc = (index: number) => {
    const updated = uploadedDocs.filter((_, i) => i !== index);
    onDocsChange(updated);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-4 h-4 text-primary" />;
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium">
          📄 Discharge / Hospital Paperwork
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload or photograph discharge papers, hospital forms, or medical documents
        </p>
      </div>

      {/* Uploaded files list */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-1.5">
          {uploadedDocs.map((doc, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border"
            >
              {getFileIcon(doc.type)}
              <span className="flex-1 text-xs truncate">{doc.name}</span>
              <span className="text-xs text-muted-foreground">
                {(doc.size / 1024).toFixed(0)}KB
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeDoc(i)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      {!disabled && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-1" />
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute("capture", "environment");
                fileInputRef.current.click();
                // Remove capture after click to not affect future uploads
                setTimeout(() => fileInputRef.current?.removeAttribute("capture"), 500);
              }
            }}
            disabled={isUploading}
          >
            <Camera className="w-4 h-4 mr-1" />
            Take Photo
          </Button>
        </div>
      )}
    </div>
  );
};

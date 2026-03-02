import { supabase } from "@/integrations/supabase/client";

/**
 * Extract the storage file path from a Supabase storage URL (signed or public).
 * Returns the path relative to the bucket root.
 */
export function extractStoragePath(url: string, bucket: string): string | null {
  if (!url) return null;
  
  // If it's already a plain path (no http), return as-is
  if (!url.startsWith("http")) return url;

  // Match patterns like /storage/v1/object/sign/bucket-name/PATH or /storage/v1/object/public/bucket-name/PATH
  const patterns = [
    new RegExp(`/storage/v1/object/sign/${bucket}/(.+?)(?:\\?|$)`),
    new RegExp(`/storage/v1/object/public/${bucket}/(.+?)(?:\\?|$)`),
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
}

/**
 * Open a file from psw-documents bucket with a fresh signed URL.
 * Extracts the path from the stored URL and generates a new 1-hour signed link.
 */
export async function openPswDocument(storedUrl: string): Promise<boolean> {
  try {
    const path = extractStoragePath(storedUrl, "psw-documents");
    // If path is a raw storage path (no http), use it directly; otherwise extract from URL
    const storagePath = path || storedUrl;
    
    console.log("[openPswDocument] Generating signed URL for path:", storagePath);

    const { data, error } = await supabase.storage
      .from("psw-documents")
      .createSignedUrl(storagePath, 60 * 60); // 1 hour

    if (error) {
      console.error("[openPswDocument] Signed URL error:", error.message);
    }

    if (data?.signedUrl) {
      console.log("[openPswDocument] Opening signed URL");
      window.open(data.signedUrl, "_blank");
      return true;
    }

    // Last resort: build a public-style URL manually
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const directUrl = `${supabaseUrl}/storage/v1/object/psw-documents/${encodeURIComponent(storagePath)}`;
      console.log("[openPswDocument] Falling back to direct URL");
      window.open(directUrl, "_blank");
      return true;
    }

    return false;
  } catch (err) {
    console.error("[openPswDocument] Unexpected error:", err);
    return false;
  }
}

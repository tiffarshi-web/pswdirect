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
  const path = extractStoragePath(storedUrl, "psw-documents");
  if (!path) {
    // Fallback: try opening the URL directly
    window.open(storedUrl, "_blank");
    return true;
  }

  const { data, error } = await supabase.storage
    .from("psw-documents")
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (data?.signedUrl) {
    window.open(data.signedUrl, "_blank");
    return true;
  }

  console.error("Failed to generate signed URL:", error);
  return false;
}

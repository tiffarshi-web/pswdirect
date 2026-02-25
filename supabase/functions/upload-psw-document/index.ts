import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("user_id") as string | null;
    const docType = formData.get("doc_type") as string | null; // profile-photo, police-check, vehicle-photo, gov-id

    if (!file || !userId || !docType) {
      return new Response(
        JSON.stringify({ error: "Missing file, user_id, or doc_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate doc_type
    const validTypes = ["profile-photo", "police-check", "vehicle-photo", "gov-id"];
    if (!validTypes.includes(docType)) {
      return new Response(
        JSON.stringify({ error: "Invalid doc_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create a unique file path
    const ext = file.name.split(".").pop() || "bin";
    const filePath = docType === "gov-id"
      ? `${userId}/gov-id/${Date.now()}.${ext}`
      : `${userId}/${docType}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("psw-documents")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get signed URL (bucket is now private)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("psw-documents")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    const fileUrl = signedData?.signedUrl || filePath;

    // If gov-id, update psw_profiles with the URL and status
    if (docType === "gov-id") {
      const govIdType = formData.get("gov_id_type") as string || "other";
      await supabase
        .from("psw_profiles")
        .update({
          gov_id_url: filePath, // Store path, not signed URL
          gov_id_status: "uploaded",
          gov_id_type: govIdType,
        })
        .eq("id", userId);
    }

    return new Response(
      JSON.stringify({ url: fileUrl, filePath, fileName: file.name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("upload-psw-document error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

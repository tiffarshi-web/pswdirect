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
    const requestedUserId = (formData.get("user_id") as string | null)?.trim() || null;
    const docType = formData.get("doc_type") as string | null;

    if (!file || !docType) {
      return new Response(
        JSON.stringify({ error: "Missing file or doc_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate doc_type
    const validTypes = ["profile-photo", "police-check", "vehicle-photo", "gov-id", "psw-certificate"];
    if (!validTypes.includes(docType)) {
      return new Response(
        JSON.stringify({ error: "Invalid doc_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Auth check (optional for signup flow) ---
    const authHeader = req.headers.get("Authorization");
    let user: { email?: string } | null = null;
    let callerIsAdmin = false;

    if (authHeader?.startsWith("Bearer ")) {
      const callerClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser } } = await callerClient.auth.getUser();
      user = authUser;

      if (user) {
        const { data: isAdmin } = await callerClient.rpc("is_admin");
        callerIsAdmin = !!isAdmin;
      }
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let targetPswId: string | null = null;

    if (user && callerIsAdmin) {
      // Admin: must provide user_id
      if (!requestedUserId) {
        return new Response(
          JSON.stringify({ error: "Admin uploads require user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetPswId = requestedUserId;
    } else if (user) {
      // Authenticated PSW: use own profile
      const { data: ownProfile } = await adminClient
        .from("psw_profiles")
        .select("id")
        .eq("email", user.email || "")
        .maybeSingle();

      if (!ownProfile?.id) {
        return new Response(
          JSON.stringify({ error: "Forbidden: PSW profile not found for authenticated user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (requestedUserId && requestedUserId !== ownProfile.id) {
        return new Response(
          JSON.stringify({ error: "Forbidden: you can only upload documents for your own profile" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetPswId = ownProfile.id;
    } else {
      // Unauthenticated (signup flow): must provide user_id (temp UUID)
      if (!requestedUserId) {
        return new Response(
          JSON.stringify({ error: "Missing user_id for signup upload" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Validate it looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(requestedUserId)) {
        return new Response(
          JSON.stringify({ error: "Invalid user_id format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetPswId = requestedUserId;
    }

    if (!targetPswId) {
      return new Response(
        JSON.stringify({ error: "Missing target PSW profile" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS for upload + profile updates
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create a unique file path
    const ext = file.name.split(".").pop() || "bin";
    const filePath = docType === "gov-id"
      ? `${targetPswId}/gov-id/${Date.now()}.${ext}`
      : docType === "psw-certificate"
      ? `${targetPswId}/psw-certificate/${Date.now()}.${ext}`
      : `${targetPswId}/${docType}-${Date.now()}.${ext}`;

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

    // Only update psw_profiles if the user is authenticated (profile already exists)
    // During signup flow (unauthenticated), the profile doesn't exist yet
    if (user) {
      // If gov-id, update psw_profiles with the URL and status
      if (docType === "gov-id") {
        const govIdType = formData.get("gov_id_type") as string || "other";
        await supabase
          .from("psw_profiles")
          .update({
            gov_id_url: filePath,
            gov_id_status: "uploaded",
            gov_id_type: govIdType,
          })
          .eq("id", targetPswId);
      }

      // If police-check (VSC), reset verified date so admin must re-verify
      if (docType === "police-check") {
        await supabase
          .from("psw_profiles")
          .update({
            police_check_url: filePath,
            police_check_name: file.name,
            police_check_date: null,
          })
          .eq("id", targetPswId);
      }

      // If psw-certificate, update psw_profiles with the URL and status
      if (docType === "psw-certificate") {
        await supabase
          .from("psw_profiles")
          .update({
            psw_cert_url: filePath,
            psw_cert_name: file.name,
            psw_cert_status: "uploaded",
          })
          .eq("id", targetPswId);
      }
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

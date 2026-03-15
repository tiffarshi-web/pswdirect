import { createClient } from "npm:@supabase/supabase-js@2";

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
      if (!requestedUserId) {
        return new Response(
          JSON.stringify({ error: "Admin uploads require user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetPswId = requestedUserId;
    } else if (user) {
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
      if (!requestedUserId) {
        return new Response(
          JSON.stringify({ error: "Missing user_id for signup upload" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    // Map doc_type to document_type enum for psw_documents table
    const docTypeMap: Record<string, string> = {
      "psw-certificate": "psw_certificate",
      "police-check": "police_check",
      "gov-id": "gov_id",
      "profile-photo": "profile_photo",
      "vehicle-photo": "vehicle_photo",
    };
    const documentType = docTypeMap[docType] || docType;

    // Determine version number by checking existing documents
    let versionNumber = 1;
    const { data: existingDocs } = await supabase
      .from("psw_documents")
      .select("version_number")
      .eq("psw_id", targetPswId)
      .eq("document_type", documentType)
      .order("version_number", { ascending: false })
      .limit(1);

    if (existingDocs && existingDocs.length > 0) {
      versionNumber = existingDocs[0].version_number + 1;

      // Mark previous latest version as superseded
      await supabase
        .from("psw_documents")
        .update({ status: "superseded" })
        .eq("psw_id", targetPswId)
        .eq("document_type", documentType)
        .neq("status", "superseded");
    }

    // Create a unique versioned file path — NEVER overwrites
    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${targetPswId}/${documentType}/v${versionNumber}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("psw-documents")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false, // NEVER overwrite existing files
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get signed URL (bucket is private)
    const { data: signedData } = await supabase.storage
      .from("psw-documents")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    const fileUrl = signedData?.signedUrl || filePath;

    // Insert versioned document record
    await supabase.from("psw_documents").insert({
      psw_id: targetPswId,
      document_type: documentType,
      file_url: filePath,
      file_name: file.name,
      version_number: versionNumber,
      status: "pending",
    });

    // Update psw_profiles with latest file reference (backward compatibility)
    // Only update if the user is authenticated (profile already exists)
    if (user) {
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

    // Create admin notification for new document upload
    if (user && versionNumber >= 1) {
      // Get PSW name for notification
      const { data: pswProfile } = await supabase
        .from("psw_profiles")
        .select("first_name, last_name")
        .eq("id", targetPswId)
        .maybeSingle();

      if (pswProfile) {
        const pswName = `${pswProfile.first_name} ${pswProfile.last_name}`;
        const docLabel = documentType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

        // Get all admin emails
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminRoles && adminRoles.length > 0) {
          // Get admin emails from auth
          for (const adminRole of adminRoles) {
            const { data: adminUser } = await supabase.auth.admin.getUserById(adminRole.user_id);
            if (adminUser?.user?.email) {
              await supabase.from("notifications").insert({
                user_email: adminUser.user.email,
                title: `📄 New Document Upload`,
                body: `${pswName} uploaded a new ${docLabel} (v${versionNumber}). Please review and verify.`,
                type: "document_upload",
              });
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ url: fileUrl, filePath, fileName: file.name, versionNumber }),
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

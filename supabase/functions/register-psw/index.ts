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
    const body = await req.json();
    const { user_id, profile, banking } = body;

    if (!user_id || !profile || !profile.email || !profile.first_name || !profile.last_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, profile.email, profile.first_name, profile.last_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Insert PSW profile (use auth user ID as the profile ID)
    const { data: pswProfile, error: profileError } = await supabase
      .from("psw_profiles")
      .insert([{
        id: user_id,
        email: profile.email.toLowerCase(),
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone || null,
        gender: profile.gender || null,
        home_postal_code: profile.home_postal_code || null,
        home_city: profile.home_city || null,
        profile_photo_url: profile.profile_photo_url || null,
        profile_photo_name: profile.profile_photo_name || null,
        hscpoa_number: profile.hscpoa_number || null,
        police_check_url: profile.police_check_url || null,
        police_check_name: profile.police_check_name || null,
        police_check_date: profile.police_check_date || null,
        languages: profile.languages || ["en"],
        vetting_status: "pending",
        years_experience: profile.years_experience || null,
        certifications: profile.certifications || null,
        has_own_transport: profile.has_own_transport || null,
        license_plate: profile.license_plate || null,
        available_shifts: profile.available_shifts || null,
        vehicle_disclaimer: profile.vehicle_disclaimer || null,
        vehicle_photo_url: profile.vehicle_photo_url || null,
        vehicle_photo_name: profile.vehicle_photo_name || null,
        applied_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (profileError) {
      console.error("Profile insert error:", profileError);
      return new Response(
        JSON.stringify({ error: `Profile creation failed: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Insert banking info
    if (banking && banking.institution_number && banking.transit_number && banking.account_number) {
      const { error: bankingError } = await supabase
        .from("psw_banking")
        .insert([{
          psw_id: user_id,
          institution_number: banking.institution_number,
          transit_number: banking.transit_number,
          account_number: banking.account_number,
        }]);

      if (bankingError) {
        console.error("Banking insert error:", bankingError);
        // Don't fail the whole signup, but log it
      }
    }

    // 3. Insert user_roles entry
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert([{
        user_id: user_id,
        role: "psw",
      }]);

    if (roleError) {
      console.error("Role insert error:", roleError);
      // Don't fail the whole signup for this
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile_id: pswProfile.id,
        message: "PSW registration complete" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("register-psw error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

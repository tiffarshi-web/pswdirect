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
    const body = await req.json();
    const { email, password, profile, banking } = body;

    // Validate required fields
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile || !profile.first_name || !profile.last_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: profile.first_name, profile.last_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS and create auth account
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Create auth account using admin API
    console.log("Creating auth account for:", email);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm since we're creating via admin API
      user_metadata: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        full_name: `${profile.first_name} ${profile.last_name}`,
        phone: profile.phone || null,
        role: "psw",
      },
    });

    if (authError) {
      console.error("Auth account creation error:", authError);
      
      // Check for duplicate email
      if (authError.message?.includes("already") || authError.message?.includes("exists") || authError.message?.includes("duplicate")) {
        return new Response(
          JSON.stringify({ error: "An account with this email already exists. Please use a different email or login to your existing account." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Account creation failed: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    console.log("Auth account created:", userId);

    // 2. Geocode postal code if provided
    let homeLat: number | null = null;
    let homeLng: number | null = null;
    if (profile.home_postal_code) {
      try {
        const postalCode = profile.home_postal_code.replace(/\s/g, "+");
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?postalcode=${postalCode}&country=CA&format=json&limit=1`,
          { headers: { "User-Agent": "PSWDirect/1.0" } }
        );
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          homeLat = parseFloat(geoData[0].lat);
          homeLng = parseFloat(geoData[0].lon);
          console.log(`Geocoded ${profile.home_postal_code} → ${homeLat}, ${homeLng}`);
        }
      } catch (geoErr) {
        console.error("Geocoding failed (non-fatal):", geoErr);
      }
    }

    // 3. Insert PSW profile
    const { data: pswProfile, error: profileError } = await supabase
      .from("psw_profiles")
      .insert([{
        id: userId,
        email: email.toLowerCase(),
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone || null,
        gender: profile.gender || null,
        home_postal_code: profile.home_postal_code || null,
        home_city: profile.home_city || null,
        home_lat: homeLat,
        home_lng: homeLng,
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
        gov_id_type: profile.gov_id_type || "missing",
        gov_id_url: profile.gov_id_url || null,
        gov_id_status: profile.gov_id_status || "missing",
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

    // 4. Insert banking info
    if (banking && banking.institution_number && banking.transit_number && banking.account_number) {
      const { error: bankingError } = await supabase
        .from("psw_banking")
        .insert([{
          psw_id: userId,
          institution_number: banking.institution_number,
          transit_number: banking.transit_number,
          account_number: banking.account_number,
        }]);

      if (bankingError) {
        console.error("Banking insert error:", bankingError);
      }
    }

    // 5. Insert user_roles entry
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert([{
        user_id: userId,
        role: "psw",
      }]);

    if (roleError) {
      console.error("Role insert error:", roleError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
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

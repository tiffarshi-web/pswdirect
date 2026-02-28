import { createClient } from "npm:@supabase/supabase-js@2";

// Local FSA (Forward Sortation Area) coordinate lookup for Ontario postal codes
// Used as fallback when Nominatim API fails or returns no results
const FSA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Toronto (M prefix)
  "M1B":{lat:43.806,lng:-79.194},"M1C":{lat:43.784,lng:-79.160},"M1E":{lat:43.763,lng:-79.188},
  "M1G":{lat:43.770,lng:-79.216},"M1H":{lat:43.763,lng:-79.239},"M1J":{lat:43.744,lng:-79.239},
  "M1K":{lat:43.727,lng:-79.262},"M1L":{lat:43.711,lng:-79.284},"M1M":{lat:43.716,lng:-79.239},
  "M1N":{lat:43.692,lng:-79.264},"M1P":{lat:43.757,lng:-79.273},"M1R":{lat:43.750,lng:-79.295},
  "M1S":{lat:43.794,lng:-79.262},"M1T":{lat:43.781,lng:-79.304},"M1V":{lat:43.815,lng:-79.284},
  "M1W":{lat:43.799,lng:-79.318},"M1X":{lat:43.836,lng:-79.205},"M2H":{lat:43.803,lng:-79.359},
  "M2J":{lat:43.778,lng:-79.346},"M2K":{lat:43.786,lng:-79.385},"M2L":{lat:43.757,lng:-79.374},
  "M2M":{lat:43.789,lng:-79.408},"M2N":{lat:43.770,lng:-79.408},"M2P":{lat:43.752,lng:-79.408},
  "M2R":{lat:43.778,lng:-79.442},"M3A":{lat:43.753,lng:-79.329},"M3B":{lat:43.745,lng:-79.352},
  "M3C":{lat:43.725,lng:-79.340},"M3H":{lat:43.753,lng:-79.442},"M3J":{lat:43.767,lng:-79.487},
  "M3K":{lat:43.737,lng:-79.464},"M3L":{lat:43.739,lng:-79.509},"M3M":{lat:43.727,lng:-79.487},
  "M3N":{lat:43.761,lng:-79.521},"M4A":{lat:43.725,lng:-79.312},"M4B":{lat:43.706,lng:-79.312},
  "M4C":{lat:43.694,lng:-79.318},"M4E":{lat:43.677,lng:-79.295},"M4G":{lat:43.709,lng:-79.363},
  "M4H":{lat:43.704,lng:-79.352},"M4J":{lat:43.685,lng:-79.335},"M4K":{lat:43.679,lng:-79.352},
  "M4L":{lat:43.669,lng:-79.318},"M4M":{lat:43.660,lng:-79.340},"M4N":{lat:43.727,lng:-79.386},
  "M4P":{lat:43.711,lng:-79.386},"M4R":{lat:43.715,lng:-79.408},"M4S":{lat:43.702,lng:-79.386},
  "M4T":{lat:43.690,lng:-79.386},"M4V":{lat:43.685,lng:-79.397},"M4W":{lat:43.679,lng:-79.374},
  "M4X":{lat:43.667,lng:-79.363},"M4Y":{lat:43.664,lng:-79.383},"M5A":{lat:43.654,lng:-79.360},
  "M5B":{lat:43.656,lng:-79.377},"M5C":{lat:43.650,lng:-79.377},"M5E":{lat:43.643,lng:-79.372},
  "M5G":{lat:43.656,lng:-79.388},"M5H":{lat:43.650,lng:-79.388},"M5J":{lat:43.639,lng:-79.383},
  "M5K":{lat:43.648,lng:-79.383},"M5L":{lat:43.646,lng:-79.377},"M5M":{lat:43.733,lng:-79.419},
  "M5N":{lat:43.711,lng:-79.419},"M5P":{lat:43.694,lng:-79.408},"M5R":{lat:43.677,lng:-79.408},
  "M5S":{lat:43.660,lng:-79.397},"M5T":{lat:43.652,lng:-79.397},"M5V":{lat:43.641,lng:-79.397},
  "M6A":{lat:43.717,lng:-79.453},"M6B":{lat:43.709,lng:-79.442},"M6C":{lat:43.692,lng:-79.431},
  "M6E":{lat:43.688,lng:-79.453},"M6G":{lat:43.669,lng:-79.419},"M6H":{lat:43.667,lng:-79.442},
  "M6J":{lat:43.648,lng:-79.419},"M6K":{lat:43.637,lng:-79.431},"M6L":{lat:43.713,lng:-79.487},
  "M6M":{lat:43.694,lng:-79.476},"M6N":{lat:43.675,lng:-79.464},"M6P":{lat:43.662,lng:-79.464},
  "M6R":{lat:43.650,lng:-79.453},"M6S":{lat:43.650,lng:-79.476},"M7A":{lat:43.662,lng:-79.388},
  "M8V":{lat:43.604,lng:-79.501},"M8W":{lat:43.601,lng:-79.535},"M8X":{lat:43.653,lng:-79.509},
  "M8Y":{lat:43.636,lng:-79.498},"M8Z":{lat:43.623,lng:-79.521},"M9A":{lat:43.667,lng:-79.532},
  "M9B":{lat:43.650,lng:-79.555},"M9C":{lat:43.633,lng:-79.577},"M9L":{lat:43.755,lng:-79.543},
  "M9M":{lat:43.723,lng:-79.543},"M9N":{lat:43.706,lng:-79.521},"M9P":{lat:43.696,lng:-79.532},
  "M9R":{lat:43.688,lng:-79.555},"M9V":{lat:43.739,lng:-79.577},"M9W":{lat:43.706,lng:-79.589},
  // GTA / Peel / York / Durham (L prefix)
  "L1A":{lat:44.043,lng:-78.715},"L1B":{lat:44.040,lng:-78.715},"L1C":{lat:44.037,lng:-78.734},
  "L1E":{lat:43.897,lng:-78.865},"L1G":{lat:43.897,lng:-78.843},"L1H":{lat:43.903,lng:-78.854},
  "L1J":{lat:43.884,lng:-78.854},"L1K":{lat:43.865,lng:-78.832},"L1L":{lat:43.928,lng:-78.832},
  "L1M":{lat:43.934,lng:-78.877},"L1N":{lat:43.859,lng:-78.944},"L1P":{lat:43.872,lng:-78.922},
  "L1R":{lat:43.890,lng:-78.933},"L1S":{lat:43.840,lng:-79.023},"L1T":{lat:43.847,lng:-79.046},
  "L1V":{lat:43.822,lng:-79.091},"L1W":{lat:43.834,lng:-79.068},"L1X":{lat:43.815,lng:-79.046},
  "L1Y":{lat:43.828,lng:-79.113},"L1Z":{lat:43.815,lng:-79.125},"L3P":{lat:43.864,lng:-79.329},
  "L3R":{lat:43.851,lng:-79.374},"L3S":{lat:43.883,lng:-79.397},"L3T":{lat:43.857,lng:-79.431},
  "L4A":{lat:44.043,lng:-79.484},"L4B":{lat:43.851,lng:-79.397},"L4C":{lat:43.870,lng:-79.442},
  "L4E":{lat:43.908,lng:-79.442},"L4G":{lat:44.049,lng:-79.484},"L4H":{lat:43.826,lng:-79.543},
  "L4J":{lat:43.814,lng:-79.453},"L4K":{lat:43.826,lng:-79.487},"L4L":{lat:43.792,lng:-79.555},
  "L4M":{lat:44.389,lng:-79.690},"L4N":{lat:44.371,lng:-79.667},"L4S":{lat:43.895,lng:-79.464},
  "L4T":{lat:43.717,lng:-79.611},"L4V":{lat:43.695,lng:-79.600},"L4W":{lat:43.657,lng:-79.611},
  "L4X":{lat:43.632,lng:-79.589},"L4Y":{lat:43.620,lng:-79.577},"L4Z":{lat:43.607,lng:-79.600},
  "L5A":{lat:43.582,lng:-79.622},"L5B":{lat:43.595,lng:-79.634},"L5C":{lat:43.570,lng:-79.645},
  "L5E":{lat:43.557,lng:-79.589},"L5G":{lat:43.545,lng:-79.589},"L5H":{lat:43.532,lng:-79.589},
  "L5J":{lat:43.495,lng:-79.622},"L5K":{lat:43.532,lng:-79.645},"L5L":{lat:43.532,lng:-79.667},
  "L5M":{lat:43.557,lng:-79.690},"L5N":{lat:43.582,lng:-79.701},"L5P":{lat:43.595,lng:-79.679},
  "L5R":{lat:43.607,lng:-79.656},"L5S":{lat:43.689,lng:-79.634},"L5T":{lat:43.676,lng:-79.667},
  "L5V":{lat:43.645,lng:-79.690},"L5W":{lat:43.657,lng:-79.701},"L6A":{lat:43.833,lng:-79.566},
  "L6B":{lat:43.870,lng:-79.250},"L6C":{lat:43.889,lng:-79.318},"L6E":{lat:43.901,lng:-79.273},
  "L6G":{lat:43.926,lng:-79.340},"L6H":{lat:43.476,lng:-79.690},"L6J":{lat:43.451,lng:-79.679},
  "L6K":{lat:43.426,lng:-79.701},"L6L":{lat:43.414,lng:-79.724},"L6M":{lat:43.439,lng:-79.757},
  "L6P":{lat:43.799,lng:-79.611},"L6R":{lat:43.755,lng:-79.701},"L6S":{lat:43.736,lng:-79.735},
  "L6T":{lat:43.711,lng:-79.735},"L6V":{lat:43.689,lng:-79.735},"L6W":{lat:43.689,lng:-79.757},
  "L6X":{lat:43.705,lng:-79.780},"L6Y":{lat:43.724,lng:-79.780},"L6Z":{lat:43.761,lng:-79.769},
  "L7A":{lat:43.717,lng:-79.803},"L7C":{lat:43.767,lng:-79.791},"L7E":{lat:43.901,lng:-79.498},
  "L7G":{lat:43.717,lng:-80.039},"L7L":{lat:43.314,lng:-79.859},"L7M":{lat:43.339,lng:-79.803},
  "L7N":{lat:43.326,lng:-79.791},"L7P":{lat:43.351,lng:-79.814},"L8E":{lat:43.218,lng:-79.780},
  "L8G":{lat:43.230,lng:-79.769},"L8H":{lat:43.243,lng:-79.803},"L8J":{lat:43.205,lng:-79.769},
  "L8K":{lat:43.255,lng:-79.836},"L8L":{lat:43.249,lng:-79.848},"L8M":{lat:43.237,lng:-79.848},
  "L8N":{lat:43.255,lng:-79.859},"L8P":{lat:43.249,lng:-79.870},"L8R":{lat:43.262,lng:-79.870},
  "L8S":{lat:43.268,lng:-79.881},"L8T":{lat:43.249,lng:-79.893},"L8V":{lat:43.237,lng:-79.881},
  "L8W":{lat:43.212,lng:-79.859},"L9A":{lat:43.255,lng:-79.904},"L9B":{lat:43.224,lng:-79.926},
  "L9C":{lat:43.237,lng:-79.915},"L9H":{lat:43.274,lng:-79.949},"L9S":{lat:44.331,lng:-79.679},
  "L9T":{lat:43.507,lng:-79.881},"L9W":{lat:43.839,lng:-79.938},"L9X":{lat:44.287,lng:-79.724},
  "L9Y":{lat:44.506,lng:-79.881},"L9Z":{lat:44.431,lng:-79.927},
  // Ottawa / Eastern Ontario (K prefix)
  "K1A":{lat:45.421,lng:-75.699},"K1B":{lat:45.434,lng:-75.654},"K1C":{lat:45.477,lng:-75.575},
  "K1E":{lat:45.490,lng:-75.530},"K1G":{lat:45.409,lng:-75.631},"K1H":{lat:45.396,lng:-75.654},
  "K1J":{lat:45.440,lng:-75.620},"K1K":{lat:45.452,lng:-75.654},"K1L":{lat:45.434,lng:-75.665},
  "K1M":{lat:45.452,lng:-75.688},"K1N":{lat:45.427,lng:-75.688},"K1P":{lat:45.421,lng:-75.699},
  "K1R":{lat:45.409,lng:-75.710},"K1S":{lat:45.396,lng:-75.710},"K1T":{lat:45.359,lng:-75.631},
  "K1V":{lat:45.359,lng:-75.676},"K1Y":{lat:45.409,lng:-75.733},"K1Z":{lat:45.415,lng:-75.755},
  "K2A":{lat:45.390,lng:-75.755},"K2B":{lat:45.384,lng:-75.778},"K2C":{lat:45.359,lng:-75.733},
  "K2E":{lat:45.346,lng:-75.710},"K2G":{lat:45.334,lng:-75.755},"K2H":{lat:45.340,lng:-75.800},
  "K2J":{lat:45.284,lng:-75.733},"K2K":{lat:45.346,lng:-75.908},"K2L":{lat:45.321,lng:-75.868},
  "K2P":{lat:45.415,lng:-75.688},"K2S":{lat:45.390,lng:-75.890},"K2T":{lat:45.365,lng:-75.908},
  "K7K":{lat:44.231,lng:-76.481},"K7L":{lat:44.243,lng:-76.503},"K7M":{lat:44.256,lng:-76.526},
  "K8N":{lat:44.162,lng:-77.383},"K8P":{lat:44.137,lng:-77.405},"K8R":{lat:44.187,lng:-77.338},
  "K9H":{lat:44.300,lng:-78.324},"K9J":{lat:44.325,lng:-78.301},"K9K":{lat:44.300,lng:-78.279},
  // Southwestern Ontario (N prefix)
  "N1E":{lat:43.532,lng:-80.242},"N1G":{lat:43.544,lng:-80.219},"N1H":{lat:43.544,lng:-80.264},
  "N2A":{lat:43.369,lng:-80.465},"N2B":{lat:43.438,lng:-80.443},"N2C":{lat:43.407,lng:-80.443},
  "N2E":{lat:43.407,lng:-80.465},"N2G":{lat:43.450,lng:-80.488},"N2H":{lat:43.463,lng:-80.510},
  "N2J":{lat:43.475,lng:-80.510},"N2L":{lat:43.475,lng:-80.555},"N5V":{lat:43.013,lng:-81.207},
  "N5Y":{lat:43.032,lng:-81.240},"N6A":{lat:42.982,lng:-81.252},"N6B":{lat:42.982,lng:-81.229},
  "N6G":{lat:43.019,lng:-81.274},"N6H":{lat:43.000,lng:-81.319},"N8W":{lat:42.294,lng:-83.010},
  "N8X":{lat:42.294,lng:-83.033},"N9A":{lat:42.319,lng:-83.044},"N9B":{lat:42.300,lng:-83.067},
  // Northern Ontario (P prefix)
  "P1A":{lat:46.316,lng:-79.466},"P1B":{lat:46.304,lng:-79.461},"P3A":{lat:46.491,lng:-80.959},
  "P3B":{lat:46.504,lng:-80.981},"P3C":{lat:46.479,lng:-81.004},"P3E":{lat:46.491,lng:-81.026},
  "P6A":{lat:46.529,lng:-84.346},"P7A":{lat:48.400,lng:-89.250},"P7B":{lat:48.383,lng:-89.266},
  // Province-level fallbacks (first letter only)
  "M":{lat:43.653,lng:-79.383},"L":{lat:43.589,lng:-79.644},"K":{lat:45.421,lng:-75.697},
  "N":{lat:43.009,lng:-81.273},"P":{lat:46.491,lng:-80.993},
  "H":{lat:45.501,lng:-73.567},"G":{lat:46.813,lng:-71.208},"J":{lat:45.500,lng:-73.000},
  "V":{lat:49.282,lng:-123.120},"T":{lat:51.044,lng:-114.071},"R":{lat:49.895,lng:-97.138},
  "S":{lat:52.133,lng:-106.670},"B":{lat:44.648,lng:-63.575},"E":{lat:45.963,lng:-66.643},
  "A":{lat:47.561,lng:-52.712},"C":{lat:46.238,lng:-63.131},
};

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
        // Normalize postal code to "A1A 1A1" format
        const rawPostal = profile.home_postal_code.trim().toUpperCase().replace(/[\s-]/g, "");
        const normalizedPostal = rawPostal.length === 6 
          ? `${rawPostal.slice(0, 3)} ${rawPostal.slice(3)}`
          : profile.home_postal_code;
        
        // Update the profile postal code to normalized format
        profile.home_postal_code = normalizedPostal;
        
        // Extract FSA (first 3 chars) for local fallback lookup
        const fsa = rawPostal.slice(0, 3);
        
        // Try Nominatim API first
        try {
          const postalCode = normalizedPostal.replace(/\s/g, "+");
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${postalCode}&country=CA&format=json&limit=1`,
            { headers: { "User-Agent": "PSWDirect/1.0" } }
          );
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            homeLat = parseFloat(geoData[0].lat);
            homeLng = parseFloat(geoData[0].lon);
            console.log(`Nominatim geocoded ${normalizedPostal} → ${homeLat}, ${homeLng}`);
          }
        } catch (nominatimErr) {
          console.error("Nominatim geocoding failed:", nominatimErr);
        }
        
        // Fallback: local FSA coordinate lookup if Nominatim returned nothing
        if (homeLat === null || homeLng === null) {
          const fsaCoords = FSA_COORDINATES[fsa];
          if (fsaCoords) {
            homeLat = fsaCoords.lat;
            homeLng = fsaCoords.lng;
            console.log(`FSA fallback geocoded ${fsa} → ${homeLat}, ${homeLng}`);
          } else {
            console.warn(`No FSA fallback for ${fsa}, postal code ${normalizedPostal} has no coordinates`);
          }
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

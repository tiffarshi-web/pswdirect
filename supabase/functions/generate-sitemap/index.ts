import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: psws } = await supabase
    .from("psw_profiles")
    .select("first_name, last_name, home_city")
    .eq("vetting_status", "approved")
    .eq("is_test", false);

  const today = new Date().toISOString().split("T")[0];

  const generateSlug = (p: { first_name: string; last_name: string; home_city: string | null }) =>
    `${p.first_name}-${p.last_name}-${p.home_city || "ontario"}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  // Static pages
  const staticPages = [
    { loc: "https://psadirect.ca/", priority: "1.0", freq: "daily" },
    { loc: "https://psadirect.ca/faq", priority: "0.8", freq: "monthly" },
    { loc: "https://psadirect.ca/psw-directory", priority: "0.9", freq: "weekly" },
    { loc: "https://psadirect.ca/psw-near-me", priority: "0.8", freq: "weekly" },
    { loc: "https://psadirect.ca/home-care-near-me", priority: "0.8", freq: "weekly" },
    { loc: "https://psadirect.ca/personal-support-worker-near-me", priority: "0.8", freq: "weekly" },
    { loc: "https://psadirect.ca/guides", priority: "0.7", freq: "monthly" },
    { loc: "https://psadirect.ca/guides/how-to-hire-a-personal-support-worker", priority: "0.7", freq: "monthly" },
    { loc: "https://psadirect.ca/guides/cost-of-home-care-ontario", priority: "0.7", freq: "monthly" },
    { loc: "https://psadirect.ca/guides/hospital-discharge-checklist", priority: "0.7", freq: "monthly" },
    { loc: "https://psadirect.ca/guides/signs-your-parent-needs-home-care", priority: "0.7", freq: "monthly" },
    { loc: "https://psadirect.ca/guides/psw-vs-nurse-difference", priority: "0.7", freq: "monthly" },
  ];

  // City pages
  const cities = [
    "toronto", "mississauga", "brampton", "vaughan", "markham", "richmond-hill",
    "oakville", "burlington", "ajax", "pickering", "oshawa", "barrie",
    "hamilton", "kitchener", "waterloo", "cambridge", "london", "windsor",
    "st-catharines", "niagara-falls", "guelph", "kingston", "peterborough", "ottawa",
  ];

  const cityPages = [
    { loc: "https://psadirect.ca/home-care-toronto", priority: "0.8", freq: "weekly" },
    ...cities.map((c) => ({ loc: `https://psadirect.ca/psw-${c}`, priority: "0.8", freq: "weekly" })),
  ];

  // City+service pages
  const services = ["personal-care", "companionship", "mobility-support", "doctor-escort"];
  const cityServicePages = cities.flatMap((c) =>
    services.map((s) => ({ loc: `https://psadirect.ca/psw-${c}-${s}`, priority: "0.6", freq: "weekly" }))
  );

  // Dynamic PSW profile pages
  const profilePages = (psws || []).map((p) => ({
    loc: `https://psadirect.ca/psw/profile/${generateSlug(p)}`,
    priority: "0.7",
    freq: "monthly",
  }));

  const allPages = [...staticPages, ...cityPages, ...cityServicePages, ...profilePages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map((p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://pswdirect.ca";

const generateSlug = (p: { first_name: string; last_name: string; home_city: string | null }) =>
  `${p.first_name}-${p.last_name.charAt(0)}-${p.home_city || "ontario"}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const xmlHeaders = {
    ...corsHeaders,
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  };

  // --- PSW profiles sub-sitemap ---
  if (type === "psws") {
    const { data: psws } = await supabase
      .from("psw_profiles")
      .select("first_name, last_name, home_city, updated_at")
      .eq("vetting_status", "approved")
      .eq("is_test", false);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(psws || []).map((p) => {
  const lastmod = p.updated_at ? p.updated_at.split("T")[0] : new Date().toISOString().split("T")[0];
  return `  <url>
    <loc>${SITE}/psw/profile/${generateSlug(p)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
}).join("\n")}
</urlset>`;

    return new Response(xml, { headers: xmlHeaders });
  }

  // --- Sitemap index (default) ---
  const today = new Date().toISOString().split("T")[0];

  // Static pages
  const staticPages = [
    { loc: `${SITE}/`, priority: "1.0", freq: "daily" },
    { loc: `${SITE}/faq`, priority: "0.8", freq: "monthly" },
    { loc: `${SITE}/psw-directory`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/personal-support-workers-ontario`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/home-care-ontario`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/ontario-home-care`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/psw-near-me`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/home-care-near-me`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/personal-support-worker-near-me`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/senior-care-near-me`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/private-caregiver`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/in-home-care-ontario`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/private-home-care`, priority: "1.0", freq: "weekly" },
    { loc: `${SITE}/private-home-care-ontario`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/private-home-care-toronto`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/private-home-care-mississauga`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/private-home-care-barrie`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/private-home-care-vaughan`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/private-home-care-brampton`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/private-home-care-markham`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/private-home-care-hamilton`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/private-home-care-ottawa`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/private-home-care-london`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/psw-work-areas-ontario`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/coverage`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/ontario-psw-locations`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/psw-pay-calculator`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/psw-agency-vs-private-pay`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/about`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/psw-cost`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/private-psw-jobs`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/overnight-psw-jobs`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/24-hour-psw-jobs`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/psw-part-time-jobs`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/guides`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/guides/how-to-hire-a-personal-support-worker`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/guides/cost-of-home-care-ontario`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/guides/hospital-discharge-checklist`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/guides/signs-your-parent-needs-home-care`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/guides/psw-vs-nurse-difference`, priority: "0.7", freq: "monthly" },
    // Crawl hubs
    { loc: `${SITE}/languages`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/cities`, priority: "0.8", freq: "weekly" },
    // Question / informational SEO pages
    { loc: `${SITE}/how-much-does-a-psw-cost-toronto`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/psw-hourly-rate-ontario`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/how-to-hire-a-psw-barrie`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/what-does-a-psw-do`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/is-a-psw-covered-by-insurance-ontario`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/psw-vs-home-care-worker-ontario`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/overnight-psw-cost-toronto`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/dementia-care-cost-ontario`, priority: "0.7", freq: "monthly" },
    // Core service pages
    { loc: `${SITE}/home-care`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/personal-support-worker`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/caregiver-services`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/in-home-care`, priority: "0.9", freq: "weekly" },
    // Family / emotional intent pages
    { loc: `${SITE}/help-for-elderly-parents-at-home`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/care-for-aging-parents`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/help-with-elderly-parent-daily-care`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/support-for-seniors-at-home`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/care-for-elderly-after-hospital`, priority: "0.8", freq: "weekly" },
    // Urgent / discharge pages
    { loc: `${SITE}/home-care-after-hospital-discharge`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/urgent-caregiver-services`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/psw-after-surgery`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/hospital-discharge-care-ontario`, priority: "0.8", freq: "weekly" },
    // Task-based service pages
    { loc: `${SITE}/help-with-bathing-elderly`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/senior-transportation-services`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/doctor-appointment-assistance`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/companionship-for-seniors`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/meal-preparation-for-seniors`, priority: "0.7", freq: "weekly" },
    // Cost / pricing pages
    { loc: `${SITE}/home-care-cost-ontario`, priority: "0.8", freq: "monthly" },
    { loc: `${SITE}/psw-hourly-rate`, priority: "0.8", freq: "monthly" },
    { loc: `${SITE}/caregiver-cost-canada`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/is-home-care-covered-by-insurance`, priority: "0.7", freq: "monthly" },
    // Long-tail emotional/intent pages
    { loc: `${SITE}/help-for-my-elderly-mother-at-home`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/help-for-my-elderly-father-at-home`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/someone-to-care-for-elderly-parent`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/home-care-after-surgery-at-home`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/caregiver-for-dementia-at-home`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/help-with-daily-care-for-seniors`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/someone-to-check-on-elderly-parent`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/affordable-home-care-services`, priority: "0.8", freq: "weekly" },
    // Near me variations
    { loc: `${SITE}/help-for-elderly-near-me`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/urgent-home-care-near-me`, priority: "0.8", freq: "weekly" },
    // Condition-based pages
    { loc: `${SITE}/dementia-care-at-home`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/alzheimers-care-at-home`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/stroke-recovery-care-at-home`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/post-surgery-care-at-home`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/mobility-assistance-for-seniors`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/fall-risk-care-for-elderly`, priority: "0.7", freq: "weekly" },
    { loc: `${SITE}/palliative-care-at-home`, priority: "0.8", freq: "weekly" },
    { loc: `${SITE}/overnight-care-for-seniors`, priority: "0.8", freq: "weekly" },
    // Insurance / coverage pages
    { loc: `${SITE}/home-care-covered-by-insurance`, priority: "0.8", freq: "monthly" },
    { loc: `${SITE}/blue-cross-home-care-coverage`, priority: "0.8", freq: "monthly" },
    { loc: `${SITE}/home-care-direct-billing-ontario`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/private-home-care-insurance-claims`, priority: "0.7", freq: "monthly" },
    // Trust / authority pages
    { loc: `${SITE}/trusted-home-care-services`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/vetted-psw-caregivers`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/licensed-insured-caregivers`, priority: "0.7", freq: "monthly" },
    { loc: `${SITE}/background-checked-caregivers`, priority: "0.7", freq: "monthly" },
  ];

  // Tier 1 cities — indexable, included in sitemap
  const tier1Cities = [
    "toronto", "scarborough", "north-york", "etobicoke", "mississauga", "brampton",
    "vaughan", "markham", "richmond-hill", "oakville", "burlington", "hamilton",
    "oshawa", "barrie", "ottawa", "london", "kitchener", "waterloo", "windsor",
    "niagara-falls", "st-catharines", "peterborough", "kingston", "guelph",
    "cambridge", "brantford", "milton", "sudbury", "thunder-bay", "sault-ste-marie",
    "sarnia", "cornwall", "north-bay", "stratford", "owen-sound", "orillia",
    "cobourg", "belleville", "caledon", "halton-hills", "innisfil", "collingwood",
    "ajax", "pickering", "whitby", "newmarket", "aurora",
  ];

  // All cities (Tier 2+ kept for language/service combos but NOT included in sitemap)
  const cities = tier1Cities;

  const cityPages = [
    ...cities.map((c) => ({ loc: `${SITE}/psw-${c}`, priority: "0.8", freq: "weekly" })),
    ...cities.map((c) => {
      const highPriority = ["toronto", "mississauga", "vaughan", "brampton", "markham", "barrie"].includes(c);
      return { loc: `${SITE}/home-care-${c}`, priority: highPriority ? "0.9" : "0.8", freq: "weekly" };
    }),
    ...cities.map((c) => ({ loc: `${SITE}/senior-care-${c}`, priority: "0.7", freq: "weekly" })),
    ...cities.map((c) => ({ loc: `${SITE}/private-caregiver-${c}`, priority: "0.7", freq: "weekly" })),
    ...cities.map((c) => ({ loc: `${SITE}/in-home-care-${c}`, priority: "0.7", freq: "weekly" })),
    ...cities.map((c) => ({ loc: `${SITE}/private-home-care-${c}`, priority: "0.8", freq: "weekly" })),
    ...cities.map((c) => ({ loc: `${SITE}/personal-support-worker-${c}`, priority: "0.8", freq: "weekly" })),
    ...cities.map((c) => ({ loc: `${SITE}/caregiver-${c}`, priority: "0.7", freq: "weekly" })),
  ];

  // City + near me combo pages
  const cityNearMePages = cities.flatMap((c) => [
    { loc: `${SITE}/home-care-${c}-near-me`, priority: "0.6", freq: "weekly" },
    { loc: `${SITE}/caregiver-${c}-near-me`, priority: "0.6", freq: "weekly" },
    { loc: `${SITE}/psw-${c}-near-me`, priority: "0.6", freq: "weekly" },
  ]);

  // City+service pages (original 4 + 8 new condition-based services)
  const services = [
    "personal-care", "companionship", "mobility-support", "doctor-escort",
    "dementia-care", "alzheimers-care", "overnight-care", "24-hour-home-care",
    "post-surgery-care", "palliative-care", "respite-care", "senior-home-care",
  ];
  const conditionServices = [
    "dementia-care", "alzheimers-care", "overnight-care", "24-hour-home-care",
    "post-surgery-care", "palliative-care", "respite-care", "senior-home-care",
  ];
  const cityServicePages = cities.flatMap((c) =>
    services.flatMap((s) => {
      const pages = [{ loc: `${SITE}/psw-${c}-${s}`, priority: "0.6", freq: "weekly" }];
      if (conditionServices.includes(s)) {
        pages.push({ loc: `${SITE}/${s}-${c}`, priority: "0.6", freq: "weekly" });
      }
      // Alternate slug variants
      if (s === "alzheimers-care") {
        pages.push({ loc: `${SITE}/alzheimer-care-${c}`, priority: "0.6", freq: "weekly" });
      }
      if (s === "overnight-care") {
        pages.push({ loc: `${SITE}/overnight-psw-${c}`, priority: "0.6", freq: "weekly" });
      }
      return pages;
    })
  );

  // Emergency/same-day care pages
  const emergencyTypes = ["urgent-home-care", "same-day-home-care"];
  const emergencyPages = cities.flatMap((c) =>
    emergencyTypes.map((t) => ({ loc: `${SITE}/${t}-${c}`, priority: "0.6", freq: "weekly" }))
  );

  // Language pages
  const languages = [
    "english", "french", "punjabi", "hindi", "urdu", "tamil", "gujarati",
    "mandarin", "cantonese", "tagalog", "spanish", "portuguese", "italian",
    "polish", "ukrainian", "russian", "arabic", "farsi", "korean",
    "vietnamese", "bengali", "telugu", "marathi", "somali", "amharic",
    "swahili", "greek", "turkish",
  ];

  const languagePages = languages.map((l) => ({
    loc: `${SITE}/psw-language-${l}`,
    priority: "0.7",
    freq: "weekly",
  }));

  // Language + City combination pages (28 languages × 25 cities = 700 pages)
  const languageCityPages = languages.flatMap((l) =>
    cities.flatMap((c) => [
      { loc: `${SITE}/${l}-psw-${c}`, priority: "0.5", freq: "weekly" },
      { loc: `${SITE}/${l}-speaking-psw-${c}`, priority: "0.5", freq: "weekly" },
    ])
  );

  // PSW job city pages
  const pswJobPages = cities.map((c) => ({ loc: `${SITE}/psw-jobs-${c}`, priority: "0.7", freq: "weekly" }));

  // Language + Service + City pages (28 languages × 6 services × cities)
  const langServiceCityServices = ["caregiver", "home-care", "personal-care", "dementia-care", "companionship", "overnight-care"];
  const languageServiceCityPages = languages.flatMap((l) =>
    cities.flatMap((c) =>
      langServiceCityServices.map((s) => ({
        loc: `${SITE}/${l}-${s}-${c}`,
        priority: s === "home-care" ? "0.7" : "0.5",
        freq: "weekly",
      }))
    )
  );

  const allPages = [...staticPages, ...cityPages, ...cityNearMePages, ...cityServicePages, ...languagePages, ...languageCityPages, ...emergencyPages, ...pswJobPages, ...languageServiceCityPages];

  // Build the main sitemap with static/city pages, plus a reference comment for the PSW sub-sitemap
  const mainUrlset = allPages.map((p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n");

  // Use sitemapindex format to include both the main urlset and PSW sub-sitemap
  const functionUrl = `${supabaseUrl}/functions/v1/generate-sitemap`;

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${functionUrl}?type=main</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${functionUrl}?type=psws</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

  // If type=main, return just the static/city urlset
  if (type === "main") {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${mainUrlset}
</urlset>`;
    return new Response(xml, { headers: xmlHeaders });
  }

  // Default: return sitemap index
  return new Response(sitemapIndex, { headers: xmlHeaders });
});

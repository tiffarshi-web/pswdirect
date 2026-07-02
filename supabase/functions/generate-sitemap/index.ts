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
    // High-conversion service landing pages
    { loc: `${SITE}/home-care-services`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/elderly-care-at-home`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/overnight-home-care`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/24-hour-home-care`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/same-day-home-care`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/post-hospital-care`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/doctor-escort-service`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/hospital-discharge-care`, priority: "0.9", freq: "weekly" },
    // Core city home-care landing pages (also auto-generated below)
    { loc: `${SITE}/home-care-toronto`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/home-care-mississauga`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/home-care-brampton`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/home-care-vaughan`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/home-care-markham`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/home-care-oshawa`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/home-care-hamilton`, priority: "0.9", freq: "weekly" },
    { loc: `${SITE}/home-care-barrie`, priority: "0.9", freq: "weekly" },
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

  // All SEO cities — mirrors src/lib/seoCityData.ts SEO_CITIES.
  // Every city here is routable and indexable, so it must appear in the sitemap.
  const cities = [
    "toronto", "scarborough", "north-york", "etobicoke", "mississauga", "brampton",
    "vaughan", "markham", "richmond-hill", "oakville", "burlington", "ajax",
    "pickering", "oshawa", "whitby", "barrie", "hamilton", "kitchener", "waterloo",
    "cambridge", "london", "windsor", "st-catharines", "niagara-falls", "guelph",
    "kingston", "peterborough", "ottawa", "newmarket", "aurora", "milton", "innisfil",
    "orillia", "bradford", "alliston", "cobourg", "belleville", "welland",
    "stoney-creek", "georgetown", "dundas", "woodstock", "courtice", "brantford",
    "sarnia", "thunder-bay", "sudbury", "sault-ste-marie", "midland", "collingwood",
    "bowmanville", "orangeville", "stouffville", "keswick", "shelburne", "wasaga-beach",
    "penetanguishene", "gravenhurst", "bracebridge", "huntsville", "north-bay",
    "timmins", "kenora", "cornwall", "hawkesbury", "smiths-falls", "pembroke",
    "stratford", "owen-sound", "chatham-kent", "leamington", "port-hope", "lindsay",
    "fort-erie", "grimsby", "caledon", "halton-hills", "east-gwillimbury", "king-city",
    "uxbridge", "clarington", "york", "east-york", "don-mills", "leaside", "riverdale",
    "liberty-village", "danforth", "high-park", "parkdale", "the-beaches",
    "forest-hill", "rosedale", "agincourt", "malvern", "rouge", "highland-creek",
    "woburn", "birch-cliff", "cliffside", "willowdale", "thornhill", "downsview",
    "york-mills", "bayview-village", "lawrence-park", "mimico", "long-branch",
    "islington", "rexdale", "humber-bay", "new-toronto", "kingsway", "meadowvale",
    "streetsville", "port-credit", "erin-mills", "clarkson", "malton", "cooksville",
    "lorne-park", "bramalea", "heart-lake", "castlemore", "springdale",
    "mount-pleasant", "snelgrove", "woodbridge", "maple", "concord", "kleinburg",
    "nobleton", "unionville", "milliken", "cornell", "berczy-village", "cathedraltown",
    "oak-ridges", "langstaff", "bayview-hill", "bronte", "palermo", "clearview",
    "glen-abbey", "river-oaks", "iroquois-ridge", "joshua-creek", "sixteen-mile",
    "waterdown", "aldershot", "appleby", "tyandaga", "brant-hills", "palmer",
    "kilbride", "bayly", "westney-heights", "village-green", "audley", "dunbarton",
    "bay-ridges", "rouge-hill", "claremont", "brooklin", "harmony", "taunton",
    "lakeview", "northwood", "port-whitby", "blue-grass-meadows", "williamsburg",
    "angus", "alcona", "midhurst", "shanty-bay", "springwater", "minesing", "stroud",
    "ancaster", "binbrook", "flamborough", "winona", "caledonia", "mount-hope",
    "westdale", "elmira", "new-hamburg", "baden", "st-jacobs", "breslau", "heidelberg",
    "bridgeport", "conestogo", "woolwich", "hespeler", "preston", "galt", "ayr",
    "paris", "st-thomas", "strathroy", "aylmer", "dorchester", "ingersoll", "komoka",
    "byron", "lambeth", "lasalle", "tecumseh", "lakeshore", "amherstburg", "essex",
    "kingsville", "belle-river", "thorold", "pelham", "beamsville", "vineland",
    "jordan", "port-dalhousie", "niagara-on-the-lake", "chippawa", "queenston",
    "fergus", "elora", "rockwood", "puslinch", "eden-mills", "gananoque", "napanee",
    "amherstview", "bath", "cataraqui", "collins-bay", "sydenham", "lakefield",
    "norwood", "bridgenorth", "millbrook", "buckhorn", "keene", "havelock", "gatineau",
    "kanata", "orleans", "barrhaven", "nepean", "gloucester", "stittsville", "manotick",
    "rockcliffe-park", "westboro", "the-glebe", "sandy-hill", "holland-landing",
    "sharon", "queensville", "ballantrae", "campbellville", "acton", "lefroy",
    "big-bay-point", "cookstown", "washago", "coldwater", "ramara", "bond-head",
    "newton-robinson", "beeton", "tottenham", "new-tecumseth", "trenton", "grafton",
    "baltimore", "colborne", "deseronto", "foxboro", "stirling", "port-colborne",
    "fonthill", "fruitland", "glen-williams", "greensville", "tillsonburg", "norwich",
    "newcastle", "orono", "simcoe", "norfolk", "chatham", "petrolia", "forest",
    "grand-bend", "point-edward", "nipigon", "marathon", "geraldton", "dryden",
    "red-rock", "kakabeka-falls", "espanola", "elliot-lake", "sturgeon-falls",
    "capreol", "blind-river", "thessalon", "wawa", "iron-bridge", "elmvale", "stayner",
    "thornbury", "meaford", "blue-mountains",
  ];

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

  // City + near-me combo pages mirror src/pages/seo/cityNearMeRoutes.ts.
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
    "personal-care", "companionship", "mobility-support",
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

  // Additional city-service routes from src/pages/seo/additionalCityServiceRoutes.ts.
  // These are real routable pages and must stay discoverable in the sitemap.
  const additionalServices = [
    "emergency-home-care", "on-demand-home-care", "hospital-discharge",
    "hospital-discharge-care", "doctor-escort", "in-home-care-services",
    "psw-services-in", "home-care-in", "private-home-care-in",
  ];
  const additionalCityServicePages = cities.flatMap((c) =>
    additionalServices.map((s) => ({ loc: `${SITE}/${s}-${c}`, priority: "0.6", freq: "weekly" }))
  );

  // Emergency/same-day care pages
  const emergencyTypes = ["urgent-home-care", "same-day-home-care"];
  const emergencyPages = cities.flatMap((c) =>
    emergencyTypes.map((t) => ({ loc: `${SITE}/${t}-${c}`, priority: "0.6", freq: "weekly" }))
  );

  // Additive: Expanded city × service SEO pages (mirrors src/pages/seo/expandedCityServiceRoutes.ts)
  const expandedServiceKeys = [
    "companion-care","companion-services","senior-companion","family-caregiver-relief",
    "memory-care","parkinsons-care","stroke-recovery-care","palliative-home-care",
    "end-of-life-care","personal-care-assistance","bathing-assistance","dressing-assistance",
    "toileting-assistance","hygiene-assistance","senior-assistance","help-for-seniors",
    "aging-in-place","independent-living-support","private-caregiver","hire-a-caregiver",
    "hire-a-personal-support-worker","same-day-home-care","urgent-home-care","weekend-home-care",
    "recovery-care","surgery-recovery-care","hip-replacement-recovery","knee-replacement-recovery",
    "arthritis-care","diabetes-care","copd-home-care","cancer-home-care",
    "multiple-sclerosis-care","als-care","heart-failure-care",
  ];
  const expandedCityServicePages = cities.flatMap((c) =>
    expandedServiceKeys.map((s) => ({ loc: `${SITE}/${s}-${c}`, priority: "0.7", freq: "weekly" }))
  );

  // Additive: family-intent / near-me SEO pages (mirrors src/pages/seo/familyIntentRoutes.ts)
  const familyIntentPages = [
    "private-caregiver-near-me","help-for-aging-parents","care-for-elderly-parents",
    "help-for-mom-at-home","help-for-dad-at-home","care-for-seniors-living-alone",
    "someone-to-check-on-my-mom","someone-to-check-on-my-dad",
  ].map((slug) => ({ loc: `${SITE}/${slug}`, priority: "0.7", freq: "weekly" }));

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

  const rawPages = [
    ...staticPages,
    ...cityPages,
    ...cityNearMePages,
    ...cityServicePages,
    ...additionalCityServicePages,
    ...languagePages,
    ...languageCityPages,
    ...emergencyPages,
    ...pswJobPages,
    ...languageServiceCityPages,
  ];

  // Deduplicate by loc — first occurrence wins (preserves higher static-page priorities).
  const seen = new Set<string>();
  const allPages = rawPages.filter((p) => {
    if (seen.has(p.loc)) return false;
    seen.add(p.loc);
    return true;
  });

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

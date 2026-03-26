import { Plugin } from "vite";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";

interface SEOPage {
  path: string;
  title: string;
  description: string;
  canonical: string;
  h1: string;
  body: string;
}

// ── Guide pages ──────────────────────────────────────────────
const guidePages: SEOPage[] = [
  {
    path: "/guides",
    title: "Home Care Guides | PSW Direct",
    description:
      "Free guides on hiring a PSW, home care costs in Ontario, hospital discharge planning, and more. Expert advice from PSW Direct.",
    canonical: "https://pswdirect.ca/guides",
    h1: "Home Care Guides",
    body: `<p>Free resources to help Ontario families navigate home care decisions with confidence.</p>
<ul>
<li><a href="/guides/how-to-hire-a-personal-support-worker">How to Hire a Personal Support Worker</a> — A step-by-step guide to finding, vetting, and hiring a qualified PSW for your family in Ontario.</li>
<li><a href="/guides/cost-of-home-care-ontario">Cost of Home Care in Ontario</a> — Understand what home care costs in Ontario, what affects pricing, and how to find affordable options.</li>
<li><a href="/guides/hospital-discharge-checklist">Hospital Discharge Checklist</a> — Everything families need to prepare before bringing a loved one home from the hospital.</li>
<li><a href="/guides/signs-your-parent-needs-home-care">Signs Your Parent Needs Home Care</a> — How to recognize when a parent or aging loved one may benefit from professional in-home support.</li>
<li><a href="/guides/psw-vs-nurse-difference">PSW vs Nurse: What's the Difference?</a> — Understand the roles, training, and scope of practice that separate PSWs from registered nurses.</li>
</ul>`,
  },
  {
    path: "/guides/how-to-hire-a-personal-support-worker",
    title:
      "How to Hire a Personal Support Worker in Ontario | PSW Direct",
    description:
      "Step-by-step guide to hiring a qualified personal support worker in Ontario. Learn what to look for, questions to ask, and how to book a PSW online.",
    canonical:
      "https://pswdirect.ca/guides/how-to-hire-a-personal-support-worker",
    h1: "How to Hire a Personal Support Worker",
    body: `<p>Hiring a personal support worker (PSW) is one of the most important decisions families make when a loved one needs help at home. Whether you're looking for senior care, post-surgery recovery support, or companionship, finding the right PSW ensures safety, dignity, and peace of mind. This guide walks you through the process of hiring a PSW in Ontario.</p>
<h2>What Does a Personal Support Worker Do?</h2>
<p>A PSW provides hands-on assistance with daily living activities including personal hygiene, mobility support, meal preparation, companionship, light housekeeping, medication reminders, and escort to medical appointments.</p>
<h2>Book a PSW Online</h2>
<p>PSW Direct connects families with vetted personal support workers across Toronto, the GTA and Ontario. Book online in minutes starting at $30 per hour.</p>`,
  },
  {
    path: "/guides/cost-of-home-care-ontario",
    title: "Cost of Home Care in Ontario (2026) | PSW Direct",
    description:
      "How much does home care cost in Ontario? Compare agency rates vs. PSW Direct pricing. Home care starts at $30/hour with no contracts.",
    canonical:
      "https://pswdirect.ca/guides/cost-of-home-care-ontario",
    h1: "Cost of Home Care in Ontario",
    body: `<p>Understanding the cost of home care in Ontario helps families plan ahead and make informed decisions. Whether you need a few hours of weekly companionship or daily personal support, knowing what to expect financially can reduce stress during an already challenging time.</p>
<h2>Typical Home Care Costs</h2>
<p>Traditional agencies in Ontario charge $45–$65 per hour. PSW Direct starts at $30 per hour with no contracts or commitments. Doctor escort services start at $35 per hour.</p>`,
  },
  {
    path: "/guides/hospital-discharge-checklist",
    title:
      "Hospital Discharge Checklist for Families | PSW Direct",
    description:
      "Prepare for a safe hospital discharge with this checklist. Learn what to arrange before bringing a loved one home, including PSW support.",
    canonical:
      "https://pswdirect.ca/guides/hospital-discharge-checklist",
    h1: "Hospital Discharge Checklist",
    body: `<p>Bringing a loved one home from the hospital can be overwhelming. A well-prepared discharge plan reduces the risk of readmission, ensures medications are managed properly, and helps your family member recover safely in familiar surroundings.</p>
<h2>Why a Discharge Plan Matters</h2>
<p>A proper discharge checklist covers medication management, mobility needs, follow-up appointments, home modifications, and arranging personal support worker care for recovery.</p>`,
  },
  {
    path: "/guides/signs-your-parent-needs-home-care",
    title: "Signs Your Parent Needs Home Care | PSW Direct",
    description:
      "How to recognize when a parent needs in-home support. Common signs of declining independence and when to consider hiring a PSW.",
    canonical:
      "https://pswdirect.ca/guides/signs-your-parent-needs-home-care",
    h1: "Signs Your Parent Needs Home Care",
    body: `<p>Recognizing that a parent or aging loved one needs help can be difficult. Many seniors want to maintain their independence, and signs of decline can develop gradually. Understanding what to look for helps families act early — before a crisis occurs.</p>
<h2>Common Signs</h2>
<p>Changes in personal hygiene, unexplained weight loss, difficulty with mobility, missed medications, social withdrawal, and safety concerns around the home are all indicators that professional in-home support may be needed.</p>`,
  },
  {
    path: "/guides/psw-vs-nurse-difference",
    title: "PSW vs Nurse: What's the Difference? | PSW Direct",
    description:
      "Understand the difference between a PSW and a nurse in Ontario. Learn about training, scope of practice, and when to hire each.",
    canonical:
      "https://pswdirect.ca/guides/psw-vs-nurse-difference",
    h1: "PSW vs Nurse: What's the Difference?",
    body: `<p>When families look into home care, they often wonder whether they need a personal support worker (PSW) or a nurse. Both play important roles in the healthcare system, but their training, responsibilities, and costs differ significantly.</p>
<h2>Key Differences</h2>
<p>PSWs provide hands-on personal care, companionship, and daily living support. Nurses handle clinical tasks like wound care, IV administration, and medical assessments. For most in-home care needs, a PSW provides the right level of support at a more affordable rate.</p>`,
  },
  {
    path: "/coverage",
    title: "Personal Support Worker Coverage Map Ontario | PSW Direct",
    description:
      "See where PSW Direct provides Personal Support Workers and home care services across Ontario including Toronto, Barrie, Mississauga, Hamilton and surrounding areas.",
    canonical: "https://pswdirect.ca/coverage",
    h1: "Personal Support Worker Coverage Map — Ontario",
    body: `<p>View the PSW Direct coverage map to see where vetted Personal Support Workers are available across Ontario. Each PSW covers a 75km service radius from their home location.</p>
<h2>Services Available</h2>
<p>Home care, dementia care, Alzheimer's care, 24-hour care, overnight care, post-surgery care, palliative care, respite care, and senior home care.</p>
<h2>Book a PSW</h2>
<p>Post your shift, get matched with a vetted PSW, and care begins. No contracts required. <a href="/">Book a Personal Support Worker</a></p>`,
  },
];

// ── Near-me pages ────────────────────────────────────────────
const nearMeVariants: SEOPage[] = [
  {
    path: "/psw-near-me",
    title: "PSW Near Me | Personal Support Worker Services | PSW Direct",
    description:
      "Looking for a PSW near you? Book trusted personal support workers across Toronto, the GTA, and Ontario starting at $30 per hour.",
    canonical: "https://pswdirect.ca/psw-near-me",
    h1: "PSW Near You",
    body: "",
  },
  {
    path: "/home-care-near-me",
    title:
      "Home Care Near Me | Affordable In-Home Support | PSW Direct",
    description:
      "Find affordable home care near you. Book vetted personal support workers across Toronto, the GTA, and Ontario starting at $30 per hour.",
    canonical: "https://pswdirect.ca/home-care-near-me",
    h1: "Home Care Near You",
    body: "",
  },
  {
    path: "/personal-support-worker-near-me",
    title: "Personal Support Worker Near Me | PSW Direct",
    description:
      "Looking for a personal support worker near you? Book trusted home care services across Toronto, the GTA, and Ontario starting at $30 per hour.",
    canonical: "https://pswdirect.ca/personal-support-worker-near-me",
    h1: "Personal Support Workers Near You",
    body: "",
  },
];

// Shared near-me body content
const nearMeBody = `<p>PSW Direct connects families with vetted personal support workers across Toronto, the GTA, and Ontario. Our platform allows you to book trusted caregivers for senior support, mobility assistance, companionship, and post-hospital recovery — online in minutes with transparent pricing starting at $30 per hour.</p>
<h2>Services Available</h2>
<ul>
<li>Senior Companionship — Social engagement, emotional support, and daily supervision</li>
<li>Personal Care Assistance — Bathing, grooming, dressing, and personal hygiene</li>
<li>Mobility Support — Walking assistance, transfers, and fall prevention</li>
<li>Hospital Discharge Support — Safe transition from hospital to home</li>
<li>Doctor Escort Services — Accompaniment to medical appointments</li>
</ul>
<h2>Why Families Choose PSW Direct</h2>
<p>Home care starting at $30 per hour. All PSWs are credential-verified with police checks on file. No contracts — book by the hour with no commitments.</p>
<h2>Finding a Personal Support Worker Near You</h2>
<p>When searching for a "personal support worker near me" or "home care near me," families want reliable, affordable, and immediate options. PSW Direct eliminates the traditional agency model by connecting you directly with vetted caregivers in your area. Whether you're in Toronto, Mississauga, Brampton, Hamilton, Barrie, or anywhere across the GTA and Ontario, our platform matches you with qualified PSWs.</p>`;

nearMeVariants.forEach((p) => (p.body = nearMeBody));

// ── City landing pages ───────────────────────────────────────
const cityRoutes = [
  { slug: "home-care-toronto", city: "Toronto" },
  { slug: "psw-toronto", city: "Toronto" },
  { slug: "psw-mississauga", city: "Mississauga" },
  { slug: "psw-brampton", city: "Brampton" },
  { slug: "psw-vaughan", city: "Vaughan" },
  { slug: "psw-markham", city: "Markham" },
  { slug: "psw-richmond-hill", city: "Richmond Hill" },
  { slug: "psw-oakville", city: "Oakville" },
  { slug: "psw-burlington", city: "Burlington" },
  { slug: "psw-ajax", city: "Ajax" },
  { slug: "psw-pickering", city: "Pickering" },
  { slug: "psw-oshawa", city: "Oshawa" },
  { slug: "psw-whitby", city: "Whitby" },
  { slug: "psw-barrie", city: "Barrie" },
  { slug: "psw-hamilton", city: "Hamilton" },
  { slug: "psw-kitchener", city: "Kitchener" },
  { slug: "psw-waterloo", city: "Waterloo" },
  { slug: "psw-cambridge", city: "Cambridge" },
  { slug: "psw-london", city: "London" },
  { slug: "psw-windsor", city: "Windsor" },
  { slug: "psw-st-catharines", city: "St. Catharines" },
  { slug: "psw-niagara-falls", city: "Niagara Falls" },
  { slug: "psw-guelph", city: "Guelph" },
  { slug: "psw-kingston", city: "Kingston" },
  { slug: "psw-peterborough", city: "Peterborough" },
  { slug: "psw-ottawa", city: "Ottawa" },
  { slug: "psw-newmarket", city: "Newmarket" },
  { slug: "psw-aurora", city: "Aurora" },
  { slug: "psw-milton", city: "Milton" },
  { slug: "psw-innisfil", city: "Innisfil" },
  { slug: "psw-orillia", city: "Orillia" },
  { slug: "psw-bradford", city: "Bradford" },
  { slug: "psw-alliston", city: "Alliston" },
  { slug: "psw-cobourg", city: "Cobourg" },
  { slug: "psw-belleville", city: "Belleville" },
  { slug: "psw-welland", city: "Welland" },
  { slug: "psw-stoney-creek", city: "Stoney Creek" },
  { slug: "psw-georgetown", city: "Georgetown" },
  { slug: "psw-dundas", city: "Dundas" },
  { slug: "psw-woodstock", city: "Woodstock" },
  { slug: "psw-courtice", city: "Courtice" },
  // home-care-[city] routes
  { slug: "home-care-mississauga", city: "Mississauga" },
  { slug: "home-care-brampton", city: "Brampton" },
  { slug: "home-care-vaughan", city: "Vaughan" },
  { slug: "home-care-markham", city: "Markham" },
  { slug: "home-care-richmond-hill", city: "Richmond Hill" },
  { slug: "home-care-oakville", city: "Oakville" },
  { slug: "home-care-burlington", city: "Burlington" },
  { slug: "home-care-ajax", city: "Ajax" },
  { slug: "home-care-pickering", city: "Pickering" },
  { slug: "home-care-oshawa", city: "Oshawa" },
  { slug: "home-care-whitby", city: "Whitby" },
  { slug: "home-care-barrie", city: "Barrie" },
  { slug: "home-care-hamilton", city: "Hamilton" },
  { slug: "home-care-kitchener", city: "Kitchener" },
  { slug: "home-care-waterloo", city: "Waterloo" },
  { slug: "home-care-cambridge", city: "Cambridge" },
  { slug: "home-care-london", city: "London" },
  { slug: "home-care-windsor", city: "Windsor" },
  { slug: "home-care-st-catharines", city: "St. Catharines" },
  { slug: "home-care-niagara-falls", city: "Niagara Falls" },
  { slug: "home-care-guelph", city: "Guelph" },
  { slug: "home-care-kingston", city: "Kingston" },
  { slug: "home-care-peterborough", city: "Peterborough" },
  { slug: "home-care-ottawa", city: "Ottawa" },
  { slug: "home-care-newmarket", city: "Newmarket" },
  { slug: "home-care-aurora", city: "Aurora" },
  { slug: "home-care-milton", city: "Milton" },
  { slug: "home-care-innisfil", city: "Innisfil" },
  { slug: "home-care-orillia", city: "Orillia" },
  { slug: "home-care-bradford", city: "Bradford" },
  { slug: "home-care-alliston", city: "Alliston" },
  { slug: "home-care-cobourg", city: "Cobourg" },
  { slug: "home-care-belleville", city: "Belleville" },
  { slug: "home-care-welland", city: "Welland" },
  { slug: "home-care-stoney-creek", city: "Stoney Creek" },
  { slug: "home-care-georgetown", city: "Georgetown" },
  { slug: "home-care-dundas", city: "Dundas" },
  { slug: "home-care-woodstock", city: "Woodstock" },
  { slug: "home-care-courtice", city: "Courtice" },
];

const cityPages: SEOPage[] = cityRoutes.map(({ slug, city }) => ({
  path: `/${slug}`,
  title: `Personal Support Workers in ${city} | PSW Direct`,
  description: `Find vetted Personal Support Workers in ${city} through PSW Direct. Book trusted in-home care including companionship, mobility assistance, and personal care.`,
  canonical: `https://pswdirect.ca/${slug}`,
  h1: `Personal Support Workers in ${city}`,
  body: `<p>PSW Direct connects families with vetted personal support workers in ${city}. Book affordable home care services online in minutes with transparent pricing starting at $30 per hour.</p>
<h2>Available PSWs in ${city}</h2>
<p>Browse approved personal support workers serving ${city}. Each PSW is credential-verified, police-checked, and ready to provide quality home care.</p>
<p><a href="/psw-directory">Browse all PSWs in Ontario</a></p>
<h2>PSW Services in ${city}</h2>
<ul>
<li>Personal Care & Senior Care</li>
<li>Companionship & In-Home Support</li>
<li>Hospital Discharge Support</li>
<li>Doctor Escort Services</li>
</ul>`,
}));

// ── Directory page ───────────────────────────────────────────
const directoryPage: SEOPage = {
  path: "/psw-directory",
  title: "Personal Support Workers in Ontario | PSW Directory | PSW Direct",
  description: "Browse vetted personal support workers across Ontario. Find a PSW by city or language. Book trusted home care starting at $30/hour on PSWDIRECT.CA.",
  canonical: "https://pswdirect.ca/psw-directory",
  h1: "Personal Support Workers (PSWs) in Ontario",
  body: `<p>Browse credential-verified personal support workers available through PSW Direct. All caregivers on PSWDIRECT.CA are screened, police-checked, and ready to provide quality home care across Ontario.</p>
<p>Use the directory to find a PSW by city or language, then view their full profile to learn more and book care.</p>
<p><a href="https://pswdirect.ca/">Book a Personal Support Worker</a></p>`,
};

// ── City + Service pages ─────────────────────────────────────
const allServices = [
  { service: "personal-care", label: "Personal Care" },
  { service: "companionship", label: "Companionship" },
  { service: "mobility-support", label: "Mobility Support" },
  { service: "doctor-escort", label: "Doctor Escort" },
  { service: "dementia-care", label: "Dementia Care" },
  { service: "alzheimers-care", label: "Alzheimer's Care" },
  { service: "overnight-care", label: "Overnight Care" },
  { service: "24-hour-home-care", label: "24-Hour Home Care" },
  { service: "post-surgery-care", label: "Post-Surgery Care" },
  { service: "palliative-care", label: "Palliative Care" },
  { service: "respite-care", label: "Respite Care" },
  { service: "senior-home-care", label: "Senior Home Care" },
];

const conditionServicesSet = new Set([
  "dementia-care", "alzheimers-care", "overnight-care", "24-hour-home-care",
  "post-surgery-care", "palliative-care", "respite-care", "senior-home-care",
]);

const cityServiceCombos = cityRoutes.flatMap(({ slug: citySlug, city }) => {
  const cityKey = citySlug.replace(/^psw-/, "").replace(/^home-care-/, "");
  return allServices.flatMap(({ service, label }) => {
    const pages: SEOPage[] = [{
      path: `/psw-${cityKey}-${service}`,
      title: `${label} Personal Support Worker in ${city} | PSW Direct`,
      description: `Find Personal Support Workers in ${city} offering ${label.toLowerCase()}. Book trusted home care services starting at $30/hour through PSW Direct.`,
      canonical: `https://pswdirect.ca/psw-${cityKey}-${service}`,
      h1: `Personal Support Workers for ${label} in ${city}`,
      body: `<p>PSW Direct connects families with vetted Personal Support Workers (PSWs) across ${city} and surrounding areas. Our caregivers provide trusted home care services including personal care, companionship, mobility assistance, and doctor escort support.</p>
<h2>Available PSWs for ${label} in ${city}</h2>
<p>Browse approved personal support workers serving ${city} who specialize in ${label.toLowerCase()}. Each PSW is credential-verified, police-checked, and ready to provide quality home care.</p>
<p><a href="/psw-${cityKey}">View all PSWs in ${city}</a> | <a href="/psw-directory">Browse all PSWs in Ontario</a></p>`,
    }];
    // Add /[service]-[city] alias for condition services
    if (conditionServicesSet.has(service)) {
      pages.push({
        ...pages[0],
        path: `/${service}-${cityKey}`,
        canonical: `https://pswdirect.ca/${service}-${cityKey}`,
      });
    }
    // Alternate slug: alzheimer-care-{city} (without "s")
    if (service === "alzheimers-care") {
      pages.push({
        ...pages[0],
        path: `/alzheimer-care-${cityKey}`,
        canonical: `https://pswdirect.ca/alzheimer-care-${cityKey}`,
      });
    }
    // Alternate slug: overnight-psw-{city}
    if (service === "overnight-care") {
      pages.push({
        ...pages[0],
        path: `/overnight-psw-${cityKey}`,
        canonical: `https://pswdirect.ca/overnight-psw-${cityKey}`,
      });
    }
    return pages;
  });
});

// ── Language pages ───────────────────────────────────────────
const languagePageRoutes = [
  { slug: "psw-language-english", label: "English" },
  { slug: "psw-language-french", label: "French" },
  { slug: "psw-language-punjabi", label: "Punjabi" },
  { slug: "psw-language-hindi", label: "Hindi" },
  { slug: "psw-language-urdu", label: "Urdu" },
  { slug: "psw-language-tamil", label: "Tamil" },
  { slug: "psw-language-gujarati", label: "Gujarati" },
  { slug: "psw-language-mandarin", label: "Mandarin Chinese" },
  { slug: "psw-language-cantonese", label: "Cantonese" },
  { slug: "psw-language-tagalog", label: "Tagalog" },
  { slug: "psw-language-spanish", label: "Spanish" },
  { slug: "psw-language-portuguese", label: "Portuguese" },
  { slug: "psw-language-italian", label: "Italian" },
  { slug: "psw-language-polish", label: "Polish" },
  { slug: "psw-language-ukrainian", label: "Ukrainian" },
  { slug: "psw-language-russian", label: "Russian" },
  { slug: "psw-language-arabic", label: "Arabic" },
  { slug: "psw-language-farsi", label: "Farsi" },
  { slug: "psw-language-korean", label: "Korean" },
  { slug: "psw-language-vietnamese", label: "Vietnamese" },
  { slug: "psw-language-bengali", label: "Bengali" },
  { slug: "psw-language-telugu", label: "Telugu" },
  { slug: "psw-language-marathi", label: "Marathi" },
  { slug: "psw-language-somali", label: "Somali" },
  { slug: "psw-language-amharic", label: "Amharic" },
  { slug: "psw-language-swahili", label: "Swahili" },
  { slug: "psw-language-greek", label: "Greek" },
  { slug: "psw-language-turkish", label: "Turkish" },
];

const languagePages: SEOPage[] = languagePageRoutes.map(({ slug, label }) => ({
  path: `/${slug}`,
  title: `${label} Speaking Personal Support Workers | PSW Direct`,
  description: `Find ${label} speaking Personal Support Workers in Ontario. Book trusted in-home care and companionship through PSW Direct.`,
  canonical: `https://pswdirect.ca/${slug}`,
  h1: `${label} Speaking Personal Support Workers`,
  body: `<p>PSW Direct connects Ontario families with vetted Personal Support Workers who speak ${label}. A caregiver who speaks your language ensures clear communication, culturally sensitive care, and a more comfortable experience for your loved ones.</p>
<h2>Why Choose a ${label} Speaking PSW?</h2>
<p>Language plays a critical role in quality home care. ${label} speaking caregivers can communicate clearly about medications, daily routines, and needs — reducing misunderstandings and building trust.</p>
<h2>Book a ${label} Speaking Caregiver</h2>
<p>Home care starting at $30/hour. All PSWs are vetted and police-checked.</p>
<p><a href="/psw-directory">Browse all PSWs in Ontario</a> | <a href="/psw-near-me">Find PSWs Near You</a></p>`,
}));

// ── Language + City combo pages ──────────────────────────────
// High-value combos for pre-rendering (most searched language+city pairs)
const languageCityCombos = [
  { lang: "Punjabi", city: "Brampton", langSlug: "punjabi", citySlug: "brampton" },
  { lang: "Punjabi", city: "Mississauga", langSlug: "punjabi", citySlug: "mississauga" },
  { lang: "Punjabi", city: "Toronto", langSlug: "punjabi", citySlug: "toronto" },
  { lang: "Hindi", city: "Toronto", langSlug: "hindi", citySlug: "toronto" },
  { lang: "Hindi", city: "Brampton", langSlug: "hindi", citySlug: "brampton" },
  { lang: "Hindi", city: "Mississauga", langSlug: "hindi", citySlug: "mississauga" },
  { lang: "Tagalog", city: "Toronto", langSlug: "tagalog", citySlug: "toronto" },
  { lang: "Tagalog", city: "Mississauga", langSlug: "tagalog", citySlug: "mississauga" },
  { lang: "Tamil", city: "Toronto", langSlug: "tamil", citySlug: "toronto" },
  { lang: "Tamil", city: "Markham", langSlug: "tamil", citySlug: "markham" },
  { lang: "Urdu", city: "Toronto", langSlug: "urdu", citySlug: "toronto" },
  { lang: "Urdu", city: "Mississauga", langSlug: "urdu", citySlug: "mississauga" },
  { lang: "Mandarin Chinese", city: "Toronto", langSlug: "mandarin", citySlug: "toronto" },
  { lang: "Mandarin Chinese", city: "Markham", langSlug: "mandarin", citySlug: "markham" },
  { lang: "Mandarin Chinese", city: "Richmond Hill", langSlug: "mandarin", citySlug: "richmond-hill" },
  { lang: "Cantonese", city: "Toronto", langSlug: "cantonese", citySlug: "toronto" },
  { lang: "Cantonese", city: "Markham", langSlug: "cantonese", citySlug: "markham" },
  { lang: "French", city: "Ottawa", langSlug: "french", citySlug: "ottawa" },
  { lang: "French", city: "Toronto", langSlug: "french", citySlug: "toronto" },
  { lang: "Gujarati", city: "Toronto", langSlug: "gujarati", citySlug: "toronto" },
  { lang: "Gujarati", city: "Brampton", langSlug: "gujarati", citySlug: "brampton" },
  { lang: "Somali", city: "Toronto", langSlug: "somali", citySlug: "toronto" },
  { lang: "Swahili", city: "Toronto", langSlug: "swahili", citySlug: "toronto" },
  { lang: "Arabic", city: "Toronto", langSlug: "arabic", citySlug: "toronto" },
  { lang: "Arabic", city: "Mississauga", langSlug: "arabic", citySlug: "mississauga" },
  { lang: "Korean", city: "Toronto", langSlug: "korean", citySlug: "toronto" },
  { lang: "Vietnamese", city: "Toronto", langSlug: "vietnamese", citySlug: "toronto" },
  { lang: "Polish", city: "Toronto", langSlug: "polish", citySlug: "toronto" },
  { lang: "Ukrainian", city: "Toronto", langSlug: "ukrainian", citySlug: "toronto" },
  { lang: "Italian", city: "Toronto", langSlug: "italian", citySlug: "toronto" },
  { lang: "Italian", city: "Vaughan", langSlug: "italian", citySlug: "vaughan" },
  { lang: "Portuguese", city: "Toronto", langSlug: "portuguese", citySlug: "toronto" },
  { lang: "Portuguese", city: "Mississauga", langSlug: "portuguese", citySlug: "mississauga" },
  { lang: "Spanish", city: "Toronto", langSlug: "spanish", citySlug: "toronto" },
  { lang: "Bengali", city: "Toronto", langSlug: "bengali", citySlug: "toronto" },
  { lang: "Marathi", city: "Toronto", langSlug: "marathi", citySlug: "toronto" },
  { lang: "Telugu", city: "Toronto", langSlug: "telugu", citySlug: "toronto" },
  { lang: "English", city: "Hamilton", langSlug: "english", citySlug: "hamilton" },
  { lang: "English", city: "London", langSlug: "english", citySlug: "london" },
  { lang: "English", city: "Barrie", langSlug: "english", citySlug: "barrie" },
  { lang: "English", city: "Kingston", langSlug: "english", citySlug: "kingston" },
  { lang: "Farsi", city: "Toronto", langSlug: "farsi", citySlug: "toronto" },
  { lang: "Farsi", city: "Richmond Hill", langSlug: "farsi", citySlug: "richmond-hill" },
  { lang: "Russian", city: "Toronto", langSlug: "russian", citySlug: "toronto" },
  { lang: "Greek", city: "Toronto", langSlug: "greek", citySlug: "toronto" },
  { lang: "Turkish", city: "Toronto", langSlug: "turkish", citySlug: "toronto" },
];

const languageCityPages: SEOPage[] = languageCityCombos.flatMap(({ lang, city, langSlug, citySlug }) => {
  const base = {
    title: `${lang} Speaking Personal Support Workers in ${city} | PSW Direct`,
    description: `Find trusted ${lang} speaking Personal Support Workers in ${city}. Book in-home care and companionship with PSW Direct.`,
    h1: `${lang} Speaking Personal Support Workers in ${city}`,
    body: `<p>PSW Direct connects families in ${city} with vetted Personal Support Workers who speak ${lang}. Whether you need personal care, companionship, or mobility support, our ${lang} speaking caregivers provide culturally sensitive home care you can trust.</p>
<h2>Why Choose a ${lang} Speaking PSW in ${city}?</h2>
<p>Having a caregiver who speaks ${lang} means better communication about medications, daily routines, and care preferences. This is especially important for seniors who feel more comfortable in their native language.</p>
<h2>Book a ${lang} Speaking Caregiver in ${city}</h2>
<p>Home care starting at $30/hour. All PSWs are vetted and police-checked.</p>
<p><a href="/psw-language-${langSlug}">All ${lang} PSWs</a> | <a href="/psw-${citySlug}">All PSWs in ${city}</a> | <a href="/psw-directory">Full Directory</a></p>`,
  };
  return [
    { ...base, path: `/${langSlug}-psw-${citySlug}`, canonical: `https://pswdirect.ca/${langSlug}-psw-${citySlug}` },
    { ...base, path: `/${langSlug}-speaking-psw-${citySlug}`, canonical: `https://pswdirect.ca/${langSlug}-speaking-psw-${citySlug}` },
  ];
});

// ── Language + Service + City pre-rendered pages ─────────────
const langServiceCityServices = [
  { key: "caregiver", label: "Caregiver" },
  { key: "home-care", label: "Home Care" },
  { key: "personal-care", label: "Personal Care" },
  { key: "dementia-care", label: "Dementia Care" },
  { key: "companionship", label: "Companionship" },
  { key: "overnight-care", label: "Overnight Care" },
];
const langServiceCityHighTraffic = [
  { lang: "Punjabi", langSlug: "punjabi", cities: ["toronto", "brampton", "mississauga"] },
  { lang: "Hindi", langSlug: "hindi", cities: ["toronto", "brampton", "mississauga"] },
  { lang: "Urdu", langSlug: "urdu", cities: ["toronto", "mississauga"] },
  { lang: "Tamil", langSlug: "tamil", cities: ["toronto", "markham"] },
  { lang: "Mandarin Chinese", langSlug: "mandarin", cities: ["toronto", "markham", "richmond-hill"] },
  { lang: "Cantonese", langSlug: "cantonese", cities: ["toronto", "markham"] },
  { lang: "Tagalog", langSlug: "tagalog", cities: ["toronto", "mississauga"] },
  { lang: "French", langSlug: "french", cities: ["ottawa", "toronto"] },
  { lang: "Arabic", langSlug: "arabic", cities: ["toronto", "mississauga"] },
  { lang: "Farsi", langSlug: "farsi", cities: ["toronto", "richmond-hill"] },
  { lang: "Italian", langSlug: "italian", cities: ["toronto", "vaughan"] },
  { lang: "Gujarati", langSlug: "gujarati", cities: ["toronto", "brampton"] },
];
const languageServiceCityPages: SEOPage[] = langServiceCityHighTraffic.flatMap(({ lang, langSlug, cities }) =>
  cities.flatMap((citySlug) => {
    const cityLabel = citySlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return langServiceCityServices.map((svc) => ({
      path: `/${langSlug}-${svc.key}-${citySlug}`,
      title: `${lang} ${svc.label} in ${cityLabel} | PSW Direct`,
      description: `Find ${lang} speaking ${svc.label.toLowerCase()} providers in ${cityLabel}. Vetted PSWs who speak ${lang} — book online starting at $30/hour.`,
      canonical: `https://pswdirect.ca/${langSlug}-${svc.key}-${citySlug}`,
      h1: `${lang} ${svc.label} in ${cityLabel}`,
      body: `<p>PSW Direct connects families in ${cityLabel} with vetted Personal Support Workers who speak ${lang} and specialize in ${svc.label.toLowerCase()}. Book culturally sensitive home care you can trust.</p>
<h2>Why Choose ${lang} ${svc.label} in ${cityLabel}?</h2>
<p>Clear communication between caregiver and patient is essential for quality ${svc.label.toLowerCase()}. A ${lang} speaking PSW ensures your loved one can express their needs and understand care instructions.</p>
<h2>Book ${lang} ${svc.label} in ${cityLabel}</h2>
<p>Starting at $30/hour. All PSWs are vetted and police-checked.</p>
<p><a href="/${langSlug}-psw-${citySlug}">${lang} PSWs in ${cityLabel}</a> | <a href="/psw-${citySlug}">All PSWs in ${cityLabel}</a> | <a href="/psw-directory">Full Directory</a></p>`,
    }));
  })
);

// ── Ontario directory index page ─────────────────────────────
const ontarioDirectoryPage: SEOPage = {
  path: "/personal-support-workers-ontario",
  title: "Personal Support Workers in Ontario | PSW Directory | PSW Direct",
  description: "Find trusted Personal Support Workers across Ontario. Browse PSWs by city — Toronto, Mississauga, Brampton, Hamilton, Ottawa, and 20+ more communities. Book home care starting at $30/hour.",
  canonical: "https://pswdirect.ca/personal-support-workers-ontario",
  h1: "Personal Support Workers in Ontario",
  body: `<p>PSW Direct connects families across Ontario with vetted, credential-verified Personal Support Workers. Browse by city to find caregivers near you offering personal care, companionship, dementia support, overnight care, and more — starting at $30/hour with no contracts.</p>
<h2>Browse PSWs by City</h2>
<ul>
${cityRoutes.filter(r => r.slug.startsWith("psw-")).map(r => `<li><a href="/${r.slug}">PSWs in ${r.city}</a></li>`).join("\n")}
</ul>
<h2>Browse by Service Type</h2>
<ul>
<li>Dementia Care</li><li>Alzheimer's Care</li><li>Overnight Care</li><li>24-Hour Home Care</li>
<li>Post-Surgery Care</li><li>Palliative Care</li><li>Respite Care</li><li>Senior Home Care</li>
<li>Personal Care</li><li>Companionship</li><li>Mobility Support</li><li>Doctor Escort</li>
</ul>
<p><a href="/psw-directory">Full PSW Directory</a> | <a href="/psw-near-me">Find PSWs Near You</a></p>`,
};

// ── Home Care Ontario hub page ──────────────────────────────
const homeCareOntarioPage: SEOPage = {
  path: "/home-care-ontario",
  title: "Home Care in Ontario | Personal Support Workers | PSW Direct",
  description: "Find affordable home care across Ontario. PSW Direct connects families with vetted personal support workers in 25+ cities. Book online starting at $30/hr.",
  canonical: "https://pswdirect.ca/home-care-ontario",
  h1: "Home Care in Ontario",
  body: `<p>PSW Direct connects Ontario families with vetted personal support workers for affordable, flexible home care. Browse by city or service type to find a caregiver near you — starting at $30 per hour with no contracts.</p>
<h2>Find Home Care by City</h2>
<ul>
${cityRoutes.filter(r => r.slug.startsWith("home-care-")).map(r => `<li><a href="/${r.slug}">Home Care in ${r.city}</a></li>`).join("\n")}
</ul>
<h2>Frequently Asked Questions</h2>
<p><strong>How much does a PSW cost in Ontario?</strong> PSW Direct starts at $30/hour. Traditional agencies charge $55+.</p>
<p><strong>Can I hire a PSW privately?</strong> Yes. PSW Direct connects families directly with vetted personal support workers.</p>
<p><strong>Is 24-hour home care available?</strong> Yes. Flexible scheduling including overnight and 24-hour care across Ontario.</p>`,
};

// ── High-Intent Hub Pages ───────────────────────────────────
const seniorCareNearMePage: SEOPage = {
  path: "/senior-care-near-me",
  title: "Senior Care Near Me | Find In-Home Caregivers | PSW Direct",
  description: "Find trusted senior care near you in Ontario. PSW Direct connects families with vetted caregivers for elderly home care, companionship, and personal support — starting at $30/hr.",
  canonical: "https://pswdirect.ca/senior-care-near-me",
  h1: "Senior Care Near Me",
  body: `<p>Find trusted, affordable senior care in your area. PSW Direct connects Ontario families with vetted personal support workers for elderly home care, companionship, mobility support, and more — starting at $30/hr with no contracts.</p>
<h2>Find Senior Care by City</h2>
<ul>
${cityRoutes.filter(r => r.slug.startsWith("psw-")).map(r => `<li><a href="/senior-care-${r.slug.replace("psw-", "")}">${r.city}</a></li>`).join("\n")}
</ul>
<p><a href="/home-care-ontario">Home Care Ontario</a> | <a href="/private-caregiver">Private Caregiver</a> | <a href="/in-home-care-ontario">In-Home Care Ontario</a></p>`,
};

const privateCaregiverPage: SEOPage = {
  path: "/private-caregiver",
  title: "Private Caregiver in Ontario | Hire a Personal Caregiver | PSW Direct",
  description: "Hire a private caregiver in Ontario without agency fees. PSW Direct connects families with vetted personal support workers for affordable in-home care from $30/hr.",
  canonical: "https://pswdirect.ca/private-caregiver",
  h1: "Hire a Private Caregiver in Ontario",
  body: `<p>Skip the agency. PSW Direct connects Ontario families directly with vetted personal support workers for affordable, flexible in-home care — starting at $30/hr with no contracts or hidden fees.</p>
<h2>Find a Private Caregiver by City</h2>
<ul>
${cityRoutes.filter(r => r.slug.startsWith("psw-")).map(r => `<li><a href="/private-caregiver-${r.slug.replace("psw-", "")}">${r.city}</a></li>`).join("\n")}
</ul>
<p><a href="/home-care-ontario">Home Care Ontario</a> | <a href="/senior-care-near-me">Senior Care Near Me</a> | <a href="/in-home-care-ontario">In-Home Care Ontario</a></p>`,
};

const inHomeCareOntarioPage: SEOPage = {
  path: "/in-home-care-ontario",
  title: "In-Home Care in Ontario | Private Home Care Services | PSW Direct",
  description: "Find affordable in-home care across Ontario. PSW Direct connects families with vetted personal support workers for senior care, personal care, and companionship from $30/hr.",
  canonical: "https://pswdirect.ca/in-home-care-ontario",
  h1: "In-Home Care in Ontario",
  body: `<p>Professional in-home care across Ontario. PSW Direct connects families with vetted personal support workers for personal care, companionship, senior care, and more — starting at $30/hr with no contracts.</p>
<h2>Find In-Home Care by City</h2>
<ul>
${cityRoutes.filter(r => r.slug.startsWith("psw-")).map(r => `<li><a href="/in-home-care-${r.slug.replace("psw-", "")}">${r.city}</a></li>`).join("\n")}
</ul>
<p><a href="/home-care-ontario">Home Care Ontario</a> | <a href="/senior-care-near-me">Senior Care Near Me</a> | <a href="/private-caregiver">Private Caregiver</a></p>`,
};

// ── Home Care Keyword + City Pages ──────────────────────────
const homeCareKeywords = [
  { key: "senior-care", label: "Senior Care", hubPath: "/senior-care-near-me", hubLabel: "Senior Care Near Me" },
  { key: "private-caregiver", label: "Private Caregiver", hubPath: "/private-caregiver", hubLabel: "Private Caregiver Ontario" },
  { key: "in-home-care", label: "In-Home Care", hubPath: "/in-home-care-ontario", hubLabel: "In-Home Care Ontario" },
];

const homeCareKeywordCityPages: SEOPage[] = cityRoutes
  .filter(r => r.slug.startsWith("psw-"))
  .flatMap(({ slug: citySlug, city }) => {
    const cityKey = citySlug.replace("psw-", "");
    return homeCareKeywords.map(({ key, label, hubPath, hubLabel }) => ({
      path: `/${key}-${cityKey}`,
      title: `${label} in ${city} | PSW Direct`,
      description: `Find affordable ${label.toLowerCase()} in ${city}, Ontario. PSW Direct connects families with vetted personal support workers — book online from $30/hr with no contracts.`,
      canonical: `https://pswdirect.ca/${key}-${cityKey}`,
      h1: `${label} in ${city}`,
      body: `<p>Find affordable ${label.toLowerCase()} in ${city}. PSW Direct connects families with vetted personal support workers — book online from $30/hr with no contracts.</p>
<p><a href="${hubPath}">${hubLabel}</a> | <a href="/psw-${cityKey}">PSWs in ${city}</a> | <a href="/home-care-${cityKey}">Home Care ${city}</a> | <a href="/home-care-ontario">Home Care Ontario</a></p>`,
    }));
  });

// ── Emergency / Same-Day care pages ─────────────────────────
const emergencyCities = cityRoutes.filter(r => r.slug.startsWith("psw-")).map(r => ({ key: r.slug.replace("psw-", ""), label: r.city }));
const emergencyVariants = ["urgent-home-care", "same-day-home-care"];
const emergencyLabels: Record<string, string> = { "urgent-home-care": "Urgent Home Care", "same-day-home-care": "Same-Day Home Care" };

const emergencyPages: SEOPage[] = emergencyCities.flatMap(({ key, label }) =>
  emergencyVariants.map((variant) => ({
    path: `/${variant}-${key}`,
    title: `${emergencyLabels[variant]} in ${label} | PSW Direct`,
    description: `Need ${emergencyLabels[variant].toLowerCase()} in ${label}? PSW Direct connects families with vetted personal support workers for immediate care. Book online starting at $30/hr.`,
    canonical: `https://pswdirect.ca/${variant}-${key}`,
    h1: `${emergencyLabels[variant]} in ${label}`,
    body: `<p>When you need a personal support worker quickly in ${label}, PSW Direct connects you with vetted caregivers who can provide immediate in-home support. No contracts, no agency overhead — just trusted care when you need it most.</p>
<h2>${emergencyLabels[variant]} Services</h2>
<ul>
<li>Emergency Personal Care</li><li>Urgent Companionship</li><li>Fall Recovery Support</li>
<li>Hospital Discharge</li><li>Respite Relief</li><li>Overnight Care</li>
</ul>
<p><a href="/psw-${key}">All PSWs in ${label}</a> | <a href="/home-care-ontario">Home Care Ontario</a> | <a href="/psw-directory">Full Directory</a></p>`,
  }))
);

// ── PSW recruitment pages ───────────────────────────────────
const pswJobCities = cityRoutes.filter(r => r.slug.startsWith("psw-")).map(r => ({
  key: r.slug.replace("psw-", ""),
  label: r.city,
}));

const pswJobCityPages: SEOPage[] = pswJobCities.map(({ key, label }) => ({
  path: `/psw-jobs-${key}`,
  title: `PSW Jobs in ${label} | Work as a Personal Support Worker | PSW Direct`,
  description: `Looking for PSW jobs in ${label}? Join PSW Direct and earn $22–$28/hr with flexible scheduling, no contracts, and direct client bookings.`,
  canonical: `https://pswdirect.ca/psw-jobs-${key}`,
  h1: `PSW Jobs in ${label}`,
  body: `<p>Join PSW Direct and work as an independent personal support worker in ${label}. Earn $22–$28/hr with flexible scheduling, weekly payouts, and no long-term contracts.</p>
<h2>Why Work with PSW Direct</h2>
<ul><li>$22–$28/hr — higher than most agency rates</li><li>Choose your own hours</li><li>No contracts</li><li>Weekly payouts</li></ul>
<p><a href="/join-team">Apply to Join PSW Direct</a></p>
<p><a href="/psw-work-areas-ontario">All Work Areas</a> | <a href="/psw-pay-calculator">Pay Calculator</a></p>`,
}));

const pswJobTypePages: SEOPage[] = [
  { slug: "private-psw-jobs", label: "Private PSW Jobs in Ontario" },
  { slug: "overnight-psw-jobs", label: "Overnight PSW Jobs in Ontario" },
  { slug: "24-hour-psw-jobs", label: "24-Hour PSW Jobs in Ontario" },
  { slug: "psw-part-time-jobs", label: "Part-Time PSW Jobs in Ontario" },
].map(({ slug, label }) => ({
  path: `/${slug}`,
  title: `${label} | PSW Direct`,
  description: `Find ${label.toLowerCase()} with PSW Direct. Earn $22–$28/hr, flexible scheduling, no contracts.`,
  canonical: `https://pswdirect.ca/${slug}`,
  h1: label,
  body: `<p>PSW Direct is hiring for ${label.toLowerCase()} across Ontario. Earn $22–$28/hr with flexible scheduling and no long-term contracts.</p>
<p><a href="/join-team">Apply Now</a> | <a href="/psw-work-areas-ontario">Work Areas</a> | <a href="/psw-pay-calculator">Pay Calculator</a></p>`,
}));

const recruitmentUtilityPages: SEOPage[] = [
  {
    path: "/psw-pay-calculator",
    title: "PSW Pay Calculator | Estimate Your Earnings | PSW Direct",
    description: "Calculate how much you can earn as a personal support worker in Ontario. Estimate weekly and monthly income based on hourly rate and hours worked.",
    canonical: "https://pswdirect.ca/psw-pay-calculator",
    h1: "PSW Pay Calculator",
    body: `<p>Estimate how much you can earn as a personal support worker in Ontario. Adjust the hourly rate and weekly hours to see your projected income.</p>
<p>PSW Direct pays $22–$28/hr. <a href="/join-team">Apply now</a>.</p>`,
  },
  {
    path: "/psw-agency-vs-private-pay",
    title: "PSW Agency vs Private Pay | Compare Earnings | PSW Direct",
    description: "Compare PSW agency pay vs private marketplace pay in Ontario. Learn how much more you can earn working independently with PSW Direct.",
    canonical: "https://pswdirect.ca/psw-agency-vs-private-pay",
    h1: "PSW Agency vs Private Pay",
    body: `<p>Traditional agencies take 30–50% of client fees. PSW Direct passes more value to workers — $22–$28/hr vs $18–$22/hr at agencies.</p>
<p><a href="/join-team">Apply to earn more</a> | <a href="/psw-pay-calculator">Pay Calculator</a></p>`,
  },
  {
    path: "/psw-work-areas-ontario",
    title: "PSW Work Areas in Ontario | Where We're Hiring | PSW Direct",
    description: "See where PSW Direct is hiring personal support workers across Ontario. Join our team in Toronto, Mississauga, Brampton, Ottawa, and 20+ more cities.",
    canonical: "https://pswdirect.ca/psw-work-areas-ontario",
    h1: "PSW Work Areas in Ontario",
    body: `<p>PSW Direct is actively hiring personal support workers across Ontario. Browse by region to find opportunities near you.</p>
<ul>${pswJobCities.map(c => `<li><a href="/psw-jobs-${c.key}">PSW Jobs in ${c.label}</a></li>`).join("\n")}</ul>
<p><a href="/join-team">Apply Now</a></p>`,
  },
];

// ── Ontario PSW Locations Hub ────────────────────────────────
const ontarioPSWLocationsHubPage: SEOPage = {
  path: "/ontario-psw-locations",
  title: "Ontario PSW Locations | Find Personal Support Workers Near You",
  description: "Browse all Ontario cities served by PSW Direct. Find vetted Personal Support Workers in Toronto, Mississauga, Barrie, Hamilton, Ottawa, and 35+ communities across Ontario.",
  canonical: "https://pswdirect.ca/ontario-psw-locations",
  h1: "Ontario PSW Locations",
  body: `<p>PSW Direct serves 40+ communities across Ontario with vetted, credential-verified Personal Support Workers. Select your city below to find caregivers near you.</p>
<h2>Browse PSWs by City</h2>
<ul>
${cityRoutes.filter(r => r.slug.startsWith("psw-")).map(r => `<li><a href="/${r.slug}">PSWs in ${r.city}</a></li>`).join("\n")}
</ul>
<h2>Common Questions</h2>
<ul>
<li><a href="/how-much-does-a-psw-cost-toronto">How Much Does a PSW Cost in Toronto?</a></li>
<li><a href="/psw-hourly-rate-ontario">PSW Hourly Rate in Ontario</a></li>
<li><a href="/what-does-a-psw-do">What Does a PSW Do?</a></li>
<li><a href="/is-a-psw-covered-by-insurance-ontario">Is a PSW Covered by Insurance?</a></li>
<li><a href="/psw-vs-home-care-worker-ontario">PSW vs Home Care Worker</a></li>
<li><a href="/dementia-care-cost-ontario">Dementia Care Cost in Ontario</a></li>
</ul>
<p><a href="/psw-directory">Full PSW Directory</a> | <a href="/home-care-ontario">Home Care Ontario</a> | <a href="/guides">Home Care Guides</a> | <a href="/coverage">Coverage Map</a></p>`,
};

// ── Question / informational SEO pages ──────────────────────
const questionSEOPages: SEOPage[] = [
  {
    path: "/how-much-does-a-psw-cost-toronto",
    title: "How Much Does a PSW Cost in Toronto? | PSW Direct",
    description: "Find out the cost of hiring a Personal Support Worker in Toronto. PSW Direct offers transparent pricing starting at $30/hr with no agency markups.",
    canonical: "https://pswdirect.ca/how-much-does-a-psw-cost-toronto",
    h1: "How Much Does a PSW Cost in Toronto?",
    body: `<p>Hiring a Personal Support Worker (PSW) in Toronto typically costs between $25 and $45 per hour through traditional agencies. At PSW Direct, our rates start at $30 per hour with no hidden fees, agency markups, or long-term contracts.</p>
<p><a href="/psw-toronto">PSWs in Toronto</a> | <a href="/ontario-psw-locations">All Ontario Locations</a> | <a href="/guides/cost-of-home-care-ontario">Cost of Home Care Guide</a></p>`,
  },
  {
    path: "/psw-hourly-rate-ontario",
    title: "PSW Hourly Rate in Ontario 2025 | What PSWs Earn",
    description: "Current PSW hourly rates in Ontario for 2025. Learn what Personal Support Workers earn across the province.",
    canonical: "https://pswdirect.ca/psw-hourly-rate-ontario",
    h1: "PSW Hourly Rate in Ontario",
    body: `<p>Personal Support Workers in Ontario earn between $18 and $28 per hour depending on the employer, location, and type of care provided.</p>
<p><a href="/psw-pay-calculator">PSW Pay Calculator</a> | <a href="/psw-agency-vs-private-pay">Agency vs Private Pay</a> | <a href="/ontario-psw-locations">All Ontario Locations</a></p>`,
  },
  {
    path: "/how-to-hire-a-psw-barrie",
    title: "How to Hire a PSW in Barrie, Ontario | PSW Direct",
    description: "Step-by-step guide to hiring a Personal Support Worker in Barrie, ON.",
    canonical: "https://pswdirect.ca/how-to-hire-a-psw-barrie",
    h1: "How to Hire a PSW in Barrie",
    body: `<p>Finding a reliable Personal Support Worker in Barrie doesn't have to be complicated.</p>
<p><a href="/psw-barrie">PSWs in Barrie</a> | <a href="/guides/how-to-hire-a-personal-support-worker">Full Hiring Guide</a> | <a href="/ontario-psw-locations">All Ontario Locations</a></p>`,
  },
  {
    path: "/what-does-a-psw-do",
    title: "What Does a PSW Do? | Personal Support Worker Duties",
    description: "Learn what a Personal Support Worker (PSW) does, including daily duties, qualifications, and how they help with home care in Ontario.",
    canonical: "https://pswdirect.ca/what-does-a-psw-do",
    h1: "What Does a Personal Support Worker Do?",
    body: `<p>A Personal Support Worker (PSW) is a trained healthcare professional who provides hands-on assistance with activities of daily living.</p>
<p><a href="/psw-directory">Browse PSWs</a> | <a href="/guides/psw-vs-nurse-difference">PSW vs Nurse</a> | <a href="/ontario-psw-locations">All Ontario Locations</a></p>`,
  },
  {
    path: "/is-a-psw-covered-by-insurance-ontario",
    title: "Is a PSW Covered by Insurance in Ontario? | PSW Direct",
    description: "Learn whether personal support worker services are covered by OHIP, private insurance, or government programs in Ontario.",
    canonical: "https://pswdirect.ca/is-a-psw-covered-by-insurance-ontario",
    h1: "Is a PSW Covered by Insurance in Ontario?",
    body: `<p>Many Ontario families wonder whether the cost of a Personal Support Worker is covered by insurance or government programs.</p>
<p><a href="/guides/cost-of-home-care-ontario">Cost of Home Care Guide</a> | <a href="/ontario-psw-locations">All Ontario Locations</a></p>`,
  },
  {
    path: "/psw-vs-home-care-worker-ontario",
    title: "PSW vs Home Care Worker in Ontario | What's the Difference?",
    description: "Understand the difference between a PSW and a home care worker in Ontario.",
    canonical: "https://pswdirect.ca/psw-vs-home-care-worker-ontario",
    h1: "PSW vs Home Care Worker: What's the Difference?",
    body: `<p>Families searching for in-home care in Ontario often wonder about the difference between a Personal Support Worker (PSW) and a home care worker.</p>
<p><a href="/guides/psw-vs-nurse-difference">PSW vs Nurse Guide</a> | <a href="/psw-directory">Browse PSWs</a> | <a href="/ontario-psw-locations">All Ontario Locations</a></p>`,
  },
  {
    path: "/overnight-psw-cost-toronto",
    title: "Overnight PSW Cost in Toronto | PSW Direct",
    description: "Find out the cost of overnight PSW care in Toronto. Compare agency rates vs PSW Direct pricing.",
    canonical: "https://pswdirect.ca/overnight-psw-cost-toronto",
    h1: "How Much Does Overnight PSW Care Cost in Toronto?",
    body: `<p>Overnight PSW care in Toronto is one of the most requested home care services, especially for seniors with dementia, fall risks, or post-surgery recovery needs.</p>
<p><a href="/overnight-care-toronto">Overnight Care Toronto</a> | <a href="/psw-toronto">PSWs in Toronto</a> | <a href="/ontario-psw-locations">All Ontario Locations</a></p>`,
  },
  {
    path: "/dementia-care-cost-ontario",
    title: "Dementia Care Cost in Ontario 2025 | PSW Direct",
    description: "Learn the cost of dementia care in Ontario including in-home PSW care, long-term care homes, and memory care facilities.",
    canonical: "https://pswdirect.ca/dementia-care-cost-ontario",
    h1: "How Much Does Dementia Care Cost in Ontario?",
    body: `<p>Dementia care is one of the largest expenses Ontario families face. Understanding the costs helps families plan ahead.</p>
<p><a href="/dementia-care-toronto">Dementia Care Toronto</a> | <a href="/guides/cost-of-home-care-ontario">Cost of Home Care Guide</a> | <a href="/ontario-psw-locations">All Ontario Locations</a></p>`,
  },
];

// ── Ontario Home Care Hub page (/ontario-home-care) ─────────
const ontarioHomeCareHubPage: SEOPage = {
  path: "/ontario-home-care",
  title: "Ontario Home Care Services | PSW Direct",
  description: "Browse PSW Direct home care and personal support worker services across Ontario. Find your city and book care online.",
  canonical: "https://pswdirect.ca/ontario-home-care",
  h1: "Home Care Services Across Ontario",
  body: `<p>PSW Direct provides vetted personal support workers and home care services across Ontario. Whether you need companionship, personal care, dementia support, or post-surgery assistance, our city-specific pages help you find local availability and book care online — starting at $30/hr with no contracts and no agency markup.</p>
<h2>Find Home Care in Your City</h2>
<p>Browse home care services by city across Ontario:</p>
<ul>
<li><a href="/home-care-toronto">Home Care in Toronto</a></li>
<li><a href="/home-care-mississauga">Home Care in Mississauga</a></li>
<li><a href="/home-care-brampton">Home Care in Brampton</a></li>
<li><a href="/home-care-vaughan">Home Care in Vaughan</a></li>
<li><a href="/home-care-markham">Home Care in Markham</a></li>
<li><a href="/home-care-richmond-hill">Home Care in Richmond Hill</a></li>
<li><a href="/home-care-oakville">Home Care in Oakville</a></li>
<li><a href="/home-care-burlington">Home Care in Burlington</a></li>
<li><a href="/home-care-hamilton">Home Care in Hamilton</a></li>
<li><a href="/home-care-barrie">Home Care in Barrie</a></li>
<li><a href="/home-care-ottawa">Home Care in Ottawa</a></li>
<li><a href="/home-care-london">Home Care in London</a></li>
<li><a href="/home-care-kitchener">Home Care in Kitchener</a></li>
<li><a href="/home-care-kingston">Home Care in Kingston</a></li>
<li><a href="/home-care-oshawa">Home Care in Oshawa</a></li>
<li><a href="/home-care-windsor">Home Care in Windsor</a></li>
<li><a href="/home-care-guelph">Home Care in Guelph</a></li>
<li><a href="/home-care-cambridge">Home Care in Cambridge</a></li>
<li><a href="/home-care-waterloo">Home Care in Waterloo</a></li>
<li><a href="/home-care-ajax">Home Care in Ajax</a></li>
<li><a href="/home-care-pickering">Home Care in Pickering</a></li>
<li><a href="/home-care-whitby">Home Care in Whitby</a></li>
<li><a href="/home-care-newmarket">Home Care in Newmarket</a></li>
<li><a href="/home-care-aurora">Home Care in Aurora</a></li>
<li><a href="/home-care-milton">Home Care in Milton</a></li>
<li><a href="/home-care-innisfil">Home Care in Innisfil</a></li>
<li><a href="/home-care-orillia">Home Care in Orillia</a></li>
<li><a href="/home-care-peterborough">Home Care in Peterborough</a></li>
<li><a href="/home-care-belleville">Home Care in Belleville</a></li>
<li><a href="/home-care-cobourg">Home Care in Cobourg</a></li>
<li><a href="/home-care-niagara-falls">Home Care in Niagara Falls</a></li>
<li><a href="/home-care-st-catharines">Home Care in St. Catharines</a></li>
<li><a href="/home-care-welland">Home Care in Welland</a></li>
</ul>
<h2>Why Families Choose PSW Direct</h2>
<p>Finding reliable home care in Ontario can be overwhelming. Traditional agencies charge $55 or more per hour, lock families into long-term contracts, and provide little transparency about which caregiver will arrive at your door. PSW Direct was built to change that by connecting families directly with qualified personal support workers at fair, transparent rates.</p>
<p>Every PSW on our platform is individually vetted with a valid PSW certificate, government ID verification, and a recent police background check. We serve more than 30 communities across Ontario — from Toronto and Mississauga to Kingston, Barrie, and Ottawa — ensuring that quality home care is accessible no matter where you live.</p>
<p>Our services include personal care, mobility assistance, companionship, meal preparation, medication reminders, dementia and Alzheimer's care, overnight care, respite care, and post-surgery recovery support. You can book by the hour, choose your preferred schedule, and cancel anytime — no contracts, no hidden fees.</p>
<p><a href="/home-care-ontario">Home Care Ontario</a> | <a href="/in-home-care-ontario">In-Home Care Ontario</a> | <a href="/private-home-care">Private Home Care</a> | <a href="/psw-directory">PSW Directory</a> | <a href="/cities">All Cities</a> | <a href="/guides">Care Guides</a></p>`,
};

// ── All pages ────────────────────────────────────────────────
const allPages: SEOPage[] = [...guidePages, ...nearMeVariants, ...cityPages, directoryPage, ontarioDirectoryPage, homeCareOntarioPage, ontarioHomeCareHubPage, ontarioPSWLocationsHubPage, seniorCareNearMePage, privateCaregiverPage, inHomeCareOntarioPage, ...cityServiceCombos, ...languagePages, ...languageCityPages, ...languageServiceCityPages, ...emergencyPages, ...pswJobCityPages, ...pswJobTypePages, ...recruitmentUtilityPages, ...questionSEOPages, ...homeCareKeywordCityPages];

const SITEMAP_BASE_URL = allPages[0]?.canonical ? new URL(allPages[0].canonical).origin : "https://pswdirect.ca";

const staticSitemapPaths = [
  "/",
  "/faq",
  "/about",
  "/guides",
  "/coverage",
  "/cities",
  "/languages",
  "/psw-directory",
  "/personal-support-workers-ontario",
  "/home-care-ontario",
  "/ontario-home-care",
  "/psw-near-me",
  "/home-care-near-me",
  "/personal-support-worker-near-me",
  "/senior-care-near-me",
  "/private-caregiver",
  "/in-home-care-ontario",
  "/private-home-care",
  "/private-home-care-ontario",
  "/ontario-psw-locations",
  "/psw-pay-calculator",
  "/psw-agency-vs-private-pay",
  "/psw-cost",
  "/psw-work-areas-ontario",
];

function buildSitemapXml(): string {
  const today = new Date().toISOString().split("T")[0];
  const urls = Array.from(
    new Set([
      ...staticSitemapPaths.map((path) => `${SITEMAP_BASE_URL}${path}`),
      ...allPages.map((page) => page.canonical),
    ])
  ).sort((a, b) => a.localeCompare(b));

  const urlset = urls
    .map(
      (loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${loc === `${SITEMAP_BASE_URL}/` ? "daily" : "weekly"}</changefreq>\n    <priority>${loc === `${SITEMAP_BASE_URL}/` ? "1.0" : "0.8"}</priority>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}\n</urlset>`;
}

// ── HTML template ────────────────────────────────────────────
function buildHTML(page: SEOPage, indexHtml: string): string {
  // Extract everything between <body> and </body> from the source index.html
  // to get script tags and other body content
  const scriptMatch = indexHtml.match(
    /<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/
  );
  const cssLinks =
    indexHtml.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || [];

  // Extract all JSON-LD blocks from original index.html
  const jsonLdBlocks =
    indexHtml.match(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/g
    ) || [];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>${page.title}</title>
<meta name="description" content="${page.description}" />
<link rel="canonical" href="${page.canonical}" />
<meta name="author" content="PSW Direct" />
<link rel="manifest" href="https://progressier.app/xXf0UWVAPdw78va7cNFf/progressier.json"/>
<script>
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){});}
(function(){
  window.progressierCustomServiceWorker='/sw.js';
  var s=document.createElement('script');
  s.src='https://progressier.app/xXf0UWVAPdw78va7cNFf/script.js';
  s.async=true;
  s.onerror=function(){};
  document.head.appendChild(s);
})();
<\/script>
<link rel="icon" href="/favicon.png" type="image/png" />
<meta name="theme-color" content="#0f172a" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="PSW Direct" />
<link rel="apple-touch-icon" href="/logo-192.png" />
<meta property="og:title" content="${page.title}" />
<meta property="og:description" content="${page.description}" />
<meta property="og:url" content="${page.canonical}" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://pswdirect.ca/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@PSWDirect" />
<meta name="twitter:title" content="${page.title}" />
<meta name="twitter:description" content="${page.description}" />
<meta name="twitter:image" content="https://pswdirect.ca/og-image.png" />
${jsonLdBlocks.join("\n")}
${cssLinks.join("\n")}
</head>
<body>
<div id="root">
<div style="max-width:800px;margin:0 auto;padding:24px 16px;font-family:system-ui,-apple-system,sans-serif;">
<header style="margin-bottom:24px;">
<a href="/" style="font-weight:700;font-size:18px;color:#0f172a;text-decoration:none;">PSW Direct</a>
<span style="float:right;"><a href="tel:2492884787" style="color:#0f172a;">(249) 288-4787</a></span>
</header>
<h1 style="font-size:28px;font-weight:700;margin-bottom:16px;">${page.h1}</h1>
${page.body}
<div style="margin-top:32px;text-align:center;">
<a href="https://pswdirect.ca/" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Book a Personal Support Worker</a>
</div>
<footer style="margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;font-size:13px;color:#64748b;">
<p>PSW Direct — Quality personal support care for Ontario families</p>
<p>© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
</footer>
</div>
</div>
${scriptMatch ? `<script type="module" src="${scriptMatch[1]}"></script>` : '<script type="module" src="/src/main.tsx"></script>'}
</body>
</html>`;
}

// ── Plugin ───────────────────────────────────────────────────
export function seoPrerender(): Plugin {
  let outDir = "dist";

  return {
    name: "seo-prerender",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir || "dist";
    },
    closeBundle() {
      let indexHtml: string;
      try {
        indexHtml = readFileSync(join(outDir, "index.html"), "utf-8");
      } catch {
        console.warn("[seo-prerender] Could not read dist/index.html, using fallback");
        indexHtml = "";
      }

      let count = 0;
      for (const page of allPages) {
        const html = buildHTML(page, indexHtml);
        // Create /path/index.html so the host serves it for /path
        const dir = join(outDir, page.path);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "index.html"), html, "utf-8");
        count++;
      }

      writeFileSync(join(outDir, "sitemap.xml"), buildSitemapXml(), "utf-8");
      console.log(`[seo-prerender] Generated ${count} pre-rendered SEO pages`);
    },
  };
}

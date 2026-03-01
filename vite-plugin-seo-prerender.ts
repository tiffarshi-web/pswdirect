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
    canonical: "https://psadirect.ca/guides",
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
      "https://psadirect.ca/guides/how-to-hire-a-personal-support-worker",
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
      "https://psadirect.ca/guides/cost-of-home-care-ontario",
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
      "https://psadirect.ca/guides/hospital-discharge-checklist",
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
      "https://psadirect.ca/guides/signs-your-parent-needs-home-care",
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
      "https://psadirect.ca/guides/psw-vs-nurse-difference",
    h1: "PSW vs Nurse: What's the Difference?",
    body: `<p>When families look into home care, they often wonder whether they need a personal support worker (PSW) or a nurse. Both play important roles in the healthcare system, but their training, responsibilities, and costs differ significantly.</p>
<h2>Key Differences</h2>
<p>PSWs provide hands-on personal care, companionship, and daily living support. Nurses handle clinical tasks like wound care, IV administration, and medical assessments. For most in-home care needs, a PSW provides the right level of support at a more affordable rate.</p>`,
  },
];

// ── Near-me pages ────────────────────────────────────────────
const nearMeVariants: SEOPage[] = [
  {
    path: "/psw-near-me",
    title: "PSW Near Me | Personal Support Worker Services | PSW Direct",
    description:
      "Looking for a PSW near you? Book trusted personal support workers across Toronto, the GTA, and Ontario starting at $30 per hour.",
    canonical: "https://psadirect.ca/psw-near-me",
    h1: "PSW Near You",
    body: "",
  },
  {
    path: "/home-care-near-me",
    title:
      "Home Care Near Me | Affordable In-Home Support | PSW Direct",
    description:
      "Find affordable home care near you. Book vetted personal support workers across Toronto, the GTA, and Ontario starting at $30 per hour.",
    canonical: "https://psadirect.ca/home-care-near-me",
    h1: "Home Care Near You",
    body: "",
  },
  {
    path: "/personal-support-worker-near-me",
    title: "Personal Support Worker Near Me | PSW Direct",
    description:
      "Looking for a personal support worker near you? Book trusted home care services across Toronto, the GTA, and Ontario starting at $30 per hour.",
    canonical: "https://psadirect.ca/personal-support-worker-near-me",
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
];

const cityPages: SEOPage[] = cityRoutes.map(({ slug, city }) => ({
  path: `/${slug}`,
  title: `Personal Support Worker in ${city} | Home Care Services | PSW Direct`,
  description: `Book a personal support worker in ${city}. Affordable home care starting at $30/hour. Serving Toronto, the GTA and Ontario.`,
  canonical: `https://psadirect.ca/${slug}`,
  h1: `Personal Support Worker in ${city}`,
  body: `<p>PSW Direct connects families in ${city} with vetted personal support workers. Book trusted caregivers for senior support, mobility assistance, companionship, and post-hospital recovery — starting at $30 per hour with no contracts.</p>
<h2>Home Care Services in ${city}</h2>
<ul>
<li>Senior Companionship</li>
<li>Personal Care Assistance</li>
<li>Mobility Support</li>
<li>Hospital Discharge Support</li>
<li>Doctor Escort Services</li>
</ul>
<h2>Why Choose PSW Direct in ${city}?</h2>
<p>All PSW Direct caregivers are credential-verified and screened before being approved on the platform. Home care in ${city} starts at $30 per hour — no agency markups, no contracts.</p>`,
}));

// ── Directory page ───────────────────────────────────────────
const directoryPage: SEOPage = {
  path: "/psw-directory",
  title: "Personal Support Workers in Ontario | PSW Directory | PSW Direct",
  description: "Browse vetted personal support workers across Ontario. Find a PSW by city or language. Book trusted home care starting at $30/hour on PSADIRECT.CA.",
  canonical: "https://psadirect.ca/psw-directory",
  h1: "Personal Support Workers (PSWs) in Ontario",
  body: `<p>Browse credential-verified personal support workers available through PSW Direct. All caregivers on PSADIRECT.CA are screened, police-checked, and ready to provide quality home care across Ontario.</p>
<p>Use the directory to find a PSW by city or language, then view their full profile to learn more and book care.</p>
<p><a href="https://psadirect.ca/">Book a Personal Support Worker</a></p>`,
};

// ── All pages ────────────────────────────────────────────────
const allPages: SEOPage[] = [...guidePages, ...nearMeVariants, ...cityPages, directoryPage];

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
<script defer src="https://progressier.app/xXf0UWVAPdw78va7cNFf/script.js"><\/script>
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
<meta property="og:image" content="https://psadirect.ca/logo-512.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@PSWDirect" />
<meta name="twitter:title" content="${page.title}" />
<meta name="twitter:description" content="${page.description}" />
<meta name="twitter:image" content="https://psadirect.ca/logo-512.png" />
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
<a href="https://psadirect.ca/" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Book a Personal Support Worker</a>
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
      console.log(`[seo-prerender] Generated ${count} pre-rendered SEO pages`);
    },
  };
}

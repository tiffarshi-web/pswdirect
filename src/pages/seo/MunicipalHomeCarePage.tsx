import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SeoCallCta from "@/components/seo/SeoCallCta";
import logo from "@/assets/logo.png";
import { SITE_ORIGIN } from "@/lib/seoIndexability";
import { seoStartingRate } from "@/lib/seoDisplayPricing";
import { buildBreadcrumbList } from "@/lib/seoUtils";
import { homeCareFAQs, type PlanningFAQ } from "@/lib/homeCarePlanning";
import HomeCarePlanningFAQs from "@/components/seo/HomeCarePlanningFAQs";
import { isSitemapEligiblePath } from "@/lib/seoEligibilityManifest";
import { ONTARIO_MUNICIPAL_PLACES, municipalCommunityLinks, municipalNeighbours, type MunicipalPlace } from "@/lib/ontarioMunicipalPlaces";

type Setting = "very-rural" | "rural" | "small-town" | "urban";
const settingOf = (p: MunicipalPlace): Setting => {
  const d = p.area > 0 ? p.pop / p.area : 0;
  return d < 5 ? "very-rural" : d < 40 ? "rural" : d < 400 ? "small-town" : "urban";
};
const typeLabel = (p: MunicipalPlace) => p.type === "Municipality" ? "municipality" : p.type.toLowerCase();
const round = (n: number) => n >= 10000 ? Math.round(n / 1000) * 1000 : n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 10) * 10;

const SETTING_PLAN: Record<Setting, { heading: string; text: (n: string) => string[] }> = {
  "very-rural": { heading: "Planning care across a large, sparsely populated area", text: n => [
    `Homes in ${n} can be far apart. Give the full civic (911) address, the nearest crossroads and any private-road or driveway details so caregiver travel can be assessed for your request.`,
    "Allow extra time between booking and the first visit, and say whether a winter or seasonal road affects access. Longer visits can make a trip more practical than several short ones.",
  ] },
  rural: { heading: "Rural and small-community addresses", text: n => [
    `Many ${n} addresses are outside a town centre. Include the civic address, a description of the laneway or entrance and where a caregiver can park.`,
    "If your loved one lives on a farm or acreage, note pets, outbuildings and which door to use so the visit starts smoothly.",
  ] },
  "small-town": { heading: "Planning visits in a smaller community", text: n => [
    `In ${n}, share the exact address and unit or apartment details, building entry instructions and parking options.`,
    "Recurring visits on the same days and times can make it easier to keep a consistent routine; each recurring visit still needs confirmation.",
  ] },
  urban: { heading: "Planning visits in a built-up area", text: n => [
    `For ${n} addresses, include the unit number, buzzer or concierge instructions and visitor parking details.`,
    "If the visit is in a condo or seniors' building, check whether caregivers need to sign in at the front desk.",
  ] },
};

const TASKS = [
  "Personal care: bathing, dressing, grooming and toileting",
  "Companionship, conversation and familiar activities",
  "Meal preparation and light care-related housekeeping",
  "Help with familiar mobility aids and medication reminders under the existing care plan",
  "Planned relief visits for family caregivers",
];

export default function MunicipalHomeCarePage({ placeKey }: { placeKey: string }) {
  const p = ONTARIO_MUNICIPAL_PLACES.find(x => x.key === placeKey);
  if (!p) return null;
  const n = p.name;
  const setting = settingOf(p);
  const plan = SETTING_PLAN[setting];
  const where = p.regionLabel === "Ontario" ? "Ontario" : `${p.regionLabel}, Ontario`;
  const title = `Home Care in ${n}, Ontario – In-Home PSW Help | PSW Direct`;
  const description = `Plan in-home PSW support in ${n} (${p.regionLabel === "Ontario" ? "Ontario" : p.regionLabel}). $40/hour in 2-hour increments; address coverage and caregiver acceptance are confirmed at booking.`;
  const canonical = `${SITE_ORIGIN}/${p.slug}`;
  const rate = seoStartingRate("home-care");
  const communities = municipalCommunityLinks(p.key).filter(c => isSitemapEligiblePath(`/${c.slug}`));
  const neighbours = municipalNeighbours(p);
  const extra: PlanningFAQ[] = [
    { q: `Does PSW Direct have an office or staff based in ${n}?`, a: `This page does not mean PSW Direct has an office or caregivers based in ${n}. Enter the exact care address when booking; coverage, travel and caregiver acceptance are confirmed for that address before a visit is relied on.` },
    setting === "very-rural" || setting === "rural" || p.northern
      ? { q: `How far ahead should I book for a ${n} address?`, a: "Booking earlier gives more time to check travel and find a caregiver who can accept. Same-day visits are not guaranteed, especially for addresses that involve longer travel." }
      : { q: `Can I book recurring visits in ${n}?`, a: "Yes, you can request regular visits. Each visit is booked in 2-hour increments and confirmed separately; a recurring pattern is not guaranteed until caregivers accept." },
    { q: "Can private home care work alongside publicly funded home care?", a: "Yes. Publicly funded home care in Ontario is arranged through Ontario Health atHome after an eligibility assessment. Families sometimes book private PSW visits for extra hours or tasks; tell us about any existing care schedule so visits do not overlap." },
  ];
  const faqs = [...homeCareFAQs(n), ...extra];

  return <>
    <Helmet>
      <title>{title}</title><meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} /><meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} /><meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" /><meta name="twitter:title" content={title} /><meta name="twitter:description" content={description} />
      <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: canonical })}</script>
      <script type="application/ld+json">{JSON.stringify(buildBreadcrumbList([{ name: "Home", url: SITE_ORIGIN }, { name: "Home care in Ontario", url: `${SITE_ORIGIN}/home-care-ontario` }, { name: `Home care in ${n}`, url: canonical }]))}</script>
    </Helmet>
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border"><div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <Link to="/"><img src={logo} alt="PSW Direct" className="h-10 w-auto" /></Link><SeoCallCta className="text-sm" />
      </div></header>
      <main>
        <section className="max-w-4xl mx-auto px-4 py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6"><Link to="/" className="hover:underline">Home</Link> / <Link to="/home-care-ontario" className="hover:underline">Home care in Ontario</Link> / {n}</nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-5">Home Care in {n}</h1>
          <p className="text-lg text-muted-foreground mb-5">Plan in-home personal support for a parent, partner or loved one in {n}, {where}. Tell us about personal care, meals, companionship or family respite needs so coverage for the exact address and a suitable caregiver can be considered.</p>
          <p className="font-semibold mb-5">Home care is ${rate}/hour, booked in 2-hour increments. Applicable taxes and your total are shown before you submit a booking.</p>
          <div className="flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/">Request home care in {n}</Link></Button><SeoCallCta /></div>
          <p className="text-sm text-muted-foreground mt-3">Customer support is available 24 hours a day, 7 days a week. Care visits are scheduled separately and are not guaranteed around the clock.</p>
          <p className="text-sm text-muted-foreground mt-3">Availability for your exact {n} address, tasks, date and hours, caregiver suitability and acceptance are confirmed during booking. PSW Direct does not claim an office, local staff or guaranteed coverage in {n}. Please wait for confirmation before relying on care.</p>
        </section>
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-semibold mb-3">About {n} for care planning</h2>
          <p className="text-muted-foreground">{n} is {p.tier === "Single-tier" ? "a single-tier" : "a"} {typeLabel(p)} in {where}, with about {round(p.pop).toLocaleString("en-CA")} residents across roughly {Math.round(p.area).toLocaleString("en-CA")} km² (Statistics Canada, 2021 Census). {p.northern ? "As a Northern Ontario community, travel distances to some addresses can be longer." : ""}</p>
          {communities.length > 0 && <p className="text-muted-foreground mt-3">Communities in {n} with their own planning pages: {communities.map((c, i) => <span key={c.key}>{i > 0 && ", "}<Link to={`/${c.slug}`} className="text-primary hover:underline">{c.name}</Link></span>)}. Use whichever matches your address; both lead to the same booking checks.</p>}
        </section>
        <section className="bg-muted/30 border-y border-border px-4 py-10"><div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">{plan.heading}</h2>
          <div className="space-y-3 text-muted-foreground">{plan.text(n).map(t => <p key={t}>{t}</p>)}</div>
        </div></section>
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-semibold mb-4">What a PSW can help with</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">{TASKS.map(t => <li key={t}>{t}</li>)}</ul>
          <p className="text-sm text-muted-foreground mt-4">PSWs do not diagnose, prescribe medication, provide rehabilitation, replace nursing care or provide emergency medical transport.</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">How booking works</h2>
          <ol className="list-decimal pl-5 space-y-3 text-muted-foreground">
            <li>Enter the {n} care address, date, hours (in 2-hour increments) and the tasks needed.</li>
            <li>Review the price and total, then submit your request.</li>
            <li>Address coverage, caregiver suitability and acceptance are confirmed before you rely on the visit. Name a reachable family contact and who resumes care afterwards.</li>
          </ol>
          <div className="flex flex-wrap gap-3 mt-6"><Button asChild size="lg"><Link to="/">Book home care</Link></Button><SeoCallCta /></div>
        </section>
        <section className="border-t border-border px-4 py-8"><div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Support for different family needs</h2>
          <ul className="space-y-3 text-primary mb-8">
            <li><Link to="/post-surgery-care-ontario" className="hover:underline">Planning non-clinical support at home after surgery</Link></li>
            <li><Link to="/dementia-care-ontario" className="hover:underline">Dementia-related daily support and family respite planning</Link></li>
            <li><Link to="/respite-care-ontario" className="hover:underline">Respite at home: planning a break and family handover</Link></li>
            <li><Link to="/guides/cost-of-home-care-ontario" className="hover:underline">Planning home-care costs in Ontario</Link></li>
          </ul>
          {neighbours.length > 0 && <><h2 className="text-xl font-semibold mb-4">Other places in {p.regionLabel === "Ontario" ? "Ontario" : p.regionLabel}</h2>
          <ul className="grid sm:grid-cols-2 gap-3 text-primary">{neighbours.map(x => <li key={x.key}><Link to={`/${x.slug}`} className="hover:underline">Home care in {x.name}</Link></li>)}</ul></>}
          <p className="mt-6"><Link to="/home-care-ontario" className="text-primary hover:underline">All Ontario home-care planning pages</Link></p>
        </div></section>
        <HomeCarePlanningFAQs faqs={faqs} />
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">PSW Direct · Ontario home care · <Link to="/" className="text-primary hover:underline">Book online</Link></footer>
    </div>
  </>;
}

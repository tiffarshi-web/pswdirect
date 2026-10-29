import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SeoCallCta from "./SeoCallCta";
import HomeCarePlanningFAQs from "./HomeCarePlanningFAQs";
import logo from "@/assets/logo.png";
import { SEO_SUPPORTED_SERVICES } from "@/lib/seoSupportedServices";
import { seoStartingRate } from "@/lib/seoDisplayPricing";
import { getCityProfile } from "@/lib/cityProfiles";
import { APPROVED_HOME_CARE_CITIES } from "@/lib/approvedHomeCareCities";
import { seoEligibilityManifest } from "@/lib/seoEligibilityManifest";
import { SITE_ORIGIN } from "@/lib/seoIndexability";
import { buildBreadcrumbList } from "@/lib/seoUtils";
import { homeCareFAQs, homeCareParent, servicePlanningFAQs } from "@/lib/homeCarePlanning";

export interface LocalHomeCareProps { city: string; service: string; slug: string; languageLabel?: string; languageCityPath?: string }

/** Only eligible standard-service paths reach this page through the shared route adapter. */
export default function StandardHomeCareLocalPage({ city, service, slug, languageLabel, languageCityPath }: LocalHomeCareProps) {
  const topic = SEO_SUPPORTED_SERVICES[service];
  if (!topic || topic.serviceId !== "standard") return null;
  const path = `/${slug}`;
  const entry = languageLabel
    ? seoEligibilityManifest.languageCarePages.find(p => p.path === path)
    : seoEligibilityManifest.localLandingPages.find(p => p.path === path);
  if (!entry) return null;
  const profile = getCityProfile(city);
  const cityPage = APPROVED_HOME_CARE_CITIES.find(c => c.key === entry.cityKey);
  const parent = homeCareParent(service);
  const canonical = `${SITE_ORIGIN}${path}`;
  const rate = seoStartingRate(service);
  const heading = `${languageLabel ? `${languageLabel}-Speaking ` : ""}${topic.label} in ${city}`;
  const title = `${heading} | PSW Direct`;
  const description = `${languageLabel ? `Request ${languageLabel}-speaking ` : "Request "}${topic.label.toLowerCase()} in ${city}: ${topic.tasks[0].toLowerCase()}. $${rate}/hour in 2-hour increments; address and caregiver acceptance confirmed.`;
  const related = seoEligibilityManifest.localLandingPages.filter(p => p.cityKey === entry.cityKey && p.path !== path && SEO_SUPPORTED_SERVICES[p.service]?.serviceId === "standard");
  const languageRelated = seoEligibilityManifest.languageCarePages.filter(p => p.cityKey === entry.cityKey && p.path !== path && (!languageLabel || p.languageLabel === languageLabel) && SEO_SUPPORTED_SERVICES[p.service]?.serviceId === "standard");
  const faqs = [...servicePlanningFAQs(service), ...(languageLabel ? [{ q: `Is a ${languageLabel} language match guaranteed?`, a: `No. Directory records list language preferences, not independently verified fluency or availability. Explain how your loved one communicates, and confirm a suitable ${languageLabel}-speaking caregiver accepting the requested tasks before relying on the visit.` }] : []), ...homeCareFAQs(city)];
  return <>
    <Helmet>
      <title>{title}</title><meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} /><meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} /><meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" /><meta name="twitter:title" content={title} /><meta name="twitter:description" content={description} />
      <script type="application/ld+json">{JSON.stringify(buildBreadcrumbList([{ name: "Home", url: SITE_ORIGIN }, { name: "Home care in Ontario", url: `${SITE_ORIGIN}/home-care-ontario` }, { name: heading, url: canonical }]))}</script>
    </Helmet>
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border"><div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3"><Link to="/"><img src={logo} alt="PSW Direct" className="h-10 w-auto" /></Link><SeoCallCta className="text-sm" /></div></header>
      <main>
        <section className="max-w-4xl mx-auto px-4 py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6"><Link to="/" className="hover:underline">Home</Link> / <Link to="/home-care-ontario" className="hover:underline">Home care in Ontario</Link> / {heading}</nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-5">{heading}</h1>
          <p className="text-lg text-muted-foreground mb-5">{topic.summary} Share the person's routine and the tasks needed so the caregiver's suitability can be considered for your request.</p>
          <p className="font-semibold mb-5">${rate}/hour, booked in 2-hour increments. Applicable taxes and your total are shown before you submit a booking.</p>
          <div className="flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/">Request home care</Link></Button><SeoCallCta /></div>
          <p className="text-sm text-muted-foreground mt-3">Customer support is available 24 hours a day, 7 days a week. This is support-contact availability, not continuous care.</p>
          <p className="text-sm text-muted-foreground mt-3">Coverage for your exact address, caregiver suitability and acceptance are confirmed during booking. Please wait for confirmation before relying on a visit.</p>
        </section>
        <section className="border-y border-border bg-muted/30 px-4 py-10"><div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Plan the tasks that matter</h2>
          <ul className="list-disc pl-5 space-y-3 text-muted-foreground">{topic.tasks.map(task => <li key={task}>{task}</li>)}</ul>
          <p className="text-muted-foreground mt-5">{topic.preparation}</p>
          <p className="text-muted-foreground mt-4">Put essential tasks first, explain what the person can do independently, and agree on a handover with the family. Arrange help for any time outside the accepted visit rather than assuming continuous coverage.</p>
        </div></section>
        {languageLabel && <section className="max-w-4xl mx-auto px-4 py-10"><h2 className="text-2xl font-semibold mb-4">Planning care in {languageLabel}</h2>
          <p className="text-muted-foreground mb-4">Share the words your loved one uses for comfort, consent or discomfort, their preferred pace, and familiar conversation topics. For personal care, explain how they want instructions given. For companionship, choose activities they enjoy rather than assuming shared interests.</p>
          <p className="text-muted-foreground mb-4">Nearby directory records include people who list {languageLabel}; this is not independent verification of fluency, specialist training or a promise of an available visit. Confirm the language preference and task suitability with the accepting caregiver.</p>
          {languageCityPath && seoEligibilityManifest.sitemapPaths.includes(languageCityPath) && <Link to={languageCityPath} className="text-primary hover:underline">{languageLabel}-speaking care directory near {city}</Link>}
        </section>}
        <section className="max-w-4xl mx-auto px-4 py-10"><h2 className="text-2xl font-semibold mb-4">Planning a home visit in {city}</h2>
          <p className="text-muted-foreground mb-4">{city}{profile.county && profile.county !== city && profile.county !== `City of ${city}` ? ` (${profile.county})` : ""} is the location for this planning page, not a promise that every address is served. Enter the exact care address, building access, parking and equipment needs so travel and suitability can be checked.</p>
          {profile.topics?.includes("rural") && <p className="text-muted-foreground mb-4">For rural addresses, explain directions and entry arrangements. A nearby directory record does not establish coverage at a home outside the centre of the community.</p>}
          {profile.topics?.includes("bilingual-care") && <p className="text-muted-foreground mb-4">State the person's language preference and communication needs when requesting care. A particular language match is not guaranteed.</p>}
          <h2 className="text-2xl font-semibold mt-8 mb-4">Request, review and wait for acceptance</h2>
          <ol className="list-decimal pl-5 space-y-3 text-muted-foreground"><li>Choose Home Care and the relevant tasks. Provide dates, hours in 2-hour increments, preferences and instructions.</li><li>Review the service, applicable taxes and total before submitting. Explain restrictions from the care team without asking a PSW to change clinical advice.</li><li>Confirm address coverage, suitability and caregiver acceptance before depending on replacement care. Agree who is reachable during the visit and who resumes care afterwards.</li></ol>
          <div className="flex flex-wrap gap-3 mt-6"><Button asChild><Link to="/">Request a home-care visit</Link></Button><SeoCallCta /></div>
          <p className="text-sm text-muted-foreground mt-3">Call customer support 24 hours a day, 7 days a week with request questions. Same-day, overnight and continuous visits are not guaranteed.</p>
        </section>
        <section className="max-w-4xl mx-auto px-4 pb-10"><h2 className="text-2xl font-semibold mb-4">Non-clinical support within the care plan</h2>
          <p className="text-muted-foreground mb-4">Regular home care, family respite, dementia-related daily routines and help after surgery describe everyday support, not specialist clinical treatment. PSWs do not provide nursing, wound care, medication management or rehabilitation. Medication reminders are prompts for medication the client takes themselves within the existing care plan.</p>
          <p className="text-muted-foreground mb-4">Share complex transfers, supervision concerns or changing needs so suitability can be assessed. No safety or recovery outcome is guaranteed. Doctor escort and hospital pickup are separate booking services, not included in the home-care price.</p>
          <Link to={parent.path} className="text-primary hover:underline">{parent.label}</Link>
          {cityPage && <p className="mt-3"><Link to={`/${cityPage.slug}`} className="text-primary hover:underline">Home care in {cityPage.name}: local family planning</Link></p>}
        </section>
        <HomeCarePlanningFAQs faqs={faqs} />
        <section className="border-t border-border px-4 py-10"><div className="max-w-4xl mx-auto">
          {related.length > 0 && <><h2 className="text-2xl font-semibold mb-4">Related home-care tasks in {city}</h2><ul className="grid sm:grid-cols-2 gap-3 text-primary mb-8">{related.map(p => <li key={p.path}><Link to={p.path} className="hover:underline">{p.label}</Link></li>)}</ul></>}
          {languageRelated.length > 0 && <><h2 className="text-2xl font-semibold mb-4">{languageLabel ? `${languageLabel} daily support` : "Language-specific daily support"} in {city}</h2><ul className="grid sm:grid-cols-2 gap-3 text-primary mb-8">{languageRelated.map(p => <li key={p.path}><Link to={p.path} className="hover:underline">{p.languageLabel} {p.label}</Link></li>)}</ul></>}
          <h2 className="text-xl font-semibold mb-4">Family planning guides</h2><ul className="space-y-3 text-primary"><li><Link to="/home-care-ontario" className="hover:underline">Ontario home care and service areas</Link></li><li><Link to="/guides/cost-of-home-care-ontario" className="hover:underline">Planning home-care costs</Link></li><li><Link to="/guides/how-to-hire-a-personal-support-worker" className="hover:underline">Choosing a personal support worker</Link></li></ul>
        </div></section>
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">PSW Direct · Ontario home care · <Link to="/" className="text-primary hover:underline">Book online</Link></footer>
    </div>
  </>;
}
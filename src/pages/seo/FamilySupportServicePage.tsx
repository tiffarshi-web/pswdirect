import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SeoCallCta from "@/components/seo/SeoCallCta";
import logo from "@/assets/logo.png";
import { SITE_ORIGIN } from "@/lib/seoIndexability";
import { APPROVED_HOME_CARE_CITIES } from "@/lib/approvedHomeCareCities";
import type { OntarioHubConfig } from "@/lib/serviceOntarioHubs";
import { ONTARIO_HUBS } from "@/lib/serviceOntarioHubs";
import { seoStartingRate } from "@/lib/seoDisplayPricing";
import { buildBreadcrumbList } from "@/lib/seoUtils";
import { homeCareFAQs } from "@/lib/homeCarePlanning";
import HomeCarePlanningFAQs from "@/components/seo/HomeCarePlanningFAQs";

/** Bounded non-clinical service hubs link to existing roster-backed home-care pages. */
export default function FamilySupportServicePage({ config }: { config: OntarioHubConfig }) {
  const canonical = `${SITE_ORIGIN}/${config.slug}`;
  const faqs = [...config.faqs, ...homeCareFAQs("Ontario")];
  const relatedHubs = ONTARIO_HUBS.filter(h => config.relatedHubs?.includes(h.slug));
  return <>
    <Helmet>
      <title>{config.title}</title><meta name="description" content={config.description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={config.title} /><meta property="og:description" content={config.description} />
      <meta property="og:url" content={canonical} /><meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" /><meta name="twitter:title" content={config.title} /><meta name="twitter:description" content={config.description} />
      <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: config.title, description: config.description, url: canonical })}</script>
      <script type="application/ld+json">{JSON.stringify(buildBreadcrumbList([{ name: "Home", url: SITE_ORIGIN }, { name: "Home care in Ontario", url: `${SITE_ORIGIN}/home-care-ontario` }, { name: config.serviceLabel, url: canonical }]))}</script>
    </Helmet>
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border"><div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3"><Link to="/"><img src={logo} alt="PSW Direct" className="h-10 w-auto" /></Link><SeoCallCta className="text-sm" /></div></header>
      <main>
        <section className="max-w-4xl mx-auto px-4 py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6"><Link to="/" className="hover:underline">Home</Link> / <Link to="/home-care-ontario" className="hover:underline">Home care in Ontario</Link> / {config.serviceLabel}</nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-5">{config.h1}</h1>
          <p className="text-lg text-muted-foreground mb-5">{config.intro}</p>
          <p className="font-semibold mb-5">${seoStartingRate("home-care")}/hour · Visits booked in 2-hour increments. Applicable taxes and your total are shown before you submit a booking.</p>
          <div className="flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/">Request home support</Link></Button><SeoCallCta /></div>
          <p className="text-sm text-muted-foreground mt-3">Customer support is available 24 hours a day, 7 days a week. This is contact availability, not round-the-clock care visits.</p>
          <p className="text-sm text-muted-foreground mt-3">Address coverage, caregiver suitability and acceptance are confirmed during booking. Same-day, overnight and continuous care are not guaranteed.</p>
        </section>
        <section className="border-y border-border bg-muted/30 px-4 py-10"><div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div><h2 className="text-2xl font-semibold mb-4">Who this support can help</h2><ul className="list-disc pl-5 space-y-3 text-muted-foreground">{config.whoItsFor.map(t => <li key={t}>{t}</li>)}</ul></div>
          <div><h2 className="text-2xl font-semibold mb-4">Tasks to discuss when booking</h2><ul className="list-disc pl-5 space-y-3 text-muted-foreground">{config.whatsIncluded.map(t => <li key={t}>{t}</li>)}</ul></div>
        </div></section>
        <section className="max-w-4xl mx-auto px-4 py-10"><h2 className="text-2xl font-semibold mb-5">Planning support with your family</h2><div className="space-y-4 text-muted-foreground">{config.overview.map(p => <p key={p}>{p}</p>)}</div></section>
        <section className="max-w-4xl mx-auto px-4 pb-10"><h2 className="text-2xl font-semibold mb-5">Non-clinical scope and care-team responsibilities</h2><div className="space-y-4 text-muted-foreground">{config.ontarioContext.map(p => <p key={p}>{p}</p>)}</div></section>
        <section className="border-y border-border bg-muted/30 px-4 py-10"><div className="max-w-4xl mx-auto"><h2 className="text-2xl font-semibold mb-6">How to request the right visit</h2><ol className="space-y-6">{config.process.map(p => <li key={p.title}><h3 className="text-lg font-semibold mb-2">{p.title}</h3><p className="text-muted-foreground">{p.body}</p></li>)}</ol><h2 className="text-2xl font-semibold mt-8 mb-4">Visit cost</h2>{config.pricing.map(p => <p key={p} className="text-muted-foreground">{p}</p>)}<div className="flex flex-wrap gap-3 mt-5"><Button asChild><Link to="/">Book home care</Link></Button><SeoCallCta /></div><p className="text-sm text-muted-foreground mt-3">Questions? Customer support is available 24 hours a day, 7 days a week. Care visits require booking confirmation.</p></div></section>
        <section className="max-w-4xl mx-auto px-4 pt-10"><h2 className="text-2xl font-semibold mb-4">Before the family handover</h2><p className="text-muted-foreground mb-4">Agree on priority tasks, consent and communication preferences, equipment and instructions from the care team. Identify a reachable family contact and who resumes care afterwards. If needs change or the person declines help, the caregiver should follow agreed contact instructions rather than force care or make clinical decisions.</p><p className="text-muted-foreground">Medication reminders are only prompts for medication the client takes themselves under the existing care plan. Confirm the caregiver can assist with the individual tasks before depending on the visit; arrange separate support outside the accepted hours.</p></section>
        <HomeCarePlanningFAQs faqs={faqs} />
        <section className="border-t border-border px-4 py-10"><div className="max-w-4xl mx-auto"><h2 className="text-2xl font-semibold mb-4">Local home-care planning</h2><p className="text-muted-foreground mb-5">These existing home-care pages offer local planning notes. The service guidance above applies to the daily tasks you request; address coverage and caregiver acceptance are confirmed during booking.</p><ul className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-3 text-primary">{APPROVED_HOME_CARE_CITIES.map(c => <li key={c.key}><Link to={`/${c.slug}`} className="hover:underline">Home care in {c.name}</Link></li>)}</ul></div></section>
        <section className="border-t border-border px-4 py-8"><div className="max-w-4xl mx-auto"><h2 className="text-xl font-semibold mb-4">More support and planning</h2><ul className="space-y-3 text-primary"><li><Link to="/home-care-ontario" className="hover:underline">Regular home care and daily support in Ontario</Link></li>{relatedHubs.map(h => <li key={h.slug}><Link to={`/${h.slug}`} className="hover:underline">{h.serviceLabel}</Link></li>)}<li><Link to="/guides/cost-of-home-care-ontario" className="hover:underline">Planning home-care costs</Link></li><li><Link to="/guides/how-to-hire-a-personal-support-worker" className="hover:underline">Choosing a personal support worker</Link></li></ul></div></section>
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">PSW Direct · Ontario home support · <Link to="/" className="text-primary hover:underline">Book online</Link></footer>
    </div>
  </>;
}
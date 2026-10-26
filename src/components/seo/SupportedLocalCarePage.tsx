import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SeoCallCta from "./SeoCallCta";
import logo from "@/assets/logo.png";
import { SEO_SUPPORTED_SERVICES } from "@/lib/seoSupportedServices";
import { seoStartingRate } from "@/lib/seoDisplayPricing";
import { getCityProfile } from "@/lib/cityProfiles";
import { getLocalHospitals } from "@/lib/localHospitalData";
import { seoEligibilityManifest } from "@/lib/seoEligibilityManifest";
import { SITE_ORIGIN } from "@/lib/seoIndexability";

export default function SupportedLocalCarePage({ city, service, slug }: { city: string; service: string; slug: string }) {
  const topic = SEO_SUPPORTED_SERVICES[service];
  if (!topic) return null;
  const profile = getCityProfile(city);
  const rate = seoStartingRate(service);
  const canonical = `${SITE_ORIGIN}/${slug}`;
  const title = `${topic.label} in ${city}, Ontario | PSW Direct`;
  const description = `${topic.label} in ${city}: ${topic.summary} From $${rate}/hour. Caregiver matching and timing are subject to availability.`;
  const cityKey = slug.slice(service.length + 1);
  const related = (seoEligibilityManifest.localLandingPages ?? []).filter(p => p.cityKey === cityKey && p.path !== `/${slug}`);
  const hospitals = service === "hospital-discharge" || service === "recovery-care" ? getLocalHospitals(city) : [];
  return <>
    <Helmet>
      <title>{title}</title><meta name="description" content={description} />
      <link rel="canonical" href={canonical} /><meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} /><meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
    </Helmet>
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border"><div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
        <Link to="/"><img src={logo} alt="PSW Direct" className="h-12 w-auto" /></Link><SeoCallCta />
      </div></header>
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        <nav className="text-sm text-muted-foreground"><Link to="/">Home</Link> / <Link to="/cities">Ontario communities</Link> / {city}</nav>
        <section><h1 className="text-3xl md:text-4xl font-bold mb-5">{topic.label} in {city}</h1>
          <p className="text-lg text-muted-foreground mb-5">{topic.summary}</p>
          <p className="font-semibold mb-5">From ${rate}/hour · Applicable taxes are shown when booking.</p>
          <div className="flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/">Request care</Link></Button><SeoCallCta /></div>
        </section>
        <section><h2 className="text-2xl font-semibold mb-4">Planning a visit in {city}</h2>
          <p className="text-muted-foreground mb-4">{city}{profile.county ? ` is part of ${profile.county}` : " is an Ontario community"}. Share the exact address, building access, parking instructions and care needs when requesting a visit. Travel and caregiver suitability are assessed for your specific request, not guaranteed for every address in the area.</p>
          <p className="text-muted-foreground">{topic.preparation}</p>
        </section>
        <section><h2 className="text-2xl font-semibold mb-4">What to request</h2><ul className="list-disc pl-5 space-y-3 text-muted-foreground">{topic.tasks.map(task => <li key={task}>{task}</li>)}</ul></section>
        {hospitals.length > 0 && <section><h2 className="text-2xl font-semibold mb-4">Hospital information near {city}</h2>
          <ul className="list-disc pl-5 text-muted-foreground">{hospitals.map(h => <li key={h.name}>{h.name}{h.proximity ? ` (${h.proximity} ${city})` : ""}</li>)}</ul>
          <p className="text-sm text-muted-foreground mt-3">For planning only. PSW Direct is independent and is not affiliated with these hospitals.</p></section>}
        <section><h2 className="text-2xl font-semibold mb-4">Availability and confirmation</h2>
          <p className="text-muted-foreground">A nearby directory listing is not a promise of an available shift. Tell us your preferred date, hours and language needs. Care depends on a suitable caregiver accepting the request; do not rely on same-day, overnight or continuous coverage before it is confirmed.</p>
        </section>
        {related.length > 0 && <section><h2 className="text-2xl font-semibold mb-4">Other care in {city}</h2><ul className="grid sm:grid-cols-2 gap-3">{related.map(p => <li key={p.path}><Link to={p.path} className="text-primary hover:underline">{p.label}</Link></li>)}</ul></section>}
      </main>
      <footer className="border-t border-border px-4 py-8 text-center"><Link to="/cities" className="text-primary hover:underline">Browse supported Ontario care pages</Link></footer>
    </div>
  </>;
}
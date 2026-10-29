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

export default function SupportedLocalCarePage({ city, service, slug, languageLabel, languageCityPath }: { city: string; service: string; slug: string; languageLabel?: string; languageCityPath?: string }) {
  const topic = SEO_SUPPORTED_SERVICES[service];
  if (!topic) return null;
  const profile = getCityProfile(city);
  const rate = seoStartingRate(service);
  const canonical = `${SITE_ORIGIN}/${slug}`;
  const familySupport = ["post-surgery-care", "recovery-care", "memory-care"].includes(service);
  const supportHub = service === "memory-care" ? "/dementia-care-ontario" : "/post-surgery-care-ontario";
  const heading = `${languageLabel ? `${languageLabel}-Speaking ` : ""}${topic.label} in ${city}`;
  const title = `${heading}, Ontario | PSW Direct`;
  const description = familySupport
    ? `Non-clinical ${service === "memory-care" ? "daily memory-related support" : "daily support during recovery"} in ${city}. $40/hour in 2-hour increments; address coverage and caregiver acceptance confirmed in booking.`
    : `${topic.label} in ${city}: ${topic.summary} From $${rate}/hour. Caregiver matching and timing are subject to availability.`;
  const cityKey = seoEligibilityManifest.languageCarePages?.find(p => p.path === `/${slug}`)?.cityKey ?? slug.slice(service.length + 1);
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
        <section><h1 className="text-3xl md:text-4xl font-bold mb-5">{heading}</h1>
          <p className="text-lg text-muted-foreground mb-5">{topic.summary}</p>
          <p className="font-semibold mb-5">{familySupport ? `$${rate}/hour, booked in 2-hour increments. Applicable taxes and your total are shown before you submit a booking.` : `From $${rate}/hour · Applicable taxes are shown when booking.`}</p>
          <div className="flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/">Request care</Link></Button><SeoCallCta /></div>
          {familySupport && <><p className="text-sm text-muted-foreground mt-3">Customer support is available 24 hours a day, 7 days a week, not guaranteed round-the-clock care.</p><p className="text-sm text-muted-foreground mt-3">Address coverage and caregiver acceptance are confirmed during booking.</p></>}
        </section>
        {languageLabel && languageCityPath && <section><h2 className="text-2xl font-semibold mb-4">Planning care in {languageLabel}</h2>
          <p className="text-muted-foreground mb-4">Nearby directory records include caregivers who list {languageLabel}. Discuss the person's preferred words, communication needs and routine when requesting care. A listed language is not independent verification of fluency or a promise of specialist experience.</p>
          <p className="text-muted-foreground mb-4">For personal care, explain how the person expresses consent and discomfort. For companionship, share familiar conversation topics and activities. Language matching and the requested tasks must be confirmed with a suitable caregiver.</p>
          <Link to={languageCityPath} className="text-primary hover:underline">Browse {languageLabel}-speaking caregiver listings near {city}</Link></section>}
        <section><h2 className="text-2xl font-semibold mb-4">Planning a visit in {city}</h2>
          <p className="text-muted-foreground mb-4">{city}{profile.county ? ` is part of ${profile.county}` : " is an Ontario community"}. Share the exact address, building access, parking instructions and care needs when requesting a visit. Travel and caregiver suitability are assessed for your specific request, not guaranteed for every address in the area.</p>
          <p className="text-muted-foreground">{topic.preparation}</p>
        </section>
        <section><h2 className="text-2xl font-semibold mb-4">What to request</h2><ul className="list-disc pl-5 space-y-3 text-muted-foreground">{topic.tasks.map(task => <li key={task}>{task}</li>)}</ul></section>
        {familySupport && <section><h2 className="text-2xl font-semibold mb-4">Plan daily support, not clinical treatment</h2>
          <p className="text-muted-foreground mb-4">Choose Home Care and the relevant personal-care, meal, companionship or respite tasks. Explain the person's restrictions, preferences and handover needs. Confirm who will help between visits and wait for caregiver acceptance before relying on replacement support.</p>
          <p className="text-muted-foreground mb-4">{service === "memory-care" ? "Respectful daily routines do not imply dementia-specialist training, clinical supervision, guaranteed safety or 24-hour dementia coverage. Suitability must be considered for the individual person's needs." : "Help at home after surgery does not include nursing, wound care, medication management or rehabilitation, and does not guarantee recovery. Clinical decisions remain with the regulated care team. Hospital pickup is a separate service."}</p>
          <Link to={supportHub} className="text-primary hover:underline">{service === "memory-care" ? "Dementia-related home support: routines, scope and family respite guidance" : "Post-surgical home support: discharge preparation and non-clinical scope"}</Link>
          <p className="mt-3"><Link to={`/home-care-${cityKey}`} className="text-primary hover:underline">Home-care planning in {city}</Link></p>
        </section>}
        {hospitals.length > 0 && <section><h2 className="text-2xl font-semibold mb-4">Hospital information near {city}</h2>
          <ul className="list-disc pl-5 text-muted-foreground">{hospitals.map(h => <li key={h.name}>{h.name}{h.proximity ? ` (${h.proximity} ${city})` : ""}</li>)}</ul>
          <p className="text-sm text-muted-foreground mt-3">For planning only. PSW Direct is independent and is not affiliated with these hospitals.</p></section>}
        <section><h2 className="text-2xl font-semibold mb-4">Availability and confirmation</h2>
          <p className="text-muted-foreground">A nearby directory listing is not a promise of an available shift. Tell us your preferred date, hours and language needs. Care depends on a suitable caregiver accepting the request; do not rely on same-day, overnight or continuous coverage before it is confirmed.</p>
        </section>
        {related.length > 0 && <section><h2 className="text-2xl font-semibold mb-4">Other care in {city}</h2><ul className="grid sm:grid-cols-2 gap-3">{related.map(p => <li key={p.path}><Link to={p.path} className="text-primary hover:underline">{p.label}</Link></li>)}</ul></section>}
        {(seoEligibilityManifest.languageCarePages ?? []).some(p => p.cityKey === cityKey && p.path !== `/${slug}`) && <section><h2 className="text-2xl font-semibold mb-4">Language-specific care in {city}</h2><ul className="grid sm:grid-cols-2 gap-3">{(seoEligibilityManifest.languageCarePages ?? []).filter(p => p.cityKey === cityKey && p.path !== `/${slug}`).map(p => <li key={p.path}><Link to={p.path} className="text-primary hover:underline">{p.languageLabel} {p.label}</Link></li>)}</ul></section>}
      </main>
      <footer className="border-t border-border px-4 py-8 text-center"><Link to="/cities" className="text-primary hover:underline">Browse supported Ontario care pages</Link></footer>
    </div>
  </>;
}
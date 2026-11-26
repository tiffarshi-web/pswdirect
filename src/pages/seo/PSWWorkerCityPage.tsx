import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { PublicPswCardGrid } from "@/components/seo/PublicPswCityCards";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, CheckCircle, ArrowRight, Heart, Shield, Clock, Users } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, generatePrivacySlug, generatePSWAltText } from "@/lib/seoUtils";
import { getNearbyPSWsByCity, type NearbyPSW } from "@/lib/nearbyPSWs";
import { buildFAQSchema } from "@/lib/seoShared";
import { getNearbyCities, cityToSlug } from "@/lib/seoCityData";
import SEOInternalLinks from "@/components/seo/SEOInternalLinks";
import CityInternalLinks from "@/components/seo/CityInternalLinks";
import TrustSignals from "@/components/seo/TrustSignals";
import ServingYourArea from "@/components/seo/ServingYourArea";
import InlineLinkParagraph from "@/components/seo/InlineLinkParagraph";
import SEOFreshnessSignal from "@/components/seo/SEOFreshnessSignal";

interface Props {
  city: string;
  slug: string;
}

/** Deterministic hash for content rotation */
const cityHash = (city: string): number => {
  let h = 0;
  for (let i = 0; i < city.length; i++) h = ((h << 5) - h + city.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const pick = <T,>(arr: T[], city: string, offset = 0): T =>
  arr[(cityHash(city) + offset) % arr.length];

const intros = [
  (c: string) => `Request a personal support worker for a home in ${c} through PSW Direct. Visits cover non-clinical help with personal care, mobility, meals, reminders and companionship, at $40/hour in two-hour increments.`,
  (c: string) => `Planning help for a parent or partner in ${c}? Describe the daily tasks, the exact address and preferred times; a suitable personal support worker must accept the request before the visit is confirmed.`,
  (c: string) => `PSW Direct lets families in ${c} request a personal support worker by the visit, without a long-term contract. Address coverage, timing and caregiver suitability are confirmed during booking.`,
  (c: string) => `Looking for a personal support worker in ${c}? Share the care routine, home access details and any written instructions from the care team so the request can be matched with an accepting caregiver.`,
];

const whyChooseItems = [
  { icon: Shield, title: "Screened before approval", desc: "Caregivers complete a police check and credential review before they are approved on the platform." },
  { icon: Clock, title: "Request-based scheduling", desc: "Choose a preferred date and time; the visit is confirmed only when a caregiver accepts." },
  { icon: Heart, title: "Non-clinical daily support", desc: "Help with hygiene, dressing, meals, mobility and companionship, following the person's routine." },
  { icon: Users, title: "No long-term contract", desc: "Book visits in two-hour increments. Customer support is available 24 hours a day, 7 days a week." },
];

const PSWWorkerCityPage = ({ city, slug }: Props) => {
  const [psws, setPsws] = useState<NearbyPSW[]>([]);
  const [loading, setLoading] = useState(true);

  const citySlug = cityToSlug(city);
  const title = `Personal Support Worker in ${city} | Hire a PSW | PSW Direct`;
  const description = `Hire a qualified personal support worker in ${city}, Ontario. Non-clinical in-home support at $40/hour in two-hour increments; address coverage and caregiver acceptance are confirmed in booking.`;
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const nearbyCities = getNearbyCities(city);
  const intro = pick(intros, city)(city);

  useEffect(() => {
    getNearbyPSWsByCity(city, 50).then((r) => { setPsws(r); setLoading(false); });
  }, [city]);

  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", url: SITE_URL },
    { name: "PSW Directory", url: `${SITE_URL}/psw-directory` },
    { name: `PSW in ${city}`, url: canonicalUrl },
  ]);

  const faqs = [
    { q: `How do I find a personal support worker in ${city}?`, a: `Request care online with your preferred time — no referral needed. Coverage, timing and a suitable caregiver are confirmed only after a caregiver accepts.` },
    { q: `How much does a PSW cost in ${city}?`, a: `Visits are $40/hour, booked in two-hour increments. Applicable taxes and your total are shown before you submit a booking.` },
    { q: `What services do PSWs provide in ${city}?`, a: `Personal support workers in ${city} can help with bathing, dressing, mobility, meal preparation, reminders for medication the client takes themselves, companionship and light housekeeping. Nursing and clinical treatment are not included.` },
    { q: `Are PSWs in ${city} background-checked?`, a: `PSW Direct requires a police check and credential review before a caregiver is approved. Ask about the accepting caregiver's experience with your specific tasks when booking.` },
  ];

  // Related city pages for internal linking
  const relatedPages = [
    { label: `Home Care in ${city}`, path: `/home-care-${citySlug}` },
    { label: `Personal care assistance in ${city}`, path: `/personal-care-assistance-${citySlug}` },
    { label: `Companion care in ${city}`, path: `/companion-care-${citySlug}` },
    { label: "Dementia-related daily support in Ontario", path: "/dementia-care-ontario" },
    { label: `PSW Jobs in ${city}`, path: `/psw-jobs-${citySlug}` },
  ];

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:type" content="website" />
        <meta name="geo.region" content="CA-ON" />
        <meta name="geo.placename" content={city} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbs)}</script>
        <script type="application/ld+json">{JSON.stringify(buildFAQSchema(faqs.map(f => ({ question: f.q, answer: f.a }))))}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="PSW Direct" className="h-8 w-auto" loading="lazy" />
            </Link>
            <Link to="/client-login">
              <Button size="sm">Book a PSW</Button>
            </Link>
          </div>
        </header>
        <Breadcrumbs city={city} service={{ name: "Home care", href: `/home-care-${cityToSlug(city)}` }} />

        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Personal Support Worker in {city}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">{intro}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/client-login">
                <Button size="lg" className="gap-2"><Phone className="w-4 h-4" /> Request a PSW</Button>
              </Link>
              <Link to={`/home-care-${citySlug}`}>
                <Button size="lg" variant="outline" className="gap-2"><MapPin className="w-4 h-4" /> Home care in {city}</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Why Choose */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-foreground mb-10">Why Choose PSW Direct in {city}?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {whyChooseItems.map((item, i) => (
                <div key={i} className="flex gap-4 p-5 bg-card rounded-xl border border-border">
                  <item.icon className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-foreground mb-8">PSW Services Available in {city}</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {["Personal Care & Hygiene", "Mobility & Transfer Assistance", "Meal Preparation", "Medication Reminders", "Companionship Visits", "Light Housekeeping", "Overnight Supervision", "Post-Surgery Recovery", "Dementia & Alzheimer's Care", "Respite Care for Families", "Doctor & Hospital Escort", "24-Hour Live-In Care"].map((s) => (
                <div key={s} className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Available PSWs */}
        {!loading && psws.length > 0 && (
          <section className="py-16 px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-center text-foreground mb-8">
                Personal Support Workers Near {city}
              </h2>
              <PublicPswCardGrid psws={psws} city={city} max={6} />
              <div className="text-center mt-6">
                <Link to="/psw-directory"><Button variant="outline" className="gap-2">View All PSWs <ArrowRight className="w-4 h-4" /></Button></Link>
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-foreground mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="bg-card border border-border rounded-lg p-4 group">
                  <summary className="font-medium text-foreground cursor-pointer">{faq.q}</summary>
                  <p className="text-sm text-muted-foreground mt-2">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Related Pages in Same City */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">More Care Options in {city}</h2>
            <div className="flex flex-wrap gap-3">
              {relatedPages.map((rp) => (
                <Link key={rp.path} to={rp.path} className="text-sm text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-full">{rp.label}</Link>
              ))}
            </div>
          </div>
        </section>

        {/* Nearby Cities */}
        {nearbyCities.length > 0 && (
          <section className="py-12 px-4 bg-muted/30">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-foreground mb-4">PSWs in Nearby Cities</h2>
              <div className="flex flex-wrap gap-3">
                {nearbyCities.map((nc) => {
                  const ncSlug = nc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                  return (
                    <Link key={nc} to={`/personal-support-worker-${ncSlug}`} className="text-sm bg-card border border-border px-3 py-1.5 rounded-full hover:border-primary transition-colors">{nc}</Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <ServingYourArea city={city} />
        <InlineLinkParagraph city={city} service="PSW" />
        <TrustSignals city={city} service="PSW" />
        <CityInternalLinks city={city} />
        <SEOInternalLinks />
        <SEOFreshnessSignal location={city} />

        {/* Footer */}
        <footer className="bg-card border-t border-border py-8 px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PSW Direct — Personal Support Workers in {city}, Ontario</p>
        </footer>
      </div>
    </>
  );
};

export default PSWWorkerCityPage;

import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Phone, MapPin, Clock, Heart, Shield, Users, Moon, Building2,
  CheckCircle2, Stethoscope, ChefHat, Pill, Move, ArrowRight,
  Star, Zap,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, generatePrivacySlug, generatePSWAltText } from "@/lib/seoUtils";
import { getNearbyPSWsByCity, type NearbyPSW } from "@/lib/nearbyPSWs";
import { buildFAQSchema } from "@/lib/seoShared";
import { getNearbyCities, cityToSlug } from "@/lib/seoCityData";
import PrivateHomeCareSection from "@/components/seo/PrivateHomeCareSection";
import SEOInternalLinks from "@/components/seo/SEOInternalLinks";
import CityInternalLinks from "@/components/seo/CityInternalLinks";
import TrustSignals from "@/components/seo/TrustSignals";
import ServingYourArea from "@/components/seo/ServingYourArea";
import SEOFreshnessSignal from "@/components/seo/SEOFreshnessSignal";

const SLUG = "home-care-toronto";
const CITY = "Toronto";
const CANONICAL = `${SITE_URL}/${SLUG}`;

const TITLE = "Private Home Care Services in Toronto | PSW Direct";
const META_DESC =
  "Book private home care in Toronto with no contracts. Verified PSWs for senior care, companionship, post-surgery recovery & more — starting at $35/hr.";

const faqs = [
  { question: "How much does home care cost in Toronto?", answer: "Home care through PSW Direct in Toronto starts at $35/hr — about half the cost of traditional agencies ($55+). No contracts, no hidden fees." },
  { question: "What home care services are available in Toronto?", answer: "PSW Direct offers personal care, companionship, mobility support, meal preparation, medication reminders, post-hospital care, overnight care, and 24-hour home care across Toronto, North York, Scarborough, and Etobicoke." },
  { question: "Can I book same-day home care in Toronto?", answer: "Yes. PSW Direct supports ASAP bookings so you can get matched with a caregiver in Toronto within minutes." },
  { question: "How do I book home care in Toronto?", answer: "Visit pswdirect.ca, select your service, choose a time, and get matched instantly with a vetted PSW in Toronto. The entire process takes under 2 minutes." },
  { question: "Is home care in Toronto covered by insurance?", answer: "Some extended health plans cover PSW services. Check with your insurance provider. PSW Direct provides receipts for all bookings that can be submitted for reimbursement." },
  { question: "Do your Toronto caregivers speak other languages?", answer: "Yes — PSW Direct caregivers in Toronto speak 35+ languages including Mandarin, Cantonese, Tamil, Hindi, Urdu, Tagalog, Italian, Portuguese, Korean, and more." },
];

const services = [
  { icon: Heart, title: "Personal Care", desc: "Bathing, grooming, dressing, and hygiene assistance from trained caregivers in Toronto." },
  { icon: Users, title: "Companionship", desc: "Social interaction, conversation, outings, and emotional support for seniors living alone in Toronto." },
  { icon: ChefHat, title: "Meal Preparation", desc: "Nutritious meal planning and cooking tailored to dietary needs and cultural preferences." },
  { icon: Pill, title: "Medication Reminders", desc: "Timely medication prompts to keep health routines on track — with documentation for family peace of mind." },
  { icon: Move, title: "Mobility Assistance", desc: "Safe transfers, walking support, fall prevention, and wheelchair assistance throughout the home." },
  { icon: Stethoscope, title: "Post-Surgery Care", desc: "Recovery support after surgery including wound monitoring, medication management, and gradual mobility rebuilding." },
  { icon: Building2, title: "Hospital Discharge Support", desc: "Seamless transition from hospital to home with a PSW ready at discharge to help settle in safely." },
];

const whyReasons = [
  { icon: Zap, text: "Book in under 2 minutes" },
  { icon: Clock, text: "No long-term contracts" },
  { icon: Star, text: "Flexible hourly care" },
  { icon: Shield, text: "Verified & police-checked caregivers" },
  { icon: CheckCircle2, text: "Fast matching — often same-day" },
];

const audiences = [
  { title: "Seniors Living at Home", desc: "Maintain independence with reliable daily support from a trusted caregiver in Toronto." },
  { title: "Families Needing Temporary Care", desc: "Short-term or respite care so family caregivers can take a break without worry." },
  { title: "Post-Hospital Recovery Patients", desc: "Professional in-home recovery support after surgery, illness, or hospital discharge." },
  { title: "Busy Professionals Caring for Parents", desc: "Coordinate quality elder care in Toronto while managing your own work and life." },
];

const HomeCareTorontoPage = () => {
  const [psws, setPsws] = useState<NearbyPSW[]>([]);
  const [loading, setLoading] = useState(true);
  const nearbyCities = getNearbyCities(CITY);

  useEffect(() => {
    getNearbyPSWsByCity(CITY, 50).then((r) => { setPsws(r); setLoading(false); });
  }, []);

  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={META_DESC} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={META_DESC} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={META_DESC} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify(buildBreadcrumbList([
            { name: "Home", url: SITE_URL },
            { name: "Home Care Ontario", url: `${SITE_URL}/home-care-ontario` },
            { name: "Home Care in Toronto", url: CANONICAL },
          ]))}
        </script>
        <script type="application/ld+json">{JSON.stringify(buildFAQSchema(faqs))}</script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HomeHealthService",
            name: "PSW Direct — Private Home Care in Toronto",
            description: META_DESC,
            url: CANONICAL,
            telephone: "+1-249-288-4787",
            priceRange: "$35-$45",
            serviceType: ["Home Care", "Private Home Care", "Personal Support Worker", "Senior Care", "Elderly Care"],
            areaServed: [
              { "@type": "City", name: "Toronto" },
              { "@type": "City", name: "North York" },
              { "@type": "City", name: "Scarborough" },
              { "@type": "City", name: "Etobicoke" },
            ],
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "PSW Direct",
            description: "Private home care and personal support worker services in Toronto, Ontario.",
            url: SITE_URL,
            telephone: "+1-249-288-4787",
            priceRange: "$35-$45",
            address: { "@type": "PostalAddress", addressLocality: "Toronto", addressRegion: "Ontario", addressCountry: "CA" },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link to="/" className="flex items-center gap-3">
                <img src={logo} alt="PSW Direct Logo" className="h-12 w-auto" />
                <span className="text-sm font-semibold text-foreground tracking-wide">PSW Direct</span>
              </Link>
              <a href="tel:2492884787" className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">(249) 288-4787</span>
              </a>
            </div>
          </div>
        </header>
        <Breadcrumbs city={CITY} service={{ name: "Home Care", href: "/home-care-toronto" }} />

        {/* ── HERO ── */}
        <section className="px-4 py-14 md:py-20 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            Toronto, Ontario
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Private Home Care Services in Toronto
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-10">
            PSW Direct provides on-demand home care services in Toronto — including
            North York, Scarborough, and Etobicoke. Book a verified personal support
            worker by the hour with no contracts, no agency markup, and no hidden fees.
            Quality senior care and elderly care starts at just $35/hr.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/">
              <Button size="lg" className="text-lg px-8 py-6 gap-2">
                Book Care in Toronto <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Get Instant Price Estimate
              </Button>
            </Link>
          </div>
        </section>

        {/* ── SECTION 1: Services Offered ── */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
              Home Care Services Offered in Toronto
            </h2>
            <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
              From daily personal care to post-hospital recovery, our Toronto PSWs
              are trained and ready to help.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((svc, i) => (
                <div key={i} className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <svc.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">{svc.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{svc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Why Choose PSW Direct ── */}
        <section className="px-4 py-14">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
              Why Choose PSW Direct for Home Care in Toronto
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {whyReasons.map((r, i) => (
                <div key={i} className="flex items-start gap-4 bg-card rounded-xl p-5 border border-border">
                  <r.icon className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 3: Who This Is For ── */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
              Who Is Private Home Care in Toronto For?
            </h2>

            <div className="grid sm:grid-cols-2 gap-6">
              {audiences.map((a, i) => (
                <div key={i} className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{a.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: How It Works ── */}
        <section className="px-4 py-14">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10">
              How to Book Home Care in Toronto
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Select Your Service", desc: "Choose from personal care, companionship, post-surgery support, or other home care services." },
                { step: "2", title: "Choose Your Time", desc: "Pick a date and time that works — same-day, next-day, or scheduled in advance." },
                { step: "3", title: "Get Matched Instantly", desc: "We connect you with a verified PSW in Toronto. Care begins at your scheduled time." },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                    {s.step}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Available PSWs ── */}
        {!loading && psws.length > 0 && (
          <section className="bg-muted/50 px-4 py-12 border-y border-border">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Personal Support Workers Available in Toronto
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {psws.slice(0, 8).map((p, idx) => {
                  const profileSlug = generatePrivacySlug(p.first_name, p.last_name, p.home_city);
                  return (
                    <Link key={idx} to={`/psw/profile/${profileSlug}`} className="bg-card rounded-xl p-4 border border-border hover:border-primary hover:shadow-md transition-all text-center">
                      {p.profile_photo_url && (
                        <img src={p.profile_photo_url} alt={generatePSWAltText(p.first_name, p.last_name.charAt(0), p.home_city)} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" loading="lazy" />
                      )}
                      <p className="font-semibold text-foreground text-sm">{p.first_name} {p.last_name.charAt(0)}.</p>
                      <p className="text-xs text-muted-foreground">{p.home_city}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── SECTION 5: Final CTA ── */}
        <section className="px-4 py-16">
          <div className="max-w-3xl mx-auto text-center bg-primary/5 rounded-2xl p-10 border border-primary/20">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Book Home Care in Toronto?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Get matched with a vetted personal support worker in Toronto today.
              No contracts, no agency fees — just quality private home care starting at $35/hr.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/">
                <Button size="lg" className="text-lg px-8 py-6 gap-2">
                  Book Care in Toronto <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Get Instant Price Estimate
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Frequently Asked Questions About Home Care in Toronto
            </h2>
            <div className="space-y-5">
              {faqs.map((f, i) => (
                <div key={i} className="bg-card rounded-xl p-5 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{f.question}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Shared Private Home Care SEO block */}
        <PrivateHomeCareSection city={CITY} />

        {/* Nearby Cities */}
        {nearbyCities.length > 0 && (
          <section className="px-4 py-10 border-t border-border">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-xl font-bold text-foreground mb-6">Home Care in Nearby Cities</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {nearbyCities.map((nc) => (
                  <Link key={nc} to={`/home-care-${cityToSlug(nc)}`} className="text-primary hover:underline text-sm font-medium">
                    Home Care in {nc}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-4 py-6 max-w-4xl mx-auto">
          <SEOFreshnessSignal location={CITY} />
        </section>

        <ServingYourArea city={CITY} />
        <TrustSignals city={CITY} service="Home Care" />
        <CityInternalLinks city={CITY} />
        <SEOInternalLinks excludeCity={CITY} compact />

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">Serving all of Ontario including Toronto, Barrie, Oshawa, Mississauga, Hamilton, Brampton &amp; 80+ communities.</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomeCareTorontoPage;

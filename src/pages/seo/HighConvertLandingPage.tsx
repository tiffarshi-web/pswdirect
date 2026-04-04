import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, CheckCircle, Clock, Shield, Users, Heart, Stethoscope, ArrowRight, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { buildFAQSchema } from "@/lib/seoShared";
import { BUSINESS_CONTACT } from "@/lib/contactConfig";
import SEOInternalLinks from "@/components/seo/SEOInternalLinks";

export interface HighConvertPageConfig {
  /** e.g. "Toronto" or "Ontario" or null for generic */
  city?: string;
  /** URL slug without leading slash */
  slug: string;
  /** Full <title> tag */
  title: string;
  /** Meta description */
  description: string;
  /** H1 headline */
  headline: string;
  /** Sub-headline below H1 */
  subheadline: string;
  /** robots directive — omit for default index */
  robots?: string;
  /** Extra breadcrumb items after Home */
  breadcrumbTrail: { name: string; url: string }[];
  /** Override FAQs */
  faqs?: { question: string; answer: string }[];
  /** Show city-specific content variations */
  cityVariant?: boolean;
}

const defaultFaqs = (city?: string): { question: string; answer: string }[] => {
  const loc = city || "Ontario";
  return [
    {
      question: `How fast can I get home care in ${loc}?`,
      answer: `PSW Direct offers same-day and next-day home care across ${loc}. Many requests are filled within hours. Book online and a vetted PSW can begin care the same day.`,
    },
    {
      question: "Do I need a contract?",
      answer: "No. PSW Direct is completely contract-free. Pay by the hour, book when you need care, and cancel anytime with no penalties.",
    },
    {
      question: "Can I book home care for a family member?",
      answer: "Yes. You can book care for a parent, spouse, or any loved one. Simply select \"Someone Else\" during booking and provide their details.",
    },
    {
      question: "Do you accept insurance or veterans benefits?",
      answer: "Yes. PSW Direct supports Veterans Affairs Canada (VAC) claims, private insurance, and third-party payers. Upload your details during booking.",
    },
    {
      question: `How much does home care cost in ${loc}?`,
      answer: `Home care through PSW Direct starts at $30/hr for personal care and companionship. Doctor escort starts at $35/hr. No agency fees, no hidden charges.`,
    },
    {
      question: "Are your PSWs vetted?",
      answer: "Every PSW on our platform is credential-verified, police-checked, and reviewed before activation. We maintain Ontario's highest vetting standards.",
    },
  ];
};

const services = [
  {
    icon: Heart,
    title: "Home Care",
    desc: "Personal care, companionship, mobility support, bathing assistance, meal preparation, and medication reminders — all in the comfort of home.",
  },
  {
    icon: Stethoscope,
    title: "Doctor Escort",
    desc: "A PSW accompanies your loved one to medical appointments, provides transport, waits during the visit, and ensures safe return home.",
  },
  {
    icon: Users,
    title: "Hospital Discharge",
    desc: "Professional support for hospital-to-home transitions. Your PSW helps with discharge paperwork, transport, home setup, and immediate post-discharge care.",
  },
];

const trustBullets = [
  "Fully vetted & police-checked PSWs",
  "Book online in under 2 minutes",
  "Available same-day across Ontario",
  "Pay hourly — no contracts ever",
];

const howItWorks = [
  { step: "1", title: "Book Online", desc: "Tell us what care you need, when, and where. It takes under 2 minutes." },
  { step: "2", title: "PSW Accepts", desc: "A vetted PSW near you accepts the job and prepares to arrive." },
  { step: "3", title: "Care Begins", desc: "Your PSW arrives on time. Track their arrival and manage care from your phone." },
];

const HighConvertLandingPage = ({ config }: { config: HighConvertPageConfig }) => {
  const { city, slug, title, description, headline, subheadline, robots, breadcrumbTrail, faqs: customFaqs } = config;
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const faqs = customFaqs || defaultFaqs(city);
  const loc = city || "Ontario";

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        {robots && <meta name="robots" content={robots} />}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify(buildBreadcrumbList([
            { name: "Home", url: SITE_URL },
            ...breadcrumbTrail.map((b) => ({ name: b.name, url: b.url.startsWith("http") ? b.url : `${SITE_URL}${b.url}` })),
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildFAQSchema(faqs))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HomeHealthService",
            name: `PSW Direct — Home Care${city ? ` in ${city}` : ""}`,
            description,
            url: canonicalUrl,
            telephone: BUSINESS_CONTACT.phoneInternational,
            priceRange: "$30-$35",
            serviceType: ["Home Care", "Personal Support Worker", "Senior Care", "Doctor Escort", "Hospital Discharge"],
            areaServed: city
              ? { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } }
              : { "@type": "AdministrativeArea", name: "Ontario, Canada" },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <Link to="/" className="flex items-center gap-2 sm:gap-3">
                <img src={logo} alt="PSW Direct Logo" className="h-10 sm:h-12 w-auto" />
                <span className="text-sm font-semibold text-foreground tracking-wide hidden sm:inline">PSW Direct</span>
              </Link>
              <a href={BUSINESS_CONTACT.phoneTel} className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">{BUSINESS_CONTACT.phone}</span>
              </a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="px-4 py-12 md:py-20 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">{headline}</h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">{subheadline}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link to="/">
              <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto">
                Request Immediate Care
              </Button>
            </Link>
            <Link to="/psw-cost">
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto">
                Get Instant Price Estimate
              </Button>
            </Link>
          </div>

          {/* Trust bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            {trustBullets.map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className="bg-muted/50 px-4 py-12 md:py-16 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
              Home Care Services{city ? ` in ${city}` : " Across Ontario"}
            </h2>
            <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
              Professional, on-demand care tailored to your needs — from daily personal support to specialized medical accompaniment.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {services.map(({ icon: Icon, title: t, desc }) => (
                <div key={t} className="bg-card rounded-xl p-6 border border-border hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {howItWorks.map(({ step, title: t, desc }) => (
                <div key={step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                    {step}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{t}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why PSW Direct */}
        <section className="bg-muted/50 px-4 py-12 md:py-16 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Why Families Choose PSW Direct{city ? ` in ${city}` : ""}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Shield, text: `Every PSW serving ${loc} is credential-verified and police-checked` },
                { icon: Clock, text: "Same-day availability — care when you need it most" },
                { icon: MapPin, text: `On-demand coverage across ${loc} and surrounding areas` },
                { icon: ArrowRight, text: "No contracts, no agency fees — just quality care by the hour" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border">
                  <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <details key={i} className="bg-card rounded-xl border border-border group">
                  <summary className="cursor-pointer p-5 font-semibold text-foreground list-none flex items-center justify-between">
                    {f.question}
                    <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0 ml-2" />
                  </summary>
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-4 py-12 md:py-16 bg-secondary text-secondary-foreground">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Book Home Care{city ? ` in ${city}` : ""}?
            </h2>
            <p className="opacity-80 mb-8 max-w-xl mx-auto">
              Join hundreds of Ontario families who trust PSW Direct for on-demand, vetted home care. No contracts. No waiting lists. Care starts today.
            </p>
            <Link to="/">
              <Button size="lg" className="text-lg px-8 py-6">
                Request a PSW Now <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Internal links */}
        <section className="px-4 py-10 max-w-4xl mx-auto">
          <SEOInternalLinks currentSlug={slug} />
        </section>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4 border-t border-border/20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">Ontario's on-demand home care platform. 25+ communities served.</p>
            <p className="text-xs opacity-60">© {new Date().getFullYear()} PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HighConvertLandingPage;

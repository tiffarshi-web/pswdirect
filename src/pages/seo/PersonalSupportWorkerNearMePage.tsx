import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Heart,
  Users,
  ArrowRight,
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  SITE_URL,
  OG_IMAGE,
  buildBreadcrumbList,
  buildProfessionalService,
} from "@/lib/seoUtils";
import { buildFAQSchema } from "@/lib/seoShared";
import { BUSINESS_CONTACT } from "@/lib/contactConfig";

const CANONICAL = `${SITE_URL}/personal-support-worker-near-me`;
const TITLE =
  "Personal Support Worker Near Me | Find a PSW in Ontario | PSW Direct";
const DESCRIPTION =
  "Find a personal support worker near you in Ontario. PSW Direct connects families with vetted PSWs for in-home care from $35/hr. Same-day availability. Book in under 2 minutes.";

const FAQS = [
  {
    question: "How quickly can I get a PSW?",
    answer:
      "Same-day service is often available depending on your area. Most bookings across Ontario are matched with an available personal support worker within hours.",
  },
  {
    question: "Do I need a contract?",
    answer:
      "No. All services are pay-as-you-go. Book by the hour, use the service when you need it, and cancel anytime — no long-term commitments.",
  },
  {
    question: "Are PSWs qualified?",
    answer:
      "Yes. Every personal support worker on PSW Direct is vetted, credential-verified, and police-checked before being approved on the platform.",
  },
  {
    question: "Can I book for a family member?",
    answer:
      "Absolutely. Many of our clients book PSW services for parents, spouses, or other loved ones. You can manage their care from your own account.",
  },
  {
    question: "How much does a PSW cost in Ontario?",
    answer:
      "Personal support worker services through PSW Direct start at $35/hour with simple, transparent pricing and no hidden fees or agency markups.",
  },
];

const SERVICES = [
  "Bathing and personal hygiene",
  "Dressing and grooming",
  "Meal preparation and feeding",
  "Medication reminders",
  "Mobility assistance and transfers",
  "Companionship and emotional support",
];

const WHO_NEEDS = [
  "Is aging and needs help at home",
  "Is recovering from surgery or illness",
  "Has limited mobility",
  "Needs overnight or 24-hour care",
  "Requires companionship or supervision",
];

const CITIES = [
  { name: "Toronto", slug: "psw-toronto" },
  { name: "Barrie", slug: "psw-barrie" },
  { name: "Mississauga", slug: "psw-mississauga" },
  { name: "Brampton", slug: "psw-brampton" },
  { name: "Vaughan", slug: "psw-vaughan" },
  { name: "Markham", slug: "psw-markham" },
  { name: "Oshawa", slug: "psw-oshawa" },
  { name: "Hamilton", slug: "psw-hamilton" },
];

const PersonalSupportWorkerNearMePage = () => {
  return (
    <>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify(
            buildBreadcrumbList([
              { name: "Home", url: SITE_URL },
              { name: "Personal Support Worker Near Me", url: CANONICAL },
            ])
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildProfessionalService())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildFAQSchema(FAQS))}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link to="/" className="flex items-center gap-3">
                <img
                  src={logo}
                  alt="PSW Direct Logo"
                  className="h-12 w-auto"
                />
                <span className="text-sm font-semibold text-foreground tracking-wide">
                  PSW Direct
                </span>
              </Link>
              <a
                href={BUSINESS_CONTACT.phoneTel}
                className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {BUSINESS_CONTACT.phone}
                </span>
              </a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="px-4 py-14 md:py-20 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            Personal Support Worker Near Me · Ontario
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Find a Personal Support Worker Near You — Book in Under 2 Minutes
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-6">
            Looking for a personal support worker near you? PSW Direct connects
            you with qualified caregivers across Ontario—fast.
          </p>
          <p className="text-base text-foreground font-medium mb-8">
            Starting at $35/hour · No contracts · Same-day availability · Book
            in under 2 minutes
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/">
              <Button size="lg" className="text-lg px-8 py-6">
                Book Care
              </Button>
            </Link>
            <a href={BUSINESS_CONTACT.phoneTel}>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                <Phone className="w-4 h-4 mr-2" />
                {BUSINESS_CONTACT.phone}
              </Button>
            </a>
          </div>
          <p className="text-sm text-muted-foreground mt-6 max-w-2xl mx-auto">
            Whether you need help for yourself or a loved one, we make it easy
            to get trusted care at home without delays.
          </p>
        </section>

        {/* What does a PSW do */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
              What Does a Personal Support Worker Do?
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              A personal support worker (PSW) provides essential in-home care
              for seniors, patients, and individuals who need assistance with
              daily living.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {SERVICES.map((s) => (
                <div
                  key={s}
                  className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{s}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-8">
              All services are delivered in the comfort of your home—on your
              schedule.
            </p>
          </div>
        </section>

        {/* Who Needs a PSW */}
        <section className="px-4 py-14 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
            Who Needs a PSW?
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            You may need a personal support worker if you or your loved one:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {WHO_NEEDS.map((w) => (
              <div
                key={w}
                className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border"
              >
                <Heart className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{w}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center mt-8">
            We support families across Ontario with flexible, reliable care.
          </p>
        </section>

        {/* Why Choose */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
              Why Choose PSW Direct?
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              Unlike traditional agencies, we provide on-demand home care with
              full transparency.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Clock,
                  title: "Fast Booking",
                  desc: "Get matched with a PSW quickly.",
                },
                {
                  icon: Heart,
                  title: "Affordable Rates",
                  desc: "Starting at $35/hour with no agency markups.",
                },
                {
                  icon: CheckCircle2,
                  title: "No Contracts",
                  desc: "Use services as needed — pay by the hour.",
                },
                {
                  icon: MapPin,
                  title: "Ontario-Wide Coverage",
                  desc: "Toronto, Barrie, GTA, and beyond.",
                },
                {
                  icon: ShieldCheck,
                  title: "Vetted Caregivers",
                  desc: "Qualified, credential-verified, police-checked PSWs.",
                },
                {
                  icon: Users,
                  title: "Family-First Support",
                  desc: "Book for yourself or a loved one with one account.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-4 bg-card rounded-xl p-5 border border-border"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-8">
              We remove the delays and complexity—so you can focus on care.
            </p>
          </div>
        </section>

        {/* Same-Day */}
        <section className="px-4 py-14 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Same-Day PSW Services Available
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Need help urgently? We offer same-day and next-day availability
            depending on your location. Our platform allows you to book
            instantly, choose your preferred time, and get matched with
            available PSWs nearby.
          </p>
          <Link to="/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book Care Now
            </Button>
          </Link>
        </section>

        {/* Areas We Serve */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
              Areas We Serve
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              We provide personal support workers across Ontario. If you're
              searching for a "PSW near me", we likely cover your area.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {CITIES.map(({ name, slug }) => (
                <Link
                  key={slug}
                  to={`/${slug}`}
                  className="flex items-center gap-2 bg-card rounded-lg px-4 py-3 border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm font-medium text-foreground"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  {name}
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link
                to="/ontario-psw-locations"
                className="text-sm text-primary font-medium hover:underline"
              >
                View All Ontario Locations →
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 py-14 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
            How It Works
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Select your service",
              "Choose date and time",
              "Enter your details",
              "Book instantly",
            ].map((step, i) => (
              <div
                key={step}
                className="bg-card rounded-xl p-5 border border-border text-center"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto mb-3">
                  {i + 1}
                </div>
                <p className="text-sm font-medium text-foreground">{step}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center mt-6">
            That's it—no calls, no waiting.
          </p>
        </section>

        {/* Pricing */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Pricing
            </h2>
            <p className="text-muted-foreground mb-6">
              Our services start at:
            </p>
            <p className="text-4xl md:text-5xl font-bold text-primary mb-4">
              $35 <span className="text-lg text-muted-foreground">per hour</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Simple, transparent pricing with no hidden fees.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-14 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Book a Personal Support Worker Near You Today
          </h2>
          <p className="text-muted-foreground mb-8">
            Getting help at home shouldn't be complicated. Book your PSW in
            under 2 minutes and get the support you need—fast.
          </p>
          <Link to="/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book Care
            </Button>
          </Link>
        </section>

        {/* FAQ */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <details
                  key={i}
                  className="bg-card rounded-xl border border-border group"
                >
                  <summary className="cursor-pointer p-5 font-semibold text-foreground list-none flex items-center justify-between">
                    {faq.question}
                    <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0 ml-2" />
                  </summary>
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Need Immediate Help */}
        <section className="px-4 py-14 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Need Immediate Help?
          </h2>
          <p className="text-muted-foreground mb-6">Call us directly:</p>
          <a
            href={BUSINESS_CONTACT.phoneTel}
            className="inline-flex items-center gap-2 text-2xl font-bold text-primary hover:underline"
          >
            <Phone className="w-6 h-6" />
            {BUSINESS_CONTACT.phone}
          </a>
          <p className="text-sm text-muted-foreground mt-3">Available 24/7</p>
        </section>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">
              Trusted Personal Support Workers Across Ontario.
            </p>
            <p className="text-xs opacity-60">
              © 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PersonalSupportWorkerNearMePage;

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, DollarSign, Clock, MapPin, Shield, Users, Briefcase } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { isTier1CityByLabel } from "@/lib/seoTierConfig";

interface PSWJobCityPageProps {
  city: string;
  slug: string;
}

const PSWJobCityPage = ({ city, slug }: PSWJobCityPageProps) => {
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const title = `PSW Jobs in ${city} | Work as a Personal Support Worker | PSW Direct`;
  const description = `Looking for PSW jobs in ${city}? Join PSW Direct and earn $22–$28/hr with flexible scheduling, no contracts, and direct client bookings.`;

  const jobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `Personal Support Worker in ${city}`,
    description: `PSW Direct is looking for certified Personal Support Workers in ${city} to provide in-home care services including personal care, companionship, mobility support, and doctor escort. Flexible scheduling, competitive pay, and no long-term contracts.`,
    datePosted: "2026-01-01",
    validThrough: "2026-12-31",
    employmentType: ["PART_TIME", "CONTRACTOR"],
    hiringOrganization: {
      "@type": "Organization",
      name: "PSW Direct",
      sameAs: SITE_URL,
      logo: `${SITE_URL}/logo-512.png`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressRegion: "ON",
        addressCountry: "CA",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "CAD",
      value: {
        "@type": "QuantitativeValue",
        minValue: 22,
        maxValue: 28,
        unitText: "HOUR",
      },
    },
    applicantLocationRequirements: {
      "@type": "Country",
      name: "Canada",
    },
  };

  const benefits = [
    { icon: DollarSign, label: "Competitive Pay", desc: "Earn $22–$28 per hour — higher than most agency rates for PSWs" },
    { icon: Clock, label: "Flexible Scheduling", desc: "Choose your own hours and work when it suits you — mornings, evenings, or weekends" },
    { icon: Users, label: "Direct Client Work", desc: "Work independently with clients — no agency micromanagement" },
    { icon: Shield, label: "No Contracts", desc: "No long-term commitments — accept shifts that work for your schedule" },
    { icon: MapPin, label: `Work in ${city}`, desc: `Serve clients in ${city} and surrounding communities` },
    { icon: Briefcase, label: "Weekly Payouts", desc: "Request payouts every Thursday — no waiting for month-end" },
  ];

  const faqItems = [
    { q: `How much do PSWs earn in ${city}?`, a: `PSWs on PSW Direct earn $22–$28 per hour depending on the service type. This is typically higher than traditional agency pay rates.` },
    { q: "Do I need a PSW certificate?", a: "Yes, you need a recognized PSW certificate from an Ontario-approved program, along with a valid police check." },
    { q: "Can I choose my own hours?", a: "Absolutely. PSW Direct lets you set your availability and claim shifts that fit your schedule. There are no minimum hour requirements." },
    { q: "Is there a long-term contract?", a: "No. You work independently through the platform with no long-term commitments." },
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
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify(buildBreadcrumbList([
            { name: "Home", url: SITE_URL },
            { name: "PSW Work Areas", url: `${SITE_URL}/psw-work-areas-ontario` },
            { name: `PSW Jobs in ${city}`, url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">{JSON.stringify(jobPostingJsonLd)}</script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
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

        <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <Briefcase className="w-4 h-4" />
            Now Hiring in {city}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            PSW Jobs in {city}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            Join PSW Direct and work as an independent personal support worker in {city}.
            Earn $22–$28/hr with flexible scheduling, weekly payouts, and no long-term contracts.
            Choose your own clients and build your career on your terms.
          </p>
          <Link to="/join-team">
            <Button size="lg" className="text-lg px-8 py-6">
              Apply to Join PSW Direct
            </Button>
          </Link>
        </section>

        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Why Work with PSW Direct in {city}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {benefits.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-card rounded-xl p-5 shadow-card border border-border">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{label}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqItems.map((f, i) => (
                <div key={i} className="bg-card rounded-xl p-5 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/50 px-4 py-12 border-y border-border text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Start?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Apply online in minutes. Upload your credentials, set your availability, and start receiving client requests in {city}.
          </p>
          <Link to="/join-team">
            <Button size="lg" className="text-lg px-8 py-6">Apply Now</Button>
          </Link>
        </section>

        <section className="px-4 py-12 max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/psw-work-areas-ontario" className="text-primary hover:underline text-sm">All Work Areas</Link>
            <Link to="/psw-pay-calculator" className="text-primary hover:underline text-sm">Pay Calculator</Link>
            <Link to="/psw-agency-vs-private-pay" className="text-primary hover:underline text-sm">Agency vs Private Pay</Link>
            <Link to="/private-psw-jobs" className="text-primary hover:underline text-sm">Private PSW Jobs</Link>
          </div>
        </section>

        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">Hiring PSWs across Ontario.</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PSWJobCityPage;

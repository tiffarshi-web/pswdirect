import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, Clock, AlertCircle, Shield, Heart, Users, Stethoscope } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, buildProfessionalService } from "@/lib/seoUtils";
import { supabase } from "@/integrations/supabase/client";

interface EmergencyCarePageProps {
  city: string;
  slug: string;
  variant: "urgent" | "same-day";
}

const EmergencyCareLandingPage = ({ city, slug, variant }: EmergencyCarePageProps) => {
  const [pswCount, setPswCount] = useState<number | null>(null);

  const isUrgent = variant === "urgent";
  const typeLabel = isUrgent ? "Urgent Home Care" : "Same-Day Home Care";
  const canonicalUrl = `${SITE_URL}/${slug}`;

  const title = `${typeLabel} in ${city} | PSW Direct`;
  const description = `Need ${typeLabel.toLowerCase()} in ${city}? PSW Direct connects families with vetted personal support workers for immediate care. Book online starting at $30/hr.`;

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("psw_public_directory")
        .select("id", { count: "exact", head: true })
        .eq("home_city", city);
      if (count !== null) setPswCount(count);
    };
    fetchCount();
  }, [city]);

  const faqItems = [
    {
      q: `Can I get ${typeLabel.toLowerCase()} in ${city}?`,
      a: `Yes. PSW Direct has vetted personal support workers serving ${city} and surrounding areas. You can book online and a caregiver can be matched quickly based on availability.`,
    },
    {
      q: `How much does ${typeLabel.toLowerCase()} cost?`,
      a: `Home care through PSW Direct starts at $30 per hour with no contracts or cancellation fees. Traditional agencies typically charge $55+ per hour.`,
    },
    {
      q: "What services are available on short notice?",
      a: "Personal care, companionship, mobility support, hospital discharge assistance, and doctor escort services are all available for urgent bookings.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const services = [
    { icon: AlertCircle, label: "Emergency Personal Care", desc: "Immediate assistance with bathing, grooming, and hygiene needs" },
    { icon: Heart, label: "Urgent Companionship", desc: "Rapid placement for seniors needing supervision and social support" },
    { icon: Shield, label: "Fall Recovery Support", desc: "Post-fall care including mobility assistance and safety monitoring" },
    { icon: Stethoscope, label: "Hospital Discharge", desc: "Same-day support for safe transitions from hospital to home" },
    { icon: Users, label: "Respite Relief", desc: "Immediate backup when a family caregiver is unavailable" },
    { icon: Clock, label: "Overnight Care", desc: "Short-notice overnight supervision and personal support" },
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
            { name: `Home Care in ${city}`, url: `${SITE_URL}/home-care-${city.toLowerCase().replace(/\s+/g, "-")}` },
            { name: typeLabel, url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildProfessionalService())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
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

        {/* Hero */}
        <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive rounded-full px-4 py-2 text-sm font-medium mb-6">
            <Clock className="w-4 h-4" />
            {isUrgent ? "Urgent Care Available" : "Same-Day Booking"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            {typeLabel} in {city}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-4">
            When you need a personal support worker quickly in {city}, PSW Direct connects you with vetted caregivers
            who can provide immediate in-home support. No contracts, no agency overhead — just trusted care when you need it most.
          </p>
          {pswCount !== null && pswCount > 0 && (
            <p className="text-sm text-muted-foreground mb-8">
              {pswCount} approved PSW{pswCount !== 1 ? "s" : ""} currently serving {city}
            </p>
          )}
          <a href="https://psadirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book {typeLabel} Now
            </Button>
          </a>
        </section>

        {/* Services */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              {typeLabel} Services in {city}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map(({ icon: Icon, label, desc }) => (
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

        {/* Why PSW Direct */}
        <section className="px-4 py-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Why Choose PSW Direct for {typeLabel}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <p className="text-primary text-3xl font-bold mb-2">$30/hr</p>
              <p className="text-muted-foreground text-sm">Starting rate — agencies charge $55+</p>
            </div>
            <div className="text-center p-6">
              <p className="text-primary text-3xl font-bold mb-2">Vetted</p>
              <p className="text-muted-foreground text-sm">Police-checked and credential-verified PSWs</p>
            </div>
            <div className="text-center p-6">
              <p className="text-primary text-3xl font-bold mb-2">No Contract</p>
              <p className="text-muted-foreground text-sm">Book by the hour — cancel anytime</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Frequently Asked Questions
            </h2>
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

        {/* Internal Links */}
        <section className="px-4 py-12 max-w-4xl mx-auto text-center">
          <h2 className="text-xl font-bold text-foreground mb-4">More Home Care in {city}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={`/psw-${city.toLowerCase().replace(/[\s.]+/g, "-")}`} className="text-primary hover:underline text-sm">
              PSWs in {city}
            </Link>
            <Link to={`/home-care-${city.toLowerCase().replace(/[\s.]+/g, "-")}`} className="text-primary hover:underline text-sm">
              Home Care in {city}
            </Link>
            <Link to="/psw-directory" className="text-primary hover:underline text-sm">
              Full PSW Directory
            </Link>
            <Link to="/home-care-ontario" className="text-primary hover:underline text-sm">
              Home Care Ontario
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">Proudly serving {city} and communities across Ontario.</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default EmergencyCareLandingPage;

import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { Phone, MapPin, CheckCircle2, Shield, Clock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { buildFAQSchema } from "@/lib/seoShared";
import { SEO_CITIES } from "@/lib/seoCityData";
import { ONTARIO_HUBS, type OntarioHubConfig } from "@/lib/serviceOntarioHubs";

interface Props {
  config?: OntarioHubConfig;
}

/**
 * High-authority Ontario service hub template.
 * Renders 2,500+ words of unique per-service copy plus links to
 *   - all city pages for this service
 *   - every other Ontario service hub
 * Purely additive — no metadata, canonical, robots, or sitemap changes elsewhere.
 */
const ServiceOntarioHubPage = ({ config: configProp }: Props) => {
  const params = useParams();
  const config =
    configProp ??
    ONTARIO_HUBS.find((h) => h.slug === params.slug) ??
    ONTARIO_HUBS[0];

  const canonicalUrl = `${SITE_URL}/${config.slug}`;

  return (
    <>
      <Helmet>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={config.title} />
        <meta property="og:description" content={config.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={config.title} />
        <meta name="twitter:description" content={config.description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify(
            buildBreadcrumbList([
              { name: "Home", url: SITE_URL },
              { name: config.serviceLabel + " Ontario", url: canonicalUrl },
            ])
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildFAQSchema(config.faqs.map((f) => ({ question: f.q, answer: f.a }))))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HomeHealthService",
            name: `PSW Direct — ${config.serviceLabel} Ontario`,
            description: config.description,
            url: canonicalUrl,
            telephone: "+1-249-288-4787",
            priceRange: "$35-$45",
            serviceType: [config.serviceLabel, "Home Care", "Personal Support Worker"],
            areaServed: { "@type": "AdministrativeArea", name: "Ontario, Canada" },
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
              <a
                href="tel:2492884787"
                className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">(249) 288-4787</span>
              </a>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <nav className="max-w-6xl mx-auto px-4 pt-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-2">›</span>
          <Link to="/ontario-home-care" className="hover:underline">Ontario</Link>
          <span className="mx-2">›</span>
          <span>{config.serviceLabel}</span>
        </nav>

        {/* Hero */}
        <section className="px-4 py-10 md:py-14 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            {SEO_CITIES.length}+ Cities Across Ontario
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{config.h1}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            {config.intro}
          </p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book {config.serviceLabel}
            </Button>
          </a>
        </section>

        {/* Overview */}
        <section className="px-4 py-10 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            About {config.serviceLabel} at Home
          </h2>
          <div className="prose prose-sm md:prose-base max-w-none text-muted-foreground space-y-4">
            {config.overview.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* Who / What included */}
        <section className="bg-muted/50 px-4 py-10 border-y border-border">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">Who It's For</h2>
              <ul className="space-y-2">
                {config.whoItsFor.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">What's Included</h2>
              <ul className="space-y-2">
                {config.whatsIncluded.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="px-4 py-10 max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            How {config.serviceLabel} Works
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {config.process.map((step, i) => (
              <div key={i} className="bg-card rounded-xl p-5 border border-border">
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ontario healthcare context */}
        <section className="bg-muted/50 px-4 py-10 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              {config.serviceLabel} in Ontario's Care System
            </h2>
            <div className="prose prose-sm md:prose-base max-w-none text-muted-foreground space-y-4">
              {config.ontarioContext.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 py-10 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            {config.serviceLabel} Pricing in Ontario
          </h2>
          <div className="prose prose-sm md:prose-base max-w-none text-muted-foreground space-y-4">
            {config.pricing.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* Trust signals */}
        <section className="bg-muted/50 px-4 py-10 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
              Why Families Choose PSW Direct
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {config.trustSignals.map((t, i) => (
                <div key={i} className="flex gap-3 bg-card rounded-lg p-4 border border-border">
                  {i % 4 === 0 ? <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" /> :
                   i % 4 === 1 ? <Heart className="w-5 h-5 text-primary shrink-0 mt-0.5" /> :
                   i % 4 === 2 ? <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" /> :
                                 <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />}
                  <span className="text-sm text-muted-foreground">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* City links */}
        <section className="px-4 py-10 max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Find {config.serviceLabel} in Your City
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-2xl mx-auto">
            PSW Direct serves {SEO_CITIES.length}+ Ontario communities. Choose your city below to see local availability.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {SEO_CITIES.map((city) => (
              <Link
                key={city.key}
                to={`/${config.cityLinkPrefix}-${city.key}`}
                className="bg-card rounded-lg p-3 text-center border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground"
              >
                {config.serviceLabel} {city.label}
              </Link>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-muted/50 px-4 py-10 border-y border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {config.faqs.map((f, i) => (
                <div key={i} className="bg-card rounded-xl p-5 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related service hubs */}
        <section className="px-4 py-10 max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Other Ontario Home Care Services
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link to="/home-care-ontario" className="bg-card rounded-lg p-3 border border-border hover:border-primary text-sm text-center">Home Care Ontario</Link>
            {ONTARIO_HUBS.filter((h) => h.slug !== config.slug).map((h) => (
              <Link
                key={h.slug}
                to={`/${h.slug}`}
                className="bg-card rounded-lg p-3 border border-border hover:border-primary text-sm text-center"
              >
                {h.serviceLabel} Ontario
              </Link>
            ))}
            <Link to="/ontario-home-care" className="bg-card rounded-lg p-3 border border-border hover:border-primary text-sm text-center">All Cities Hub</Link>
            <Link to="/personal-support-workers-ontario" className="bg-card rounded-lg p-3 border border-border hover:border-primary text-sm text-center">PSW Directory</Link>
            <Link to="/in-home-care-ontario" className="bg-card rounded-lg p-3 border border-border hover:border-primary text-sm text-center">In-Home Care Ontario</Link>
          </div>
        </section>

        {/* Related pages footer */}
        <section className="px-4 py-8 max-w-4xl mx-auto text-center border-t border-border">
          <h2 className="text-lg font-bold text-foreground mb-3">Related Pages</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/cities" className="text-primary hover:underline text-sm">All Cities</Link>
            <Link to="/psw-directory" className="text-primary hover:underline text-sm">PSW Directory</Link>
            <Link to="/guides" className="text-primary hover:underline text-sm">Care Guides</Link>
            <Link to="/coverage" className="text-primary hover:underline text-sm">Coverage Map</Link>
            <Link to="/about" className="text-primary hover:underline text-sm">About PSW Direct</Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">
              Proudly serving {SEO_CITIES.length}+ communities across Ontario.
            </p>
            <p className="text-xs opacity-60">
              © {new Date().getFullYear()} PSW Direct. All Rights Reserved. | PHIPA Compliant
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ServiceOntarioHubPage;

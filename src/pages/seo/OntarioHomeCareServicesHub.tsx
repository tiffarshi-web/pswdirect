import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Phone, MapPin, Heart, Shield, Stethoscope, Clock, Users, Home } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { SEO_CITIES } from "@/lib/seoCityData";
import SEOInternalLinks from "@/components/seo/SEOInternalLinks";

const canonicalUrl = `${SITE_URL}/ontario-home-care-services`;
const title = "Ontario Home Care Services | All Cities & Services | PSW Direct";
const description = "Complete directory of PSW Direct home care services across Ontario. Browse by city, service type, or condition. Book vetted PSWs online from $35/hr.";

const serviceCategories = [
  { label: "Personal Care", slug: "personal-care", icon: Heart },
  { label: "Companionship", slug: "companionship", icon: Users },
  { label: "Dementia Care", slug: "dementia-care", icon: Shield },
  { label: "Post-Surgery Care", slug: "post-surgery-care", icon: Stethoscope },
  { label: "Palliative Care", slug: "palliative-care", icon: Heart },
  { label: "Overnight Care", slug: "overnight-care", icon: Clock },
  { label: "Doctor Escort", slug: "doctor-escort", icon: Stethoscope },
  { label: "Senior Home Care", slug: "senior-home-care", icon: Home },
  { label: "Respite Care", slug: "respite-care", icon: Users },
  { label: "24-Hour Home Care", slug: "24-hour-home-care", icon: Clock },
];

const conditionPages = [
  { label: "Dementia Home Care", prefix: "dementia-care" },
  { label: "Post-Surgery Home Care", prefix: "post-surgery-care" },
  { label: "Palliative Care", prefix: "palliative-care" },
  { label: "Hospital Discharge Care", prefix: "hospital-discharge" },
];

const urgencyPages = [
  { label: "Same-Day Home Care", prefix: "same-day-home-care" },
  { label: "Emergency Home Care", prefix: "emergency-home-care" },
  { label: "On-Demand Home Care", prefix: "on-demand-home-care" },
];

const topCities = SEO_CITIES.slice(0, 20);

const OntarioHomeCareServicesHub = () => (
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
      <script type="application/ld+json">
        {JSON.stringify(buildBreadcrumbList([
          { name: "Home", url: SITE_URL },
          { name: "Ontario Home Care Services", url: canonicalUrl },
        ]))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description,
          url: canonicalUrl,
          publisher: { "@type": "Organization", name: "PSW Direct", url: SITE_URL },
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

      {/* Hero */}
      <section className="px-4 py-12 md:py-16 max-w-5xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Ontario Home Care Services Directory
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          Browse all PSW Direct home care services by city, service type, condition, or urgency.
          Every page connects you with vetted personal support workers — book online from $35/hr with no contracts.
        </p>
      </section>

      {/* City Pages */}
      <section className="bg-muted/50 px-4 py-12 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Home Care by City</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {SEO_CITIES.map((city) => (
              <Link key={city.key} to={`/home-care-${city.key}`} className="bg-card rounded-lg p-3 text-center border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground">
                {city.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Service Types */}
      <section className="px-4 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Browse by Service Type</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {serviceCategories.map(({ label, slug, icon: Icon }) => (
            <Link key={slug} to={`/${slug}-toronto`} className="flex items-center gap-3 bg-card rounded-lg p-4 border border-border hover:border-primary transition-colors">
              <Icon className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="font-medium text-foreground text-sm">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Condition Pages */}
      <section className="bg-muted/50 px-4 py-12 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Care by Condition</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {conditionPages.map(({ label, prefix }) => (
              <div key={prefix}>
                <h3 className="font-semibold text-foreground mb-3">{label}</h3>
                <div className="flex flex-wrap gap-2">
                  {topCities.slice(0, 8).map((city) => (
                    <Link key={city.key} to={`/${prefix}-${city.key}`} className="text-primary hover:underline text-xs">
                      {city.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Urgency Pages */}
      <section className="px-4 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Urgent Care Options</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {urgencyPages.map(({ label, prefix }) => (
            <div key={prefix} className="bg-card rounded-lg p-4 border border-border">
              <h3 className="font-semibold text-foreground mb-3">{label}</h3>
              <div className="flex flex-wrap gap-2">
                {topCities.slice(0, 6).map((city) => (
                  <Link key={city.key} to={`/${prefix}-${city.key}`} className="text-primary hover:underline text-xs">
                    {city.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="bg-muted/50 px-4 py-8 border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Links</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/home-care-ontario" className="text-primary hover:underline text-sm">Home Care Ontario</Link>
            <Link to="/ontario-home-care" className="text-primary hover:underline text-sm">Ontario Home Care Hub</Link>
            <Link to="/private-home-care" className="text-primary hover:underline text-sm">Private Home Care</Link>
            <Link to="/psw-directory" className="text-primary hover:underline text-sm">PSW Directory</Link>
            <Link to="/cities" className="text-primary hover:underline text-sm">All Cities</Link>
            <Link to="/languages" className="text-primary hover:underline text-sm">Languages</Link>
            <Link to="/coverage" className="text-primary hover:underline text-sm">Coverage Map</Link>
            <Link to="/home-care-ontario-map" className="text-primary hover:underline text-sm">Interactive Map</Link>
            <Link to="/guides" className="text-primary hover:underline text-sm">Care Guides</Link>
            <Link to="/same-day-home-care" className="text-primary hover:underline text-sm">Same-Day Care</Link>
            <Link to="/caregiver-near-me" className="text-primary hover:underline text-sm">Caregiver Near Me</Link>
            <Link to="/elderly-care-near-me" className="text-primary hover:underline text-sm">Elderly Care Near Me</Link>
          </div>
        </div>
      </section>

      <SEOInternalLinks compact />

      <footer className="bg-secondary text-secondary-foreground py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
            <span className="font-semibold">PSW Direct</span>
          </div>
          <p className="text-sm opacity-80 mb-2">Serving {SEO_CITIES.length}+ communities across Ontario.</p>
          <p className="text-xs opacity-60">© {new Date().getFullYear()} PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
        </div>
      </footer>
    </div>
  </>
);

export default OntarioHomeCareServicesHub;

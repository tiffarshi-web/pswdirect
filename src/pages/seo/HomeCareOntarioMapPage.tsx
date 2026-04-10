import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { SEO_CITIES } from "@/lib/seoCityData";
import { BUSINESS_CONTACT } from "@/lib/contactConfig";
import SEOInternalLinks from "@/components/seo/SEOInternalLinks";

const canonicalUrl = `${SITE_URL}/home-care-ontario-map`;
const title = "Ontario Home Care Map | Service Areas | PSW Direct";
const description = "Interactive map of PSW Direct home care service areas across Ontario. Find personal support workers near you — click any city to book care online.";

const regions = [
  {
    name: "Greater Toronto Area",
    cities: SEO_CITIES.filter((c) =>
      ["toronto", "scarborough", "north-york", "etobicoke", "mississauga", "brampton", "vaughan", "markham", "richmond-hill", "oakville", "burlington", "ajax", "pickering", "oshawa", "whitby", "milton", "courtice"].includes(c.key)
    ),
  },
  {
    name: "Simcoe County & North",
    cities: SEO_CITIES.filter((c) =>
      ["barrie", "innisfil", "orillia", "bradford", "alliston", "newmarket", "aurora", "midland", "collingwood"].includes(c.key)
    ),
  },
  {
    name: "Southwestern Ontario",
    cities: SEO_CITIES.filter((c) =>
      ["hamilton", "kitchener", "waterloo", "cambridge", "london", "windsor", "guelph", "brantford", "sarnia", "woodstock", "stoney-creek", "dundas", "georgetown", "welland", "st-catharines", "niagara-falls"].includes(c.key)
    ),
  },
  {
    name: "Eastern Ontario",
    cities: SEO_CITIES.filter((c) =>
      ["ottawa", "kingston", "peterborough", "cobourg", "belleville"].includes(c.key)
    ),
  },
  {
    name: "Northern Ontario",
    cities: SEO_CITIES.filter((c) =>
      ["thunder-bay", "sudbury", "sault-ste-marie"].includes(c.key)
    ),
  },
];

const HomeCareOntarioMapPage = () => (
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
          { name: "Ontario Home Care", url: `${SITE_URL}/ontario-home-care` },
          { name: "Service Area Map", url: canonicalUrl },
        ]))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "PSW Direct",
          description: "Home care services across Ontario",
          url: SITE_URL,
          telephone: BUSINESS_CONTACT.phoneInternational,
          priceRange: "$30-$35",
          areaServed: SEO_CITIES.map((c) => ({
            "@type": "City",
            name: c.label,
            geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
          })),
          serviceType: ["Home Care", "Personal Support Worker", "Elderly Care", "Dementia Care"],
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
            <a href={`tel:${BUSINESS_CONTACT.phoneRaw}`} className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{BUSINESS_CONTACT.phoneFormatted}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-12 md:py-16 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
          <MapPin className="w-4 h-4" />
          {SEO_CITIES.length}+ Service Areas
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Ontario Home Care Service Area Map
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          PSW Direct serves {SEO_CITIES.length}+ cities and communities across Ontario.
          Browse our coverage areas below and click any city to find home care services, book a PSW, or learn about local availability.
        </p>
      </section>

      {/* Interactive Map (Leaflet) */}
      <section className="px-4 py-8 max-w-6xl mx-auto">
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
          <iframe
            title="PSW Direct Ontario Service Areas"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=-90.0,41.5,-74.0,49.0&layer=mapnik`}
            className="w-full h-[400px] md:h-[500px]"
            loading="lazy"
          />
          <div className="p-4 text-center text-sm text-muted-foreground">
            <p>PSW Direct provides home care coverage across {SEO_CITIES.length}+ Ontario communities. Select a city below for details.</p>
          </div>
        </div>
      </section>

      {/* Regions with city links */}
      {regions.map((region) => (
        <section key={region.name} className="px-4 py-8 max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-foreground mb-4">{region.name}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {region.cities.map((city) => (
              <Link
                key={city.key}
                to={`/home-care-${city.key}`}
                className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground"
              >
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {city.label}
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="px-4 py-12 max-w-3xl mx-auto text-center border-t border-border">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Don't See Your City? We Likely Cover It.
        </h2>
        <p className="text-muted-foreground mb-8">
          PSW Direct is expanding across Ontario. Call us or book online — if we have PSWs in your area, we'll match you right away.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">Book Home Care Now</Button>
          </a>
          <a href={`tel:${BUSINESS_CONTACT.phoneRaw}`}>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
              <Phone className="w-5 h-5 mr-2" /> Call Us
            </Button>
          </a>
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

export default HomeCareOntarioMapPage;

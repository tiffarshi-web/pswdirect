import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";

const cities = [
  { key: "toronto", label: "Toronto" },
  { key: "mississauga", label: "Mississauga" },
  { key: "brampton", label: "Brampton" },
  { key: "vaughan", label: "Vaughan" },
  { key: "markham", label: "Markham" },
  { key: "richmond-hill", label: "Richmond Hill" },
  { key: "oakville", label: "Oakville" },
  { key: "burlington", label: "Burlington" },
  { key: "ajax", label: "Ajax" },
  { key: "pickering", label: "Pickering" },
  { key: "oshawa", label: "Oshawa" },
  { key: "whitby", label: "Whitby" },
  { key: "barrie", label: "Barrie" },
  { key: "hamilton", label: "Hamilton" },
  { key: "kitchener", label: "Kitchener" },
  { key: "waterloo", label: "Waterloo" },
  { key: "cambridge", label: "Cambridge" },
  { key: "london", label: "London" },
  { key: "windsor", label: "Windsor" },
  { key: "st-catharines", label: "St. Catharines" },
  { key: "niagara-falls", label: "Niagara Falls" },
  { key: "guelph", label: "Guelph" },
  { key: "kingston", label: "Kingston" },
  { key: "peterborough", label: "Peterborough" },
  { key: "ottawa", label: "Ottawa" },
];

const services = [
  { key: "dementia-care", label: "Dementia Care" },
  { key: "alzheimers-care", label: "Alzheimer's Care" },
  { key: "overnight-care", label: "Overnight Care" },
  { key: "24-hour-home-care", label: "24-Hour Home Care" },
  { key: "post-surgery-care", label: "Post-Surgery Care" },
  { key: "palliative-care", label: "Palliative Care" },
  { key: "respite-care", label: "Respite Care" },
  { key: "senior-home-care", label: "Senior Home Care" },
  { key: "personal-care", label: "Personal Care" },
  { key: "companionship", label: "Companionship" },
  { key: "mobility-support", label: "Mobility Support" },
  { key: "doctor-escort", label: "Doctor Escort" },
];

const title = "Personal Support Workers in Ontario | PSW Directory | PSW Direct";
const description = "Find trusted Personal Support Workers across Ontario. Browse PSWs by city — Toronto, Mississauga, Brampton, Hamilton, Ottawa, and 20+ more communities. Book home care starting at $30/hour.";
const canonicalUrl = `${SITE_URL}/personal-support-workers-ontario`;

const PSWOntarioDirectory = () => {
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
            { name: "PSW Directory", url: `${SITE_URL}/psw-directory` },
            { name: "Ontario", url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Personal Support Workers in Ontario by City",
            description,
            numberOfItems: cities.length,
            itemListElement: cities.map((city, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `PSWs in ${city.label}`,
              url: `${SITE_URL}/psw-${city.key}`,
            })),
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

        {/* Hero */}
        <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Personal Support Workers in Ontario
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct connects families across Ontario with vetted, credential-verified Personal Support Workers.
            Browse by city to find caregivers near you offering personal care, companionship, dementia support, 
            overnight care, and more — starting at $30/hour with no contracts.
          </p>
          <a href="https://psadirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
        </section>

        {/* Cities Grid */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Browse PSWs by City
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.map((city) => (
              <Link
                key={city.key}
                to={`/psw-${city.key}`}
                className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:shadow-md hover:border-primary/30 transition-all"
              >
                <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <span className="font-semibold text-foreground text-sm">{city.label}</span>
                  <p className="text-xs text-muted-foreground">View PSWs →</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Services Section */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Browse by Service Type
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.key} className="p-5 bg-card rounded-xl border border-border">
                <h3 className="font-semibold text-foreground mb-2">{service.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {cities.slice(0, 5).map((city) => (
                    <Link
                      key={`${service.key}-${city.key}`}
                      to={`/${service.key}-${city.key}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {city.label}
                    </Link>
                  ))}
                  <span className="text-xs text-muted-foreground">& more</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="px-4 py-8 max-w-4xl mx-auto">
          <div className="bg-muted/50 rounded-xl p-6 border border-border">
            <h2 className="text-lg font-bold text-foreground mb-3">More Resources</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/psw-directory" className="text-sm text-primary hover:underline">PSW Directory →</Link>
              <Link to="/psw-near-me" className="text-sm text-primary hover:underline">PSW Near Me →</Link>
              <Link to="/guides" className="text-sm text-primary hover:underline">Home Care Guides →</Link>
            </div>
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
              Proudly serving Toronto, the GTA, and communities across Ontario.
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

export default PSWOntarioDirectory;

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Briefcase } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";

const canonicalUrl = `${SITE_URL}/psw-work-areas-ontario`;
const title = "PSW Work Areas in Ontario | Where We're Hiring | PSW Direct";
const description = "See where PSW Direct is hiring personal support workers across Ontario. Join our team in Toronto, Mississauga, Brampton, Ottawa, and 20+ more cities.";

const regions = [
  {
    name: "Greater Toronto Area",
    cities: [
      { label: "Toronto", key: "toronto" },
      { label: "Mississauga", key: "mississauga" },
      { label: "Brampton", key: "brampton" },
      { label: "Vaughan", key: "vaughan" },
      { label: "Markham", key: "markham" },
      { label: "Richmond Hill", key: "richmond-hill" },
      { label: "Oakville", key: "oakville" },
      { label: "Burlington", key: "burlington" },
      { label: "Ajax", key: "ajax" },
      { label: "Pickering", key: "pickering" },
      { label: "Oshawa", key: "oshawa" },
    ],
  },
  {
    name: "Central Ontario",
    cities: [
      { label: "Barrie", key: "barrie" },
      { label: "Guelph", key: "guelph" },
      { label: "Peterborough", key: "peterborough" },
    ],
  },
  {
    name: "Golden Horseshoe",
    cities: [
      { label: "Hamilton", key: "hamilton" },
      { label: "St. Catharines", key: "st-catharines" },
      { label: "Niagara Falls", key: "niagara-falls" },
    ],
  },
  {
    name: "Southwestern Ontario",
    cities: [
      { label: "Kitchener", key: "kitchener" },
      { label: "Waterloo", key: "waterloo" },
      { label: "Cambridge", key: "cambridge" },
      { label: "London", key: "london" },
      { label: "Windsor", key: "windsor" },
    ],
  },
  {
    name: "Eastern Ontario",
    cities: [
      { label: "Ottawa", key: "ottawa" },
      { label: "Kingston", key: "kingston" },
    ],
  },
];

const PSWWorkAreasOntarioPage = () => {
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
            { name: "PSW Work Areas Ontario", url: canonicalUrl },
          ]))}
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
            <MapPin className="w-4 h-4" />
            25+ Cities
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">PSW Work Areas in Ontario</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct is actively hiring personal support workers across Ontario. Browse by region to find PSW job
            opportunities near you — earn $22–$28/hr with flexible scheduling and no contracts.
          </p>
          <Link to="/join-team">
            <Button size="lg" className="text-lg px-8 py-6">Apply to Join PSW Direct</Button>
          </Link>
        </section>

        {/* Regions */}
        <section className="px-4 pb-12">
          <div className="max-w-5xl mx-auto space-y-8">
            {regions.map((region) => (
              <div key={region.name} className="bg-card rounded-2xl p-6 border border-border">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  {region.name}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {region.cities.map((city) => (
                    <Link
                      key={city.key}
                      to={`/psw-jobs-${city.key}`}
                      className="bg-muted/50 rounded-lg p-3 text-center border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground"
                    >
                      {city.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Job Types */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-6">Browse by Job Type</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/private-psw-jobs" className="bg-card rounded-lg px-4 py-2 border border-border hover:border-primary transition-all text-sm font-medium text-foreground">
                Private PSW Jobs
              </Link>
              <Link to="/overnight-psw-jobs" className="bg-card rounded-lg px-4 py-2 border border-border hover:border-primary transition-all text-sm font-medium text-foreground">
                Overnight PSW Jobs
              </Link>
              <Link to="/24-hour-psw-jobs" className="bg-card rounded-lg px-4 py-2 border border-border hover:border-primary transition-all text-sm font-medium text-foreground">
                24-Hour PSW Jobs
              </Link>
              <Link to="/psw-part-time-jobs" className="bg-card rounded-lg px-4 py-2 border border-border hover:border-primary transition-all text-sm font-medium text-foreground">
                Part-Time PSW Jobs
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/psw-pay-calculator" className="text-primary hover:underline text-sm">Pay Calculator</Link>
            <Link to="/psw-agency-vs-private-pay" className="text-primary hover:underline text-sm">Agency vs Private Pay</Link>
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

export default PSWWorkAreasOntarioPage;

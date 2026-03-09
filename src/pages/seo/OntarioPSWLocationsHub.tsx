import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";

const regions = [
  {
    name: "Greater Toronto Area",
    cities: [
      { key: "toronto", label: "Toronto" },
      { key: "mississauga", label: "Mississauga" },
      { key: "brampton", label: "Brampton" },
      { key: "vaughan", label: "Vaughan" },
      { key: "markham", label: "Markham" },
      { key: "richmond-hill", label: "Richmond Hill" },
      { key: "ajax", label: "Ajax" },
      { key: "pickering", label: "Pickering" },
      { key: "oshawa", label: "Oshawa" },
      { key: "whitby", label: "Whitby" },
      { key: "newmarket", label: "Newmarket" },
      { key: "aurora", label: "Aurora" },
      { key: "courtice", label: "Courtice" },
    ],
  },
  {
    name: "Golden Horseshoe",
    cities: [
      { key: "hamilton", label: "Hamilton" },
      { key: "burlington", label: "Burlington" },
      { key: "oakville", label: "Oakville" },
      { key: "milton", label: "Milton" },
      { key: "georgetown", label: "Georgetown" },
      { key: "stoney-creek", label: "Stoney Creek" },
      { key: "dundas", label: "Dundas" },
      { key: "st-catharines", label: "St. Catharines" },
      { key: "niagara-falls", label: "Niagara Falls" },
      { key: "welland", label: "Welland" },
    ],
  },
  {
    name: "Simcoe & Central Ontario",
    cities: [
      { key: "barrie", label: "Barrie" },
      { key: "innisfil", label: "Innisfil" },
      { key: "orillia", label: "Orillia" },
      { key: "bradford", label: "Bradford" },
      { key: "alliston", label: "Alliston" },
      { key: "peterborough", label: "Peterborough" },
      { key: "cobourg", label: "Cobourg" },
      { key: "belleville", label: "Belleville" },
    ],
  },
  {
    name: "Tri-Cities & Southwestern Ontario",
    cities: [
      { key: "kitchener", label: "Kitchener" },
      { key: "waterloo", label: "Waterloo" },
      { key: "cambridge", label: "Cambridge" },
      { key: "guelph", label: "Guelph" },
      { key: "london", label: "London" },
      { key: "woodstock", label: "Woodstock" },
      { key: "windsor", label: "Windsor" },
    ],
  },
  {
    name: "Eastern Ontario",
    cities: [
      { key: "ottawa", label: "Ottawa" },
      { key: "kingston", label: "Kingston" },
    ],
  },
];

const allCities = regions.flatMap((r) => r.cities);

const services = [
  { key: "personal-care", label: "Personal Care" },
  { key: "companionship", label: "Companionship" },
  { key: "dementia-care", label: "Dementia Care" },
  { key: "alzheimers-care", label: "Alzheimer's Care" },
  { key: "overnight-care", label: "Overnight Care" },
  { key: "24-hour-home-care", label: "24-Hour Home Care" },
  { key: "post-surgery-care", label: "Post-Surgery Care" },
  { key: "palliative-care", label: "Palliative Care" },
  { key: "respite-care", label: "Respite Care" },
  { key: "senior-home-care", label: "Senior Home Care" },
  { key: "mobility-support", label: "Mobility Support" },
  { key: "doctor-escort", label: "Doctor Escort" },
];

const title = "Ontario PSW Locations | Find Personal Support Workers Near You";
const description =
  "Browse all Ontario cities served by PSW Direct. Find vetted Personal Support Workers in Toronto, Mississauga, Barrie, Hamilton, Ottawa, and 35+ communities across Ontario.";
const canonicalUrl = `${SITE_URL}/ontario-psw-locations`;

const OntarioPSWLocationsHub = () => (
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
          { name: "Ontario PSW Locations", url: canonicalUrl },
        ]))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "PSW Direct — Ontario Service Locations",
          description,
          numberOfItems: allCities.length,
          itemListElement: allCities.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `Personal Support Workers in ${c.label}`,
            url: `${SITE_URL}/psw-${c.key}`,
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
          Ontario PSW Locations
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          PSW Direct serves 40+ communities across Ontario with vetted, credential-verified
          Personal Support Workers. Select your city below to find caregivers near you —
          personal care, companionship, dementia support, and more starting at $30/hour.
        </p>
      </section>

      {/* Regions — City Pages */}
      {regions.map((region) => (
        <section key={region.name} className="px-4 pb-10 max-w-6xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">{region.name}</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {region.cities.map((city) => (
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
          {/* Home care links per region */}
          <div className="mt-3 flex flex-wrap gap-2">
            {region.cities.map((city) => (
              <Link key={`hc-${city.key}`} to={`/home-care-${city.key}`} className="text-xs text-primary hover:underline">
                Home Care {city.label}
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Service pages by city — full cross-link grid */}
      <section className="px-4 pb-12 max-w-6xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">
          Specialized Care Services by City
        </h2>
        {services.map((service) => (
          <details key={service.key} className="mb-4 border border-border rounded-xl bg-card">
            <summary className="cursor-pointer px-5 py-3 font-semibold text-foreground text-sm hover:text-primary transition-colors">
              {service.label} — All Cities
            </summary>
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              {allCities.map((city) => (
                <Link
                  key={`${service.key}-${city.key}`}
                  to={`/${service.key}-${city.key}`}
                  className="text-xs text-primary hover:underline bg-muted px-2 py-1 rounded-full"
                >
                  {service.label} in {city.label}
                </Link>
              ))}
            </div>
          </details>
        ))}
      </section>

      {/* Emergency & same-day care links */}
      <section className="px-4 pb-12 max-w-6xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
          Urgent & Same-Day Care
        </h2>
        <div className="flex flex-wrap gap-2">
          {allCities.map((city) => (
            <span key={city.key} className="inline-flex gap-1">
              <Link to={`/urgent-home-care-${city.key}`} className="text-xs text-primary hover:underline bg-muted px-2 py-1 rounded-full">
                Urgent {city.label}
              </Link>
              <Link to={`/same-day-home-care-${city.key}`} className="text-xs text-primary hover:underline bg-muted px-2 py-1 rounded-full">
                Same-Day {city.label}
              </Link>
            </span>
          ))}
        </div>
      </section>

      {/* PSW Jobs links */}
      <section className="px-4 pb-12 max-w-6xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
          PSW Jobs by City
        </h2>
        <div className="flex flex-wrap gap-2">
          {allCities.map((city) => (
            <Link key={city.key} to={`/psw-jobs-${city.key}`} className="text-xs text-primary hover:underline bg-muted px-2 py-1 rounded-full">
              PSW Jobs {city.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Question / Cost Pages */}
      <section className="px-4 pb-12 max-w-6xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
          Common Questions About PSW Care
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { slug: "how-much-does-a-psw-cost-toronto", label: "How Much Does a PSW Cost in Toronto?" },
            { slug: "psw-hourly-rate-ontario", label: "PSW Hourly Rate in Ontario" },
            { slug: "what-does-a-psw-do", label: "What Does a PSW Do?" },
            { slug: "is-a-psw-covered-by-insurance-ontario", label: "Is a PSW Covered by Insurance?" },
            { slug: "psw-vs-home-care-worker-ontario", label: "PSW vs Home Care Worker" },
            { slug: "overnight-psw-cost-toronto", label: "Overnight PSW Cost in Toronto" },
            { slug: "dementia-care-cost-ontario", label: "Dementia Care Cost in Ontario" },
            { slug: "how-to-hire-a-psw-barrie", label: "How to Hire a PSW in Barrie" },
          ].map((q) => (
            <Link key={q.slug} to={`/${q.slug}`} className="text-sm text-primary hover:underline bg-muted px-3 py-2 rounded-lg">
              {q.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Cross-links */}
      <section className="px-4 py-8 max-w-4xl mx-auto">
        <div className="bg-muted/50 rounded-xl p-6 border border-border">
          <h2 className="text-lg font-bold text-foreground mb-3">More Resources</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/personal-support-workers-ontario" className="text-sm text-primary hover:underline">PSW Ontario Directory →</Link>
            <Link to="/psw-directory" className="text-sm text-primary hover:underline">PSW Directory →</Link>
            <Link to="/coverage" className="text-sm text-primary hover:underline">Coverage Map →</Link>
            <Link to="/home-care-ontario" className="text-sm text-primary hover:underline">Home Care Ontario →</Link>
            <Link to="/guides" className="text-sm text-primary hover:underline">Home Care Guides →</Link>
            <Link to="/psw-pay-calculator" className="text-sm text-primary hover:underline">PSW Pay Calculator →</Link>
            <Link to="/psw-agency-vs-private-pay" className="text-sm text-primary hover:underline">Agency vs Private Pay →</Link>
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

export default OntarioPSWLocationsHub;

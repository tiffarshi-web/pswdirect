import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, buildProfessionalService } from "@/lib/seoUtils";

const cities = [
  "Toronto", "Mississauga", "Brampton", "Vaughan", "Markham", "Richmond Hill",
  "Oakville", "Burlington", "Ajax", "Pickering", "Oshawa", "Whitby", "Barrie",
  "Hamilton", "Kitchener", "Waterloo", "Cambridge", "London", "Windsor",
  "St. Catharines", "Niagara Falls", "Guelph", "Kingston", "Peterborough", "Ottawa",
];

const services = [
  { label: "Dementia Care", key: "dementia-care" },
  { label: "Alzheimer's Care", key: "alzheimers-care" },
  { label: "Overnight Care", key: "overnight-care" },
  { label: "24-Hour Home Care", key: "24-hour-home-care" },
  { label: "Post-Surgery Care", key: "post-surgery-care" },
  { label: "Palliative Care", key: "palliative-care" },
  { label: "Respite Care", key: "respite-care" },
  { label: "Senior Home Care", key: "senior-home-care" },
  { label: "Personal Care", key: "personal-care" },
  { label: "Companionship", key: "companionship" },
  { label: "Mobility Support", key: "mobility-support" },
  { label: "Doctor Escort", key: "doctor-escort" },
];

const toSlug = (city: string) => city.toLowerCase().replace(/[\s.]+/g, "-");

const canonicalUrl = `${SITE_URL}/home-care-ontario`;
const title = "Home Care in Ontario | Personal Support Workers | PSW Direct";
const description = "Find affordable home care across Ontario. PSW Direct connects families with vetted personal support workers in 25+ cities. Book online starting at $35/hr.";

const faqItems = [
  { q: "How much does a PSW cost in Ontario?", a: "PSW Direct starts at $35 per hour. Traditional agencies charge $55+. No contracts or commitments required." },
  { q: "What services does a personal support worker provide?", a: "PSWs provide personal care, companionship, mobility support, meal preparation, medication reminders, doctor escorts, and hospital discharge support." },
  { q: "Can I hire a PSW privately?", a: "Yes. PSW Direct connects families directly with vetted, credential-verified personal support workers — no agency middleman." },
  { q: "Is 24-hour home care available?", a: "Yes. PSW Direct offers flexible scheduling including overnight care and 24-hour home care across Ontario." },
];

const HomeCareOntarioPage = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

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
            { name: "Home Care Ontario", url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildProfessionalService())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HomeHealthService",
            name: "PSW Direct — Home Care Ontario",
            description: "Affordable home care across Ontario. Vetted personal support workers for senior care, in-home care, and companionship.",
            url: canonicalUrl,
            telephone: "+1-249-288-4787",
            priceRange: "$35-$45",
            serviceType: ["Home Care", "Senior Care", "In-Home Care", "Personal Support Worker", "Private Caregiver"],
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
              <a href="tel:2492884787" className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">(249) 288-4787</span>
              </a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            25+ Cities Across Ontario
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Home Care in Ontario
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct connects Ontario families with vetted personal support workers for affordable, flexible home care.
            Browse by city or service type to find a caregiver near you — starting at $35 per hour with no contracts.
          </p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
        </section>

        {/* Cities Grid */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Find Home Care by City
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {cities.map((city) => (
                <Link
                  key={city}
                  to={`/home-care-${toSlug(city)}`}
                  className="bg-card rounded-lg p-3 text-center border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Browse by Service Type
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {services.map(({ label, key }) => (
                <Link
                  key={key}
                  to={`/${key}-toronto`}
                  className="bg-card rounded-lg p-3 text-center border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Emergency Links */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-6">Need Care Urgently?</h2>
            <p className="text-muted-foreground mb-6">We also serve families needing same-day or urgent home care across Ontario.</p>
            <div className="flex flex-wrap justify-center gap-3">
              {["Toronto", "Mississauga", "Brampton", "Hamilton", "Ottawa"].map((city) => (
                <Link
                  key={city}
                  to={`/urgent-home-care-${toSlug(city)}`}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Urgent Care in {city}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-12">
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

        {/* Pricing */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Transparent Pricing</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">$35/hr</p>
                <p className="text-muted-foreground text-sm">Home Care — agencies charge $55+</p>
              </div>
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">$35/hr</p>
                <p className="text-muted-foreground text-sm">Doctor Escort Services</p>
              </div>
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">No Contract</p>
                <p className="text-muted-foreground text-sm">Book by the hour, cancel anytime</p>
              </div>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="px-4 py-12 max-w-4xl mx-auto text-center">
          <h2 className="text-lg font-bold text-foreground mb-3">Common Questions</h2>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <Link to="/how-much-does-a-psw-cost-toronto" className="text-primary hover:underline text-sm">PSW Cost Toronto</Link>
            <Link to="/psw-hourly-rate-ontario" className="text-primary hover:underline text-sm">PSW Hourly Rate Ontario</Link>
            <Link to="/what-does-a-psw-do" className="text-primary hover:underline text-sm">What Does a PSW Do?</Link>
            <Link to="/is-a-psw-covered-by-insurance-ontario" className="text-primary hover:underline text-sm">Insurance Coverage</Link>
            <Link to="/dementia-care-cost-ontario" className="text-primary hover:underline text-sm">Dementia Care Cost</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/psw-directory" className="text-primary hover:underline text-sm">PSW Directory</Link>
            <Link to="/personal-support-workers-ontario" className="text-primary hover:underline text-sm">PSWs in Ontario</Link>
            <Link to="/ontario-psw-locations" className="text-primary hover:underline text-sm">Ontario Locations Hub</Link>
            <Link to="/psw-near-me" className="text-primary hover:underline text-sm">PSW Near Me</Link>
            <Link to="/senior-care-near-me" className="text-primary hover:underline text-sm">Senior Care Near Me</Link>
            <Link to="/private-caregiver" className="text-primary hover:underline text-sm">Private Caregiver</Link>
            <Link to="/in-home-care-ontario" className="text-primary hover:underline text-sm">In-Home Care Ontario</Link>
            <Link to="/guides" className="text-primary hover:underline text-sm">Home Care Guides</Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">Proudly serving 25+ communities across Ontario.</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomeCareOntarioPage;

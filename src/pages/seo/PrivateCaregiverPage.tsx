import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { SEO_CITIES } from "@/lib/seoCityData";
import { buildFAQSchema } from "@/lib/seoShared";

const canonicalUrl = `${SITE_URL}/private-caregiver`;
const title = "Private Caregiver in Ontario | Hire a Personal Caregiver | PSW Direct";
const description = "Hire a private caregiver in Ontario without agency fees. PSW Direct connects families with vetted personal support workers for affordable in-home care from $30/hr.";

const faqs = [
  { question: "How do I hire a private caregiver in Ontario?", answer: "Visit PSWDIRECT.CA, post your care needs, and get matched with a vetted caregiver. No agency middleman, no contracts — book by the hour." },
  { question: "How much does a private caregiver cost?", answer: "Private caregivers through PSW Direct start at $30/hr — significantly less than the $55+/hr charged by traditional agencies." },
  { question: "Are private caregivers vetted?", answer: "Yes. All PSW Direct caregivers are credential-verified with police checks on file before being approved on the platform." },
  { question: "What's the difference between a private caregiver and an agency?", answer: "A private caregiver works directly with your family. PSW Direct handles vetting and matching while eliminating agency overhead, resulting in lower costs and more personalized care." },
];

const topCities = SEO_CITIES.slice(0, 25);

const PrivateCaregiverPage = () => (
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
          { name: "Private Caregiver", url: canonicalUrl },
        ]))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(buildFAQSchema(faqs))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HomeHealthService",
          name: "PSW Direct — Private Caregiver",
          description: "Hire a private caregiver in Ontario. Vetted personal support workers for in-home care.",
          url: canonicalUrl,
          telephone: "+1-249-288-4787",
          priceRange: "$30-$35",
          serviceType: ["Private Caregiver", "In-Home Caregiver", "Personal Support Worker", "Home Care"],
          areaServed: { "@type": "AdministrativeArea", name: "Ontario, Canada" },
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
          <MapPin className="w-4 h-4" />
          No Agency Fees
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Hire a Private Caregiver in Ontario</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
          Skip the agency. PSW Direct connects Ontario families directly with vetted personal support workers for affordable, flexible
          in-home care — starting at $30/hr with no contracts or hidden fees.
        </p>
        <a href="https://pswdirect.ca/">
          <Button size="lg" className="text-lg px-8 py-6">Find a Private Caregiver</Button>
        </a>
      </section>

      <section className="bg-muted/50 px-4 py-12 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Find a Private Caregiver by City</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {topCities.map((city) => (
              <Link key={city.key} to={`/private-caregiver-${city.key}`} className="bg-card rounded-lg p-3 text-center border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground">
                {city.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Why Hire a Private Caregiver?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <p className="text-primary text-3xl font-bold mb-2">$30/hr</p>
              <p className="text-muted-foreground text-sm">vs $55+/hr at agencies</p>
            </div>
            <div className="text-center p-6">
              <p className="text-primary text-3xl font-bold mb-2">No Contract</p>
              <p className="text-muted-foreground text-sm">Book by the hour, cancel anytime</p>
            </div>
            <div className="text-center p-6">
              <p className="text-primary text-3xl font-bold mb-2">Vetted</p>
              <p className="text-muted-foreground text-sm">Police-checked & credential-verified</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/50 px-4 py-12 border-y border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((f, i) => (
              <div key={i} className="bg-card rounded-xl p-5 border border-border">
                <h3 className="font-semibold text-foreground mb-2">{f.question}</h3>
                <p className="text-sm text-muted-foreground">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 max-w-4xl mx-auto text-center">
        <h2 className="text-lg font-bold text-foreground mb-3">Related Pages</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/home-care-ontario" className="text-primary hover:underline text-sm">Home Care Ontario</Link>
          <Link to="/senior-care-near-me" className="text-primary hover:underline text-sm">Senior Care Near Me</Link>
          <Link to="/in-home-care-ontario" className="text-primary hover:underline text-sm">In-Home Care Ontario</Link>
          <Link to="/psw-near-me" className="text-primary hover:underline text-sm">PSW Near Me</Link>
          <Link to="/psw-directory" className="text-primary hover:underline text-sm">PSW Directory</Link>
          <Link to="/psw-agency-vs-private-pay" className="text-primary hover:underline text-sm">Agency vs Private Pay</Link>
        </div>
      </section>

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

export default PrivateCaregiverPage;

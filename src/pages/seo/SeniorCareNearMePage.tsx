import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { SEO_CITIES } from "@/lib/seoCityData";
import { buildFAQSchema } from "@/lib/seoShared";

const canonicalUrl = `${SITE_URL}/senior-care-near-me`;
const title = "Senior Care Near Me | Find In-Home Caregivers | PSW Direct";
const description = "Find trusted senior care near you in Ontario. PSW Direct connects families with vetted caregivers for elderly home care, companionship, and personal support — starting at $30/hr.";

const faqs = [
  { question: "How do I find senior care near me?", answer: "PSW Direct connects Ontario families with vetted personal support workers who specialize in senior care. Visit PSWDIRECT.CA to find caregivers in your area — no contracts required." },
  { question: "How much does senior home care cost?", answer: "Senior home care through PSW Direct starts at $30/hr. Traditional agencies charge $55+. No hidden fees or long-term commitments." },
  { question: "What does a senior caregiver do?", answer: "Senior caregivers provide companionship, personal care, mobility support, medication reminders, meal preparation, and accompaniment to medical appointments." },
  { question: "Can I hire a private caregiver for my elderly parent?", answer: "Yes. PSW Direct lets you hire vetted, credential-verified caregivers directly — no agency middleman. Book online in minutes." },
];

const topCities = SEO_CITIES.slice(0, 25);

const SeniorCareNearMePage = () => (
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
          { name: "Senior Care Near Me", url: canonicalUrl },
        ]))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(buildFAQSchema(faqs))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HomeHealthService",
          name: "PSW Direct — Senior Care",
          description: "Find senior care and elderly home care services near you in Ontario.",
          url: canonicalUrl,
          telephone: "+1-249-288-4787",
          priceRange: "$30-$35",
          serviceType: ["Senior Care", "Elderly Home Care", "In-Home Caregiver", "Companionship"],
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
          25+ Cities Across Ontario
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Senior Care Near Me</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
          Find trusted, affordable senior care in your area. PSW Direct connects Ontario families with vetted personal support workers
          for elderly home care, companionship, mobility support, and more — starting at $30/hr with no contracts.
        </p>
        <a href="https://pswdirect.ca/">
          <Button size="lg" className="text-lg px-8 py-6">Book Senior Care Now</Button>
        </a>
      </section>

      <section className="bg-muted/50 px-4 py-12 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Find Senior Care by City</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {topCities.map((city) => (
              <Link key={city.key} to={`/senior-care-${city.key}`} className="bg-card rounded-lg p-3 text-center border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground">
                {city.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
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
          <Link to="/in-home-care-ontario" className="text-primary hover:underline text-sm">In-Home Care Ontario</Link>
          <Link to="/private-caregiver" className="text-primary hover:underline text-sm">Private Caregiver</Link>
          <Link to="/psw-near-me" className="text-primary hover:underline text-sm">PSW Near Me</Link>
          <Link to="/home-care-near-me" className="text-primary hover:underline text-sm">Home Care Near Me</Link>
          <Link to="/psw-directory" className="text-primary hover:underline text-sm">PSW Directory</Link>
          <Link to="/guides" className="text-primary hover:underline text-sm">Care Guides</Link>
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

export default SeniorCareNearMePage;

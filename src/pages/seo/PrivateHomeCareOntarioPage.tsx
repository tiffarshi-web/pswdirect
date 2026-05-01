import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Globe, Shield, Clock } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, buildProfessionalService } from "@/lib/seoUtils";
import { SEO_CITIES, cityToSlug, getNearbyCities } from "@/lib/seoCityData";

const PRIVATE_HC_CITIES = [
  "Toronto", "Mississauga", "Brampton", "Vaughan", "Markham",
  "Hamilton", "Ottawa", "London", "Barrie", "Richmond Hill",
  "Oakville", "Burlington", "Kitchener", "Waterloo", "Guelph",
  "Oshawa", "Whitby", "Ajax", "Pickering", "Newmarket",
  "Aurora", "Milton", "Cambridge", "Windsor", "Kingston",
];

const LANGUAGES = [
  "Punjabi", "Hindi", "Urdu", "Tagalog", "Arabic", "Mandarin", "Spanish",
  "Tamil", "Gujarati", "Italian", "Portuguese", "French", "Vietnamese",
  "Russian", "Polish", "Greek", "Korean", "Japanese", "Bengali", "Malayalam",
  "Telugu", "Marathi", "Sinhala", "Nepali", "Somali", "Amharic", "Turkish",
  "German", "Dutch", "Thai", "Khmer", "Indonesian",
];

const canonicalUrl = `${SITE_URL}/private-home-care-ontario`;
const title = "Private Home Care Services Across Ontario | PSW Direct";
const description = "Find affordable home care across Ontario. PSW Direct connects families with vetted personal support workers and caregivers in 25+ cities. No contracts, starting at $35/hr.";

const faqItems = [
  { q: "What is home care?", a: "Private home care is personalized in-home support provided by a personal support worker (PSW) or caregiver, hired directly rather than through a traditional agency. PSW Direct connects families with vetted caregivers across Ontario starting at $35/hr." },
  { q: "How much does home care cost in Ontario?", a: "Private home care through PSW Direct starts at $35 per hour — nearly half the cost of traditional agencies which charge $55+. There are no contracts, sign-up fees, or hidden charges." },
  { q: "Can I hire a private caregiver in Ontario?", a: "Yes. PSW Direct allows families across Ontario to hire a vetted, credential-verified personal support worker directly. All caregivers are police-checked and certified." },
  { q: "Is private nursing care at home available?", a: "PSW Direct provides personal support workers for non-medical in-home care including personal hygiene, mobility support, meal prep, medication reminders, companionship, and post-surgery recovery." },
];

const PrivateHomeCareOntarioPage = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "PSW Direct",
    description: "Private home care services across Ontario. Vetted personal support workers for seniors, in-home caregivers, and private nursing care at home.",
    url: SITE_URL,
    telephone: "+1-249-288-4787",
    priceRange: "$35-$45",
    address: { "@type": "PostalAddress", addressRegion: "ON", addressCountry: "CA" },
    areaServed: { "@type": "AdministrativeArea", name: "Ontario, Canada" },
  };

  const homeCareServiceJsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeHealthService",
    name: "PSW Direct — Private Home Care Ontario",
    description: "Affordable home care and personal support worker services across Ontario.",
    url: canonicalUrl,
    telephone: "+1-249-288-4787",
    priceRange: "$35-$45",
    serviceType: ["Private Home Care", "Personal Support Worker", "In-Home Caregiver", "Private Nursing Care at Home", "Senior Home Care"],
    areaServed: { "@type": "AdministrativeArea", name: "Ontario, Canada" },
    provider: localBusinessJsonLd,
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
        <script type="application/ld+json">{JSON.stringify(buildBreadcrumbList([
          { name: "Home", url: SITE_URL },
          { name: "Home Care Ontario", url: canonicalUrl },
        ]))}</script>
        <script type="application/ld+json">{JSON.stringify(localBusinessJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(homeCareServiceJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
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
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Private Home Care Services Across Ontario
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct connects Ontario families with vetted personal support workers and private caregivers
            for affordable, flexible home care services. Whether you need a private caregiver for a few hours
            or full-time private nursing care at home, we make it simple — starting at $35/hr with no contracts.
          </p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
        </section>

        {/* What We Offer */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              Why Choose Private Home Care with PSW Direct?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl p-6 border border-border text-center">
                <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Vetted Caregivers</h3>
                <p className="text-sm text-muted-foreground">Every personal support worker is credential-verified, police-checked, and approved before joining our platform.</p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border text-center">
                <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Flexible Scheduling</h3>
                <p className="text-sm text-muted-foreground">Book home care by the hour. No long-term contracts, no minimum commitments. Cancel anytime.</p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border text-center">
                <Globe className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">35+ Languages</h3>
                <p className="text-sm text-muted-foreground">Find a private caregiver who speaks your loved one's language for culturally sensitive in-home care.</p>
              </div>
            </div>
            <div className="text-center mt-6">
              <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                Private home care through PSW Direct eliminates the overhead of traditional agencies.
                Families across Ontario can hire a personal support worker online starting at $35 per hour —
                compared to $55+ at conventional home care agencies. Our in-home caregivers provide
                companionship, personal hygiene assistance, meal preparation, mobility support, medication
                reminders, post-hospital recovery care, overnight supervision, and doctor escort services.
              </p>
            </div>
          </div>
        </section>

        {/* City Grid */}
        <section className="px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Find Private Home Care by City
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {PRIVATE_HC_CITIES.map((city) => (
                <Link
                  key={city}
                  to={`/private-home-care-${cityToSlug(city)}`}
                  className="bg-card rounded-lg p-3 text-center border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Language Section */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Globe className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Multilingual Private Caregivers Across Ontario</h2>
            </div>
            <p className="text-muted-foreground text-center leading-relaxed mb-4">
              PSW Direct's private caregivers speak 35+ languages, making it easy for Ontario families
              to find an in-home caregiver who communicates in their preferred language.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              <strong className="text-foreground">Languages available:</strong>{" "}
              {LANGUAGES.join(", ")}, and more.
            </p>
          </div>
        </section>

        {/* Areas We Serve */}
        <section className="px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Areas We Serve in Ontario</h2>
            <p className="text-muted-foreground text-center mb-8">
              Our 75km service radius means each personal support worker covers their city and surrounding
              communities. Private home care is available across the Greater Toronto Area, Hamilton,
              Niagara Region, Barrie, Kitchener-Waterloo, Ottawa, London, and more.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRIVATE_HC_CITIES.slice(0, 9).map((city) => {
                const nearby = getNearbyCities(city);
                return (
                  <div key={city} className="bg-card rounded-lg p-4 border border-border">
                    <h3 className="font-semibold text-foreground mb-2">
                      <Link to={`/private-home-care-${cityToSlug(city)}`} className="hover:text-primary">
                        {city}
                      </Link>
                    </h3>
                    {nearby.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Also serving: {nearby.slice(0, 6).join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Private Home Care — Frequently Asked Questions
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
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Transparent Pricing</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">$35/hr</p>
                <p className="text-muted-foreground text-sm">Private Home Care — agencies charge $55+</p>
              </div>
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">$35/hr</p>
                <p className="text-muted-foreground text-sm">Doctor Escort &amp; Transport Services</p>
              </div>
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">No Contract</p>
                <p className="text-muted-foreground text-sm">Book by the hour, cancel anytime</p>
              </div>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="bg-muted/50 px-4 py-10 border-t border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-lg font-bold text-foreground mb-4">Private Home Care Across Ontario</h2>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-6">
              {PRIVATE_HC_CITIES.map((city) => (
                <Link key={city} to={`/private-home-care-${cityToSlug(city)}`} className="text-sm text-primary hover:underline">
                  Private Home Care in {city}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/home-care-ontario" className="text-primary hover:underline text-sm">Private Home Care Ontario</Link>
              <Link to="/psw-directory" className="text-primary hover:underline text-sm">PSW Directory</Link>
              <Link to="/senior-care-near-me" className="text-primary hover:underline text-sm">Senior Care Near Me</Link>
              <Link to="/in-home-care-ontario" className="text-primary hover:underline text-sm">In-Home Care Ontario</Link>
              <Link to="/private-caregiver" className="text-primary hover:underline text-sm">Private Caregiver</Link>
              <Link to="/coverage" className="text-primary hover:underline text-sm">Coverage Map</Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Hire a Private Caregiver?</h2>
          <p className="text-muted-foreground mb-6">Book a vetted personal support worker in minutes — no agency fees, no contracts.</p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">Book Now — Starting at $35/hr</Button>
          </a>
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

export default PrivateHomeCareOntarioPage;

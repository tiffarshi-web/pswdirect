import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Globe, Shield, Clock } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { getNearbyCities, cityToSlug } from "@/lib/seoCityData";

interface Props {
  city: string;
  slug: string;
}

const buildCityFAQs = (city: string) => [
  { q: `What is private home care in ${city}?`, a: `Private home care in ${city} is personalized in-home support provided by a vetted personal support worker (PSW) hired directly through PSW Direct — without agency middlemen. Services include personal hygiene assistance, meal preparation, medication reminders, mobility support, and companionship.` },
  { q: `How much does private home care cost in ${city}?`, a: `Private home care in ${city} through PSW Direct starts at $30 per hour — compared to $55+ at traditional agencies. There are no contracts, no sign-up fees, and no hidden charges.` },
  { q: `How do I hire an in-home caregiver in ${city}?`, a: `Visit PSW Direct's booking page, enter your care needs and ${city} location, and get matched with a credential-verified personal support worker. You can book by the hour with no minimum commitment.` },
  { q: `Are private caregivers in ${city} background-checked?`, a: `Yes. Every personal support worker on PSW Direct serving ${city} is police-checked, credential-verified, and vetted before being approved to provide private home care services.` },
  { q: `Can I find a multilingual caregiver in ${city}?`, a: `Absolutely. PSW Direct's private caregivers in ${city} speak 35+ languages including Punjabi, Hindi, Urdu, Tagalog, Arabic, Mandarin, and many more. You can request a caregiver who speaks your preferred language when booking.` },
];

const LANGUAGES = [
  "Punjabi", "Hindi", "Urdu", "Tagalog", "Arabic", "Mandarin", "Spanish",
  "Tamil", "Gujarati", "Italian", "Portuguese", "French", "Vietnamese",
  "Russian", "Polish", "Greek", "Korean", "Japanese", "Bengali", "Malayalam",
  "Telugu", "Marathi", "Sinhala", "Nepali", "Somali", "Amharic", "Turkish",
  "German", "Dutch", "Thai", "Khmer", "Indonesian",
];

const LINK_CITIES = [
  "Toronto", "Mississauga", "Brampton", "Vaughan", "Markham",
  "Hamilton", "Ottawa", "London", "Barrie",
];

const PrivateHomeCareCityPage = ({ city, slug }: Props) => {
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const title = `Private Home Care in ${city} | In-Home Caregiver | PSW Direct`;
  const description = `Find affordable private home care in ${city}. PSW Direct connects families with vetted personal support workers and in-home caregivers. Starting at $30/hr, no contracts.`;
  const nearbyCities = getNearbyCities(city);
  const faqItems = buildCityFAQs(city);

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
    name: `PSW Direct — Private Home Care ${city}`,
    description: `Private home care and personal support worker services in ${city}, Ontario.`,
    url: canonicalUrl,
    telephone: "+1-249-288-4787",
    priceRange: "$30-$35",
    address: { "@type": "PostalAddress", addressLocality: city, addressRegion: "ON", addressCountry: "CA" },
    areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } },
  };

  const homeCareServiceJsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeHealthService",
    name: `PSW Direct — Private Home Care ${city}`,
    description: `Affordable private home care, in-home caregiver, and personal support worker services in ${city}.`,
    url: canonicalUrl,
    telephone: "+1-249-288-4787",
    priceRange: "$30-$35",
    serviceType: ["Private Home Care", "In-Home Caregiver", "Personal Support Worker", "Private Nursing Care at Home", "Home Care Services"],
    areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } },
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
          { name: "Private Home Care Ontario", url: `${SITE_URL}/private-home-care-ontario` },
          { name: `Private Home Care ${city}`, url: canonicalUrl },
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
            {city}, Ontario
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Private Home Care Services in {city}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct provides private home care and in-home caregiver support for seniors,
            individuals recovering from surgery, and anyone needing assistance with daily living
            in {city}. Hire a PSW starting at $30/hr — no contracts, no agency fees.
          </p>
          <a href="https://psadirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker in {city}
            </Button>
          </a>
        </section>

        {/* Main Content */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Why Choose Private Home Care in {city}?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                As a private caregiver service, PSW Direct eliminates the overhead of traditional
                home care agencies. Families in {city} can book a personal support worker online
                starting at $30 per hour — compared to $55+ at conventional agencies. There are
                no long-term contracts, no hidden fees, and every in-home caregiver on our platform
                is credential-verified and police-checked before being approved.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our private home care services in {city} include companionship, personal hygiene
                assistance, meal preparation, mobility support, medication reminders, post-hospital
                recovery care, overnight supervision, and doctor escort services. If you need to
                hire a PSW in {city}, PSW Direct makes it simple — post your care needs, get
                matched with an available in-home personal support worker, and care begins at your
                scheduled time.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl p-5 border border-border text-center">
                <Shield className="w-7 h-7 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Vetted &amp; Verified</h3>
                <p className="text-xs text-muted-foreground">Police-checked, credential-verified personal support workers</p>
              </div>
              <div className="bg-card rounded-xl p-5 border border-border text-center">
                <Clock className="w-7 h-7 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Book by the Hour</h3>
                <p className="text-xs text-muted-foreground">No contracts or minimums — private home care on your schedule</p>
              </div>
              <div className="bg-card rounded-xl p-5 border border-border text-center">
                <Globe className="w-7 h-7 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-foreground mb-1">35+ Languages</h3>
                <p className="text-xs text-muted-foreground">Multilingual in-home caregivers serving {city}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Language Coverage */}
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Multilingual Private Caregivers in {city}
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                PSW Direct's private caregivers in {city} speak 35+ languages, making it easier for
                families to find a personal support worker who communicates in their preferred
                language. Whether you need a Punjabi caregiver in {city}, an Urdu-speaking PSW,
                or a Tagalog home care worker, our multilingual team is here to help.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Languages available:</strong>{" "}
                {LANGUAGES.join(", ")}, and more.
              </p>
            </div>
          </div>
        </section>

        {/* Areas We Serve */}
        {nearbyCities.length > 0 && (
          <section className="bg-muted/50 px-4 py-12 border-y border-border">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
                Areas We Serve Near {city}
              </h2>
              <p className="text-muted-foreground text-center mb-6">
                Our 75km service radius means private home care from PSW Direct covers {city} and
                surrounding communities:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {nearbyCities.map((nc) => (
                  <span key={nc} className="bg-card px-3 py-1.5 rounded-full text-sm border border-border text-foreground">
                    {nc}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing */}
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Private Home Care Pricing in {city}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">$30/hr</p>
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

        {/* FAQ */}
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              Frequently Asked Questions About Private Home Care in {city}
            </h2>
            <div className="space-y-4">
              {faqItems.map((f, i) => (
                <div key={i} className="bg-card rounded-xl p-5 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary/5 px-4 py-12 text-center border-y border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Hire a Private Caregiver in {city}?</h2>
          <p className="text-muted-foreground mb-6">Book a vetted personal support worker in minutes.</p>
          <a href="https://psadirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">Book Now — Starting at $30/hr</Button>
          </a>
        </section>

        {/* Internal Links */}
        <section className="px-4 py-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-lg font-bold text-foreground mb-4">Private Home Care Across Ontario</h2>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
              <Link to="/private-home-care-services" className="text-sm text-primary hover:underline font-medium">
                Private Home Care Services
              </Link>
              <Link to="/private-home-care-ontario" className="text-sm text-primary hover:underline font-medium">
                Private Home Care in Ontario
              </Link>
              {LINK_CITIES.filter((c) => c !== city).map((c) => (
                <Link key={c} to={`/private-home-care-${cityToSlug(c)}`} className="text-sm text-primary hover:underline">
                  Private Home Care in {c}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to={`/psw-${cityToSlug(city)}`} className="text-xs text-muted-foreground hover:text-primary hover:underline">PSWs in {city}</Link>
              <Link to={`/home-care-${cityToSlug(city)}`} className="text-xs text-muted-foreground hover:text-primary hover:underline">Home Care in {city}</Link>
              <Link to="/psw-directory" className="text-xs text-muted-foreground hover:text-primary hover:underline">PSW Directory</Link>
              <Link to="/coverage" className="text-xs text-muted-foreground hover:text-primary hover:underline">Coverage Map</Link>
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
            <p className="text-sm opacity-80 mb-2">Proudly serving 25+ communities across Ontario.</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PrivateHomeCareCityPage;

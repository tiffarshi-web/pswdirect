import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Globe, Shield, Clock, Heart, Users } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { cityToSlug } from "@/lib/seoCityData";

const CITIES = [
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
  "Telugu", "Marathi", "Nepali", "Somali", "Amharic", "Turkish",
  "German", "Dutch", "Thai", "Khmer", "Indonesian",
];

const SERVICES = [
  { name: "Personal Hygiene Assistance", desc: "Bathing, grooming, and toileting support with dignity and respect." },
  { name: "Meal Preparation", desc: "Nutritious meals tailored to dietary needs and cultural preferences." },
  { name: "Medication Reminders", desc: "Timely reminders to ensure medications are taken as prescribed." },
  { name: "Mobility Support", desc: "Safe transfers, walking assistance, and fall prevention." },
  { name: "Companionship Care", desc: "Meaningful social interaction, conversation, and emotional support." },
  { name: "Post-Surgery Recovery", desc: "Attentive care during recovery from hospital procedures." },
  { name: "Overnight Supervision", desc: "Peace of mind with a caregiver present through the night." },
  { name: "Doctor Escort Services", desc: "Transportation and accompaniment to medical appointments." },
];

const faqItems = [
  { q: "What home care services does PSW Direct offer?", a: "PSW Direct offers a full range of home care services including personal hygiene assistance, meal preparation, medication reminders, mobility support, companionship, post-surgery recovery care, overnight supervision, and doctor escort services. All care is provided by vetted personal support workers." },
  { q: "How much do home care services cost?", a: "Private home care services through PSW Direct start at $30 per hour — significantly less than the $55+ charged by traditional home care agencies. There are no contracts, no sign-up fees, and no hidden charges." },
  { q: "How do I hire a private caregiver through PSW Direct?", a: "Simply visit our booking page, enter your care needs, preferred schedule, and location. PSW Direct will match you with a vetted, credential-verified personal support worker in your area. You can book by the hour with no long-term commitment." },
  { q: "Are your home care workers background-checked?", a: "Yes. Every personal support worker on PSW Direct is police-checked, credential-verified, and vetted before being approved to provide home care services. Your family's safety is our top priority." },
  { q: "What areas do your home care services cover?", a: "PSW Direct provides home care services across 25+ cities in Ontario, including Toronto, Mississauga, Brampton, Hamilton, Ottawa, London, Barrie, and surrounding communities within a 75km service radius." },
  { q: "Can I request a caregiver who speaks my language?", a: "Yes. PSW Direct's private caregivers speak over 35 languages including Punjabi, Hindi, Urdu, Tagalog, Arabic, Mandarin, Spanish, Tamil, and many more. You can specify language preferences when booking." },
];

const canonicalUrl = `${SITE_URL}/private-home-care`;
const title = "Home Care Near Me | PSW Direct";
const description = "Find reliable home care services near you. Serving Ontario with flexible, on-demand caregivers for seniors and in-home support.";

const PrivateHomeCareServicesPage = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const homeCareServiceJsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeHealthService",
    name: "PSW Direct — Home Care Services",
    description: "Affordable home care services across Ontario. Vetted personal support workers and in-home caregivers for seniors and families.",
    url: canonicalUrl,
    telephone: "+1-249-288-4787",
    priceRange: "$30-$35",
    serviceType: ["Home Care", "In-Home Caregiver", "Personal Support Worker", "Private Nursing Care at Home", "Home Care Services", "Companionship Care", "Post-Surgery Recovery"],
    areaServed: { "@type": "AdministrativeArea", name: "Ontario, Canada" },
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "PSW Direct",
    description: "Private home care services and personal support workers across Ontario.",
    url: canonicalUrl,
    telephone: "+1-249-288-4787",
    priceRange: "$30-$35",
    areaServed: { "@type": "AdministrativeArea", name: "Ontario, Canada" },
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
          { name: "Home Care Services", url: canonicalUrl },
        ]))}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(homeCareServiceJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(localBusinessJsonLd)}</script>
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
            <Heart className="w-4 h-4" />
            Home Care Services
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Home Care Services Across Ontario
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct provides comprehensive home care services for seniors, individuals recovering
            from surgery, and anyone needing an in-home caregiver. Our vetted personal support workers
            deliver compassionate care across Ontario — starting at $30/hr with no contracts or agency fees.
          </p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book Home Care Now
            </Button>
          </a>
        </section>

        {/* Services Grid */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Our Home Care Services
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SERVICES.map((s) => (
                <div key={s.name} className="bg-card rounded-xl p-5 border border-border">
                  <h3 className="font-semibold text-foreground mb-2 text-sm">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Home Care */}
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Why Choose Home Care Services?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Private home care services offer families a more affordable and flexible alternative to traditional
              home care agencies. With PSW Direct, you hire a personal support worker directly — eliminating
              agency overhead and reducing costs by up to 45%. Our private caregivers are credential-verified,
              police-checked, and committed to delivering high-quality in-home care on your schedule.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Whether you need a private caregiver for daily living assistance, private nursing care at home
              for post-surgical recovery, or companionship for an aging parent, PSW Direct's home care services
              are designed to meet your family's unique needs. Book by the hour, cancel anytime — no contracts required.
            </p>
            <div className="grid md:grid-cols-3 gap-4 pt-4">
              <div className="bg-card rounded-xl p-5 border border-border text-center">
                <Shield className="w-7 h-7 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Vetted &amp; Verified</h3>
                <p className="text-xs text-muted-foreground">Police-checked, credential-verified personal support workers</p>
              </div>
              <div className="bg-card rounded-xl p-5 border border-border text-center">
                <Clock className="w-7 h-7 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Book by the Hour</h3>
                <p className="text-xs text-muted-foreground">No contracts or minimums — home care on your schedule</p>
              </div>
              <div className="bg-card rounded-xl p-5 border border-border text-center">
                <Users className="w-7 h-7 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-foreground mb-1">$30/hr Starting Rate</h3>
                <p className="text-xs text-muted-foreground">Save up to 45% compared to traditional home care agencies</p>
              </div>
            </div>
          </div>
        </section>

        {/* Language Coverage */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Multilingual Home Care Services
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our private caregivers speak over 35 languages, making it easy for families to find a
              personal support worker who communicates in their preferred language. Whether you need a
              Punjabi caregiver, an Urdu-speaking PSW, or a Tagalog home care worker, PSW Direct
              has you covered across Ontario.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Languages available:</strong>{" "}
              {LANGUAGES.join(", ")}, and more.
            </p>
          </div>
        </section>

        {/* Cities We Serve */}
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
              Home Care Services Across Ontario
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              PSW Direct provides home care services in 25+ Ontario cities.
              Click a city to learn more about local home care options.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {CITIES.map((c) => (
                <Link
                  key={c}
                  to={`/private-home-care-${cityToSlug(c)}`}
                  className="bg-card hover:bg-accent/50 rounded-lg px-3 py-3 text-sm font-medium text-foreground border border-border text-center transition-colors"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Home Care Pricing</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">$30/hr</p>
                <p className="text-muted-foreground text-sm">Home Care — agencies charge $55+</p>
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
              Frequently Asked Questions About Home Care Services
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
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Book Home Care Services?</h2>
          <p className="text-muted-foreground mb-6">Hire a vetted personal support worker in minutes — no contracts required.</p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">Book Now — Starting at $30/hr</Button>
          </a>
        </section>

        {/* Internal Links */}
        <section className="px-4 py-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-lg font-bold text-foreground mb-4">Explore Home Care</h2>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
              <Link to="/private-home-care-ontario" className="text-sm text-primary hover:underline font-medium">
                Home Care Ontario
              </Link>
              {CITIES.slice(0, 9).map((c) => (
                <Link key={c} to={`/private-home-care-${cityToSlug(c)}`} className="text-sm text-primary hover:underline">
                  Home Care {c}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/psw-directory" className="text-xs text-muted-foreground hover:text-primary hover:underline">PSW Directory</Link>
              <Link to="/coverage" className="text-xs text-muted-foreground hover:text-primary hover:underline">Coverage Map</Link>
              <Link to="/private-caregiver" className="text-xs text-muted-foreground hover:text-primary hover:underline">Private Caregiver</Link>
              <Link to="/in-home-care-ontario" className="text-xs text-muted-foreground hover:text-primary hover:underline">In-Home Care Ontario</Link>
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

export default PrivateHomeCareServicesPage;

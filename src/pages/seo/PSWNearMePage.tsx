import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Heart, Users, Shield, Stethoscope, Home, Search, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, buildProfessionalService } from "@/lib/seoUtils";
import { buildFAQSchema } from "@/lib/seoShared";

const CANONICAL = `${SITE_URL}/psw-near-me`;

const cities = [
  { name: "Toronto", slug: "psw-toronto" },
  { name: "Mississauga", slug: "psw-mississauga" },
  { name: "Brampton", slug: "psw-brampton" },
  { name: "Hamilton", slug: "psw-hamilton" },
  { name: "Barrie", slug: "psw-barrie" },
  { name: "Ottawa", slug: "psw-ottawa" },
  { name: "Vaughan", slug: "psw-vaughan" },
  { name: "Markham", slug: "psw-markham" },
  { name: "Richmond Hill", slug: "psw-richmond-hill" },
  { name: "Oakville", slug: "psw-oakville" },
  { name: "Burlington", slug: "psw-burlington" },
  { name: "Oshawa", slug: "psw-oshawa" },
  { name: "Kitchener", slug: "psw-kitchener" },
  { name: "London", slug: "psw-london" },
  { name: "Windsor", slug: "psw-windsor" },
  { name: "Guelph", slug: "psw-guelph" },
  { name: "Kingston", slug: "psw-kingston" },
  { name: "Peterborough", slug: "psw-peterborough" },
  { name: "Ajax", slug: "psw-ajax" },
  { name: "Pickering", slug: "psw-pickering" },
  { name: "Waterloo", slug: "psw-waterloo" },
  { name: "Cambridge", slug: "psw-cambridge" },
  { name: "St. Catharines", slug: "psw-st-catharines" },
  { name: "Niagara Falls", slug: "psw-niagara-falls" },
];

const serviceTypes = [
  { icon: Heart, label: "Personal Care", slug: "personal-care", desc: "Bathing, grooming, dressing, and personal hygiene assistance" },
  { icon: Users, label: "Companionship", slug: "companionship", desc: "Social engagement, emotional support, and daily supervision" },
  { icon: Shield, label: "Mobility Support", slug: "mobility-support", desc: "Walking assistance, transfers, repositioning, and fall prevention" },
  { icon: Stethoscope, label: "Doctor Escort", slug: "doctor-escort", desc: "Accompaniment to medical appointments and specialist visits" },
];

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#local-business`,
  name: "PSW Direct",
  alternateName: ["PSA Direct", "Personal Support Worker Direct"],
  description: "PSW Direct connects Ontario families with vetted personal support workers for in-home care, companionship, mobility support, and medical escort services.",
  url: SITE_URL,
  telephone: "+1-249-288-4787",
  priceRange: "$30-$35",
  image: OG_IMAGE,
  address: {
    "@type": "PostalAddress",
    addressRegion: "Ontario",
    addressCountry: "CA",
  },
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Ontario, Canada",
  },
  serviceType: ["Personal Support Worker", "Home Care", "Elderly Caregiver", "Private PSW"],
};

const PSWNearMePage = () => {
  return (
    <>
      <Helmet>
        <title>Personal Support Worker Near Me | Find a PSW in Ontario | PSW Direct</title>
        <meta name="description" content="Looking for a Personal Support Worker near you? Find trusted PSWs across Ontario. Book in-home care, companionship, and mobility support with PSW Direct." />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Personal Support Worker Near Me | Find a PSW in Ontario | PSW Direct" />
        <meta property="og:description" content="Looking for a Personal Support Worker near you? Find trusted PSWs across Ontario. Book in-home care, companionship, and mobility support with PSW Direct." />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Personal Support Worker Near Me | PSW Direct" />
        <meta name="twitter:description" content="Find trusted PSWs across Ontario. Book in-home care starting at $30/hr." />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify(buildBreadcrumbList([
            { name: "Home", url: SITE_URL },
            { name: "PSW Near Me", url: CANONICAL },
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildProfessionalService())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildFAQSchema([
            { question: "How fast can I get home care near me?", answer: "PSW Direct offers same-day and next-day home care across Ontario. Many requests are filled within hours. Book online and a vetted PSW can begin care the same day." },
            { question: "What does a PSW help with?", answer: "A Personal Support Worker assists with personal care (bathing, dressing, grooming), companionship, meal preparation, medication reminders, mobility support, doctor escorts, and specialized care for dementia and post-surgery recovery." },
            { question: "Is this service available near me?", answer: "PSW Direct serves 50+ cities and communities across Ontario — from Toronto and the GTA to Ottawa, Kingston, Barrie, London, and beyond." },
            { question: "Do I need a contract?", answer: "No. PSW Direct is completely contract-free. Pay by the hour, book when you need care, and cancel anytime with no penalties." },
            { question: "Are your PSWs background-checked?", answer: "Yes. Every PSW on our platform is credential-verified with a valid PSW certificate, government ID, and recent police background check on file." },
            { question: "How much does a PSW cost?", answer: "Home care through PSW Direct starts at $30/hr for personal care and companionship. Doctor escort starts at $35/hr. No agency fees or hidden charges." },
          ]))}
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
        <section className="px-4 py-14 md:py-20 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            Serving Ontario
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Personal Support Worker Near You
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct connects families across Ontario with qualified, vetted personal support workers.
            Whether you need a private PSW for senior care, companionship, mobility support, or a home
            caregiver near you — book online in minutes with transparent pricing starting at $30 per hour.
          </p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a PSW Now
            </Button>
          </a>
        </section>

        {/* Section 1: How to Find a PSW */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
              How to Find a PSW Near You
            </h2>
            <p className="text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto mb-10">
              Finding a personal support worker near you doesn't have to be complicated. With PSW Direct,
              you can book a trusted home caregiver in three simple steps — no agency contracts, no waitlists.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">1. Choose Your Service</h3>
                <p className="text-sm text-muted-foreground">
                  Select the type of care you need — personal care, companionship, mobility support, or doctor escort.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">2. Enter Your Location</h3>
                <p className="text-sm text-muted-foreground">
                  Provide your postal code and we'll match you with vetted PSWs available in your area.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Home className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">3. Book &amp; Receive Care</h3>
                <p className="text-sm text-muted-foreground">
                  Pick your date and time. A qualified PSW arrives at your door — no contracts, no hidden fees.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Areas We Serve */}
        <section className="px-4 py-14 max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
            Areas We Serve
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            PSW Direct serves communities across Ontario. Find a personal support worker near you by selecting your city.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cities.map(({ name, slug }) => (
              <Link
                key={slug}
                to={`/${slug}`}
                className="flex items-center gap-2 bg-card rounded-lg px-4 py-3 border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm font-medium text-foreground"
              >
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {name}
              </Link>
            ))}
          </div>
        </section>

        {/* Section 3: Types of Care */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center">
              Types of Care Available
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              Our private PSWs provide a full range of in-home care services tailored to your family's needs.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              {serviceTypes.map(({ icon: Icon, label, slug, desc }) => (
                <Link
                  key={slug}
                  to={`/psw-toronto-${slug}`}
                  className="flex gap-4 bg-card rounded-xl p-6 shadow-card border border-border hover:border-primary transition-colors group"
                >
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                      {label}
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Browse PSWs */}
        <section className="px-4 py-14 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Browse Available PSWs
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            View profiles of qualified personal support workers across Ontario. Filter by city,
            language, and services offered. All PSWs are credential-verified with police checks on file.
          </p>
          <Link to="/psw-directory">
            <Button size="lg" className="text-lg px-8 py-6">
              View PSW Directory
            </Button>
          </Link>
        </section>

        {/* Why PSW Direct */}
        <section className="bg-muted/50 px-4 py-14 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Why Families Choose PSW Direct
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">$30/hr</p>
                <p className="text-muted-foreground text-sm">
                  Home care starting at $30 per hour — traditional agencies charge $55+
                </p>
              </div>
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">Vetted</p>
                <p className="text-muted-foreground text-sm">
                  All PSWs are credential-verified with police checks on file
                </p>
              </div>
              <div className="text-center p-6">
                <p className="text-primary text-3xl font-bold mb-2">No Contract</p>
                <p className="text-muted-foreground text-sm">
                  Book by the hour with no commitments, cancellation fees, or long-term contracts
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-4 py-14 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              { question: "How fast can I get home care near me?", answer: "PSW Direct offers same-day and next-day home care across Ontario. Many requests are filled within hours. Book online and a vetted PSW can begin care the same day." },
              { question: "What does a PSW help with?", answer: "A Personal Support Worker assists with personal care (bathing, dressing, grooming), companionship, meal preparation, medication reminders, mobility support, doctor escorts, and specialized care for dementia and post-surgery recovery." },
              { question: "Is this service available near me?", answer: "PSW Direct serves 50+ cities and communities across Ontario — from Toronto and the GTA to Ottawa, Kingston, Barrie, London, and beyond. Enter your address when booking and we'll match you with the closest available PSW." },
              { question: "Do I need a contract?", answer: "No. PSW Direct is completely contract-free. Pay by the hour, book when you need care, and cancel anytime with no penalties." },
              { question: "Are your PSWs background-checked?", answer: "Yes. Every PSW on our platform is credential-verified with a valid PSW certificate, government ID, and recent police background check on file." },
              { question: "How much does a PSW cost?", answer: "Home care through PSW Direct starts at $30/hr for personal care and companionship. Doctor escort starts at $35/hr. No agency fees or hidden charges." },
            ].map((faq, i) => (
              <details key={i} className="bg-card rounded-xl border border-border group">
                <summary className="cursor-pointer p-5 font-semibold text-foreground list-none flex items-center justify-between">
                  {faq.question}
                  <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0 ml-2" />
                </summary>
                <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* SEO Content Block */}
        <section className="px-4 py-14 max-w-4xl mx-auto">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground text-center">
              Finding a Personal Support Worker Near You in Ontario
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              When searching for a "personal support worker near me" or "PSW near me," families want
              reliable, affordable, and immediate options. PSW Direct eliminates the traditional agency model
              by connecting you directly with vetted home caregivers in your area. Whether you're in Toronto,
              Mississauga, Brampton, Hamilton, Barrie, Ottawa, or anywhere across Ontario, our platform
              matches you with qualified PSWs who can provide the care your family needs.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Common searches like "home caregiver near me," "private PSW," and "personal support worker near me"
              all lead to the same need: trusted in-home support for a loved one. PSW Direct serves this need
              with transparent pricing, no contracts, and caregivers who are screened and credential-verified
              before being approved on the platform. Book your next visit today and experience the difference
              of working with a dedicated, local personal support worker.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-14 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Book a PSW Near You?</h2>
          <p className="text-muted-foreground mb-8">
            Get started in minutes. No contracts, no hidden fees — just quality home care.
          </p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
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
            <p className="text-sm opacity-80 mb-4">Quality personal support care for Ontario families</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PSWNearMePage;

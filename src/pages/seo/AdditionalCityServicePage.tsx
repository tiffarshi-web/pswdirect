import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, CheckCircle, Clock, Shield, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, buildProfessionalService } from "@/lib/seoUtils";
import { buildFAQSchema } from "@/lib/seoShared";
import { getNearbyCities } from "@/lib/seoCityData";
import { BUSINESS_CONTACT } from "@/lib/contactConfig";
import SEOInternalLinks from "@/components/seo/SEOInternalLinks";

interface Props {
  city: string;
  service: string;
  serviceLabel: string;
  slug: string;
}

const serviceContent: Record<string, {
  heroDesc: string;
  sections: string[];
  faqs: { question: string; answer: string }[];
}> = {
  "emergency-home-care": {
    heroDesc: "Need urgent home care? PSW Direct provides emergency personal support workers available same-day across Ontario. No waitlists, no contracts.",
    sections: [
      "Emergency home care covers urgent situations such as unexpected hospital discharges, sudden caregiver unavailability, family emergencies, or worsening health conditions that require immediate in-home support.",
      "PSW Direct's emergency home care includes personal care, mobility assistance, medication reminders, overnight supervision, and companionship — available within hours of booking.",
    ],
    faqs: [
      { question: "How quickly can I get emergency home care?", answer: "PSW Direct can often match you with a vetted PSW within hours. Same-day emergency care is available across Ontario." },
      { question: "What counts as emergency home care?", answer: "Emergency home care includes urgent situations like sudden hospital discharge, caregiver no-shows, falls, or rapid health changes requiring immediate in-home support." },
    ],
  },
  "on-demand-home-care": {
    heroDesc: "Book on-demand home care when you need it. PSW Direct connects you with available personal support workers for immediate or scheduled care — no contracts required.",
    sections: [
      "On-demand home care gives families the flexibility to book care exactly when they need it — whether it's a few hours of respite, an urgent shift, or ongoing support without a long-term commitment.",
      "All PSWs are vetted with verified credentials, police checks, and government ID. Book by the hour and pay only for the care you use.",
    ],
    faqs: [
      { question: "What is on-demand home care?", answer: "On-demand home care lets you book a vetted personal support worker whenever you need one — by the hour, same-day, or scheduled in advance. No contracts or minimums." },
      { question: "How much does on-demand care cost?", answer: "On-demand home care through PSW Direct starts at $30/hr — significantly less than traditional agencies. No hidden fees or surge pricing." },
    ],
  },
  "hospital-discharge": {
    heroDesc: "Ensure a safe transition home after hospital discharge. PSW Direct provides vetted caregivers for post-hospital care, mobility support, and recovery assistance.",
    sections: [
      "Hospital discharge care helps patients transition safely from hospital to home. Our PSWs assist with mobility, personal care, medication reminders, meal preparation, and monitoring recovery progress.",
      "Many families are caught off-guard by early hospital discharges. PSW Direct offers same-day booking so your loved one has professional support from the moment they arrive home.",
    ],
    faqs: [
      { question: "What does hospital discharge care include?", answer: "Hospital discharge care includes mobility assistance, personal care, medication reminders, meal preparation, fall prevention, and monitoring recovery — all in the comfort of home." },
      { question: "Can I book discharge care the same day?", answer: "Yes. PSW Direct offers same-day hospital discharge care. Book online and we'll match you with a qualified PSW immediately." },
    ],
  },
  "hospital-discharge-care": {
    heroDesc: "Ensure a safe transition home after hospital discharge. PSW Direct provides vetted caregivers for post-hospital care, mobility support, and recovery assistance.",
    sections: [
      "Hospital discharge care helps patients transition safely from hospital to home. Our PSWs assist with mobility, personal care, medication reminders, meal preparation, and monitoring recovery progress.",
      "Many families are caught off-guard by early hospital discharges. PSW Direct offers same-day booking so your loved one has professional support from the moment they arrive home.",
    ],
    faqs: [
      { question: "What does hospital discharge care include?", answer: "Hospital discharge care includes mobility assistance, personal care, medication reminders, meal preparation, fall prevention, and monitoring recovery — all in the comfort of home." },
      { question: "Can I book discharge care the same day?", answer: "Yes. PSW Direct offers same-day hospital discharge care. Book online and we'll match you with a qualified PSW immediately." },
    ],
  },
  "doctor-escort": {
    heroDesc: "Need someone to accompany your loved one to a medical appointment? PSW Direct provides trained PSWs for doctor visit escorts, hospital trips, and specialist appointments.",
    sections: [
      "Doctor escort services ensure seniors and individuals with mobility challenges get to medical appointments safely. Our PSWs provide door-to-door assistance, wait with patients, and help communicate with healthcare providers.",
      "Services include transportation coordination, wheelchair and walker assistance, appointment note-taking, pharmacy stops, and safe return home after the visit.",
    ],
    faqs: [
      { question: "What does a doctor escort service include?", answer: "A PSW accompanies your loved one to their appointment, assists with mobility, helps communicate with the doctor, picks up prescriptions, and ensures safe return home." },
      { question: "Do I need to provide transportation?", answer: "The PSW can accompany your loved one in their own vehicle, your family's vehicle, or via taxi/ride service. Some PSWs have their own transportation available." },
    ],
  },
  "in-home-care-services": {
    heroDesc: "Comprehensive in-home care services from vetted personal support workers. Personal care, companionship, meal prep, mobility support, and more — all in the comfort of home.",
    sections: [
      "In-home care services allow your loved one to receive professional support while staying in their own home. PSW Direct offers a full range of services including personal care, companionship, household support, and specialized care for conditions like dementia.",
      "Our in-home care is flexible — book by the hour, choose your schedule, and adjust as needs change. No contracts, no minimum commitments, and transparent pricing from $30/hr.",
    ],
    faqs: [
      { question: "What in-home care services are available?", answer: "Services include personal care (bathing, dressing), companionship, meal preparation, medication reminders, mobility assistance, doctor escorts, overnight care, and dementia support." },
      { question: "How is in-home care different from a nursing home?", answer: "In-home care provides one-on-one attention in familiar surroundings at a fraction of the cost. There are no waitlists, and your loved one maintains their independence and routine." },
    ],
  },
  "psw-services-in": {
    heroDesc: "Find qualified personal support worker services in your area. Vetted PSWs for personal care, companionship, mobility support, and specialized care needs.",
    sections: [
      "PSW services cover a wide range of in-home support including personal care, companionship, meal preparation, medication reminders, mobility assistance, and specialized care for dementia and post-surgery recovery.",
      "All PSW Direct caregivers are credential-verified with police background checks, government ID verification, and valid PSW certificates. Book online with transparent pricing starting at $30/hr.",
    ],
    faqs: [
      { question: "What PSW services are available?", answer: "PSW Direct offers personal care, companionship, mobility support, doctor escorts, overnight care, dementia care, post-surgery support, and hospital discharge care." },
      { question: "How do I book PSW services?", answer: "Visit pswdirect.ca, enter your location, select your service type and schedule, and book online in under 2 minutes. A vetted PSW will be matched to your area." },
    ],
  },
  "home-care-in": {
    heroDesc: "Professional home care services from vetted personal support workers. Book online with no contracts and transparent pricing starting at $30/hr.",
    sections: [
      "Home care services help your loved one maintain independence and quality of life in the comfort of their own home. PSW Direct provides vetted caregivers for personal care, companionship, meal preparation, and more.",
      "Whether you need a few hours of support or full-day care, PSW Direct offers flexible scheduling with no contracts and no minimum commitments. Book online and receive care as soon as same-day.",
    ],
    faqs: [
      { question: "What does home care include?", answer: "Home care includes personal care (bathing, dressing), companionship, meal preparation, medication reminders, mobility assistance, light housekeeping, and specialized care." },
      { question: "How much does home care cost?", answer: "Home care through PSW Direct starts at $30/hr — significantly less than traditional agencies. No contracts, no hidden fees." },
    ],
  },
  "private-home-care-in": {
    heroDesc: "Private home care without the agency markup. PSW Direct connects you directly with vetted personal support workers for affordable, contract-free home care.",
    sections: [
      "Private home care eliminates the agency middleman, giving you direct access to qualified caregivers at transparent rates. PSW Direct's PSWs are individually vetted with credential verification and police checks.",
      "Services include personal care, companionship, meal preparation, medication reminders, mobility support, doctor escorts, and specialized care for dementia and post-surgery recovery.",
    ],
    faqs: [
      { question: "What is private home care?", answer: "Private home care means hiring a caregiver directly rather than through a traditional agency. PSW Direct facilitates this connection with vetted PSWs at $30/hr — vs $55+/hr at agencies." },
      { question: "Is private home care safe?", answer: "Yes. PSW Direct verifies every PSW's credentials, government ID, and police background check. GPS tracking is active during every shift for additional safety." },
    ],
  },
};

const AdditionalCityServicePage = ({ city, service, serviceLabel, slug }: Props) => {
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const content = serviceContent[service] || serviceContent["in-home-care-services"]!;
  const nearby = getNearbyCities(city).slice(0, 5);
  const title = `${serviceLabel} in ${city} | PSW Direct`;
  const description = `${serviceLabel} in ${city}, Ontario. Vetted personal support workers available same-day. Book online from $30/hr — no contracts.`;

  const faqs = content.faqs.map((f) => ({
    question: f.question.replace(/your area/g, city),
    answer: f.answer,
  }));

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
        <script type="application/ld+json">
          {JSON.stringify(buildBreadcrumbList([
            { name: "Home", url: SITE_URL },
            { name: "Home Care Ontario", url: `${SITE_URL}/home-care-ontario` },
            { name: `${serviceLabel} in ${city}`, url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: "PSW Direct",
            description: `${serviceLabel} in ${city}, Ontario`,
            url: SITE_URL,
            telephone: BUSINESS_CONTACT.phoneInternational,
            priceRange: "$30-$35",
            areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } },
            serviceType: [serviceLabel, "Home Care", "Personal Support Worker"],
            availableChannel: { "@type": "ServiceChannel", serviceUrl: `${SITE_URL}`, serviceType: "Online booking" },
            offers: { "@type": "Offer", priceCurrency: "CAD", price: "30", priceSpecification: { "@type": "UnitPriceSpecification", unitText: "hour" } },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildFAQSchema(faqs))}
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
              <a href={`tel:${BUSINESS_CONTACT.phoneRaw}`} className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">{BUSINESS_CONTACT.phoneFormatted}</span>
              </a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="px-4 py-12 md:py-20 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            {city}, Ontario
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            {serviceLabel} in {city}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            {content.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://pswdirect.ca/">
              <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                Book Home Care Online in Minutes — No Contracts
              </Button>
            </a>
            <a href={`tel:${BUSINESS_CONTACT.phoneRaw}`}>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                <Phone className="w-5 h-5 mr-2" /> Call Now
              </Button>
            </a>
          </div>
        </section>

        {/* Trust signals */}
        <section className="bg-muted/50 px-4 py-10 border-y border-border">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-primary text-2xl font-bold">$30/hr</p>
              <p className="text-xs text-muted-foreground mt-1">Starting rate</p>
            </div>
            <div>
              <p className="text-primary text-2xl font-bold">Same-Day</p>
              <p className="text-xs text-muted-foreground mt-1">Availability</p>
            </div>
            <div>
              <p className="text-primary text-2xl font-bold">Vetted</p>
              <p className="text-xs text-muted-foreground mt-1">Background checked</p>
            </div>
            <div>
              <p className="text-primary text-2xl font-bold">No Contract</p>
              <p className="text-xs text-muted-foreground mt-1">Cancel anytime</p>
            </div>
          </div>
        </section>

        {/* Content sections */}
        <section className="px-4 py-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            What is {serviceLabel} in {city}?
          </h2>
          {content.sections.map((text, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-4">{text}</p>
          ))}

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">
            Why Choose PSW Direct for {serviceLabel}
          </h2>
          <ul className="space-y-3">
            {[
              "Vetted PSWs with verified credentials and police checks",
              `Same-day availability in ${city} and surrounding areas`,
              "Transparent pricing from $30/hr — no agency markup",
              "No contracts, no minimum commitments",
              "GPS tracking and care documentation on every shift",
              "Book online in under 2 minutes",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQs */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nearby areas */}
        {nearby.length > 0 && (
          <section className="px-4 py-12 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
              Areas We Serve Near {city}
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              Looking for {serviceLabel.toLowerCase()} in nearby areas? We also serve {nearby.join(", ")}, and surrounding regions.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {nearby.map((n) => {
                const nSlug = n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <Link key={n} to={`/home-care-${nSlug}`} className="bg-card rounded-lg px-4 py-2 border border-border hover:border-primary text-sm font-medium text-foreground transition-colors">
                    Home Care in {n}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="px-4 py-12 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Book {serviceLabel} in {city} Today
          </h2>
          <p className="text-muted-foreground mb-8">
            Get started in minutes. No contracts, no hidden fees — just quality home care.
          </p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book Home Care Now <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
        </section>

        <SEOInternalLinks compact />

        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">{serviceLabel} in {city}, Ontario</p>
            <p className="text-xs opacity-60">© {new Date().getFullYear()} PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default AdditionalCityServicePage;

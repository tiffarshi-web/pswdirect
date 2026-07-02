import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, CheckCircle, Shield, Clock, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { buildFAQSchema } from "@/lib/seoShared";
import { getNearbyCities } from "@/lib/seoCityData";
import { BUSINESS_CONTACT } from "@/lib/contactConfig";
import TrustSignals from "@/components/seo/TrustSignals";
import ServingYourArea from "@/components/seo/ServingYourArea";
import RelatedServiceLinks from "@/components/seo/RelatedServiceLinks";
import { EXPANDED_SERVICE_CONTENT } from "./expandedServiceContent";

interface Props {
  city: string;
  service: string;
  serviceLabel: string;
  slug: string;
}

const ExpandedCityServicePage = ({ city, service, serviceLabel, slug }: Props) => {
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const content = EXPANDED_SERVICE_CONTENT[service];
  const nearby = getNearbyCities(city).slice(0, 6);
  const title = `${serviceLabel} in ${city}, Ontario | PSW Direct`;
  const description = `${serviceLabel} in ${city} from vetted personal support workers. Same-day availability, no contracts, from $35/hr. Book online with PSW Direct.`;

  if (!content) return null;

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
            "@type": "LocalBusiness",
            name: `PSW Direct — ${serviceLabel} in ${city}`,
            description,
            url: canonicalUrl,
            telephone: BUSINESS_CONTACT.phoneInternational,
            priceRange: "$35-$45",
            image: `${SITE_URL}${OG_IMAGE}`,
            areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } },
            address: {
              "@type": "PostalAddress",
              streetAddress: "239 Grove St E",
              addressLocality: "Barrie",
              addressRegion: "ON",
              postalCode: "L4M 2R1",
              addressCountry: "CA",
            },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `${serviceLabel} in ${city}`,
            serviceType: serviceLabel,
            provider: { "@type": "LocalBusiness", name: "PSW Direct", telephone: BUSINESS_CONTACT.phoneInternational, url: SITE_URL },
            areaServed: { "@type": "City", name: city },
            offers: { "@type": "Offer", price: "35", priceCurrency: "CAD", priceSpecification: { "@type": "UnitPriceSpecification", price: "35", priceCurrency: "CAD", unitText: "HOUR" } },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildFAQSchema(content.faqs))}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link to="/" className="flex items-center gap-3">
                <img src={logo} alt="PSW Direct" className="h-12 w-auto" />
                <span className="text-sm font-semibold text-foreground tracking-wide">PSW Direct</span>
              </Link>
              <a href={`tel:${BUSINESS_CONTACT.phoneRaw}`} className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">{BUSINESS_CONTACT.phone}</span>
              </a>
            </div>
          </div>
        </header>

        <Breadcrumbs city={city} service={{ name: serviceLabel, href: `/${slug}` }} />

        <section className="px-4 py-12 md:py-20 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" /> {city}, Ontario
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            {serviceLabel} in {city}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            {content.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/">
              <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                Book Care Now — Online in Minutes
              </Button>
            </a>
            <a href={`tel:${BUSINESS_CONTACT.phoneRaw}`}>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
                <Phone className="w-5 h-5 mr-2" /> Call {BUSINESS_CONTACT.phone}
              </Button>
            </a>
          </div>
        </section>

        <section className="bg-muted/50 px-4 py-10 border-y border-border">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div><p className="text-primary text-2xl font-bold">$35/hr</p><p className="text-xs text-muted-foreground mt-1">Starting rate</p></div>
            <div><p className="text-primary text-2xl font-bold">Same-Day</p><p className="text-xs text-muted-foreground mt-1">Availability</p></div>
            <div><p className="text-primary text-2xl font-bold">Vetted</p><p className="text-xs text-muted-foreground mt-1">Background checked</p></div>
            <div><p className="text-primary text-2xl font-bold">No Contract</p><p className="text-xs text-muted-foreground mt-1">Cancel anytime</p></div>
          </div>
        </section>

        <section className="px-4 py-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            What {serviceLabel} looks like in {city}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">{content.intro}</p>
          <p className="text-muted-foreground leading-relaxed mb-8">{content.detail}</p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            What's included when you book {serviceLabel} in {city}
          </h2>
          <ul className="space-y-3">
            {content.bullets.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Why families in {city} choose PSW Direct
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Every PSW verified</h3>
                <p className="text-sm text-muted-foreground">Credential checks, government ID and police background on every caregiver.</p>
              </div>
              <div className="text-center">
                <Clock className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Same-day dispatch</h3>
                <p className="text-sm text-muted-foreground">Urgent care in {city} is matched to the closest available PSW within hours.</p>
              </div>
              <div className="text-center">
                <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">No contracts</h3>
                <p className="text-sm text-muted-foreground">Book by the hour with transparent pricing. Cancel or change anytime.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Frequently asked questions about {serviceLabel} in {city}
          </h2>
          <div className="space-y-6">
            {content.faqs.map((faq, i) => (
              <div key={i} className="border-b border-border pb-6 last:border-0">
                <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <TrustSignals />
        <ServingYourArea city={city} />

        {nearby.length > 0 && (
          <section className="px-4 py-12 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {serviceLabel} near {city}
            </h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {nearby.map((n) => {
                const nSlug = n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                return (
                  <li key={n}>
                    <Link
                      to={`/${service}-${nSlug}`}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {serviceLabel} in {n} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="bg-primary text-primary-foreground px-4 py-14 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Book {serviceLabel} in {city} today</h2>
            <p className="mb-8 opacity-90">Vetted PSWs, transparent pricing, same-day availability. No contracts.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/"><Button size="lg" variant="secondary" className="text-lg px-8 py-6">Book Care Online</Button></a>
              <a href={`tel:${BUSINESS_CONTACT.phoneRaw}`}>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  <Phone className="w-5 h-5 mr-2" /> Call {BUSINESS_CONTACT.phone}
                </Button>
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ExpandedCityServicePage;

import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, CheckCircle, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, generatePrivacySlug, generatePSWAltText } from "@/lib/seoUtils";
import { getNearbyPSWsByCity, type NearbyPSW } from "@/lib/nearbyPSWs";
import { buildFAQSchema } from "@/lib/seoShared";
import { getNearbyCities, cityToSlug, nearbyCitiesMap } from "@/lib/seoCityData";
import { isTier1CityByLabel } from "@/lib/seoTierConfig";
import {
  getIntro, getServices, getWhyChoose, getWhoIsFor,
  getHowItWorks, getCtaCopy, getFaqs, getMetaDescription,
} from "@/lib/cityContentVariation";
import PrivateHomeCareSection from "@/components/seo/PrivateHomeCareSection";
import SEOInternalLinks from "@/components/seo/SEOInternalLinks";
import CityInternalLinks from "@/components/seo/CityInternalLinks";
import SEOFreshnessSignal from "@/components/seo/SEOFreshnessSignal";

interface Props {
  city: string;
  slug: string;
}

const HomeCareCityPage = ({ city, slug }: Props) => {
  const [psws, setPsws] = useState<NearbyPSW[]>([]);
  const [loading, setLoading] = useState(true);

  const title = `Home Care Services in ${city} | PSW Direct`;
  const description = getMetaDescription(city);
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const nearbyCities = getNearbyCities(city);
  const nearbyAreas = (nearbyCitiesMap[city] || []).slice(0, 3);

  // All varied content driven by city hash
  const intro = getIntro(city, nearbyAreas);
  const services = getServices(city);
  const whyChoose = getWhyChoose(city);
  const whoIsFor = getWhoIsFor(city);
  const howItWorks = getHowItWorks(city);
  const ctaCopy = getCtaCopy(city);
  const faqs = getFaqs(city);

  useEffect(() => {
    getNearbyPSWsByCity(city, 50).then((r) => { setPsws(r); setLoading(false); });
  }, [city]);

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        {!isTier1CityByLabel(city) && <meta name="robots" content="noindex, follow" />}
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
            { name: "Home Care Ontario", url: `${SITE_URL}/home-care-ontario` },
            { name: `Home Care in ${city}`, url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildFAQSchema(faqs))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HomeHealthService",
            name: `PSW Direct — Home Care in ${city}`,
            description: `Affordable home care services in ${city}, Ontario. Personal support workers for seniors and families.`,
            url: canonicalUrl,
            telephone: "+1-249-288-4787",
            priceRange: "$35-$45",
            serviceType: ["Home Care", "Personal Support Worker", "Senior Care", "Companionship", "Post-Hospital Care"],
            areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "PSW Direct",
            description: `Home care and personal support worker services in ${city}, Ontario.`,
            url: SITE_URL,
            telephone: "+1-249-288-4787",
            priceRange: "$35-$45",
            address: { "@type": "PostalAddress", addressLocality: city, addressRegion: "Ontario", addressCountry: "CA" },
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
        <Breadcrumbs city={city} service={{ name: "Home Care", href: `/home-care-${slug}` }} />

        {/* Hero */}
        <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            {city}, Ontario
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Home Care Services in {city}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            {intro}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/">
              <Button size="lg" className="text-lg px-8 py-6">Book Care in {city}</Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">Get Instant Price Estimate</Button>
            </Link>
          </div>
        </section>

        {/* Services Grid */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Private Home Care Services in {city}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((svc, i) => (
                <div key={i} className="bg-card rounded-xl p-6 border border-border">
                  <svc.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">{svc.title}</h3>
                  <p className="text-sm text-muted-foreground">{svc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose */}
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Why {city} Families Choose PSW Direct</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {whyChoose.map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <CheckCircle className="w-6 h-6 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-8">Who Is Home Care in {city} For?</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              {whoIsFor.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-card rounded-lg p-4 border border-border">
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">How Home Care Works in {city}</h2>
            <div className="space-y-6">
              {howItWorks.map((step) => (
                <div key={step.step} className="flex gap-5 items-start">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Available PSWs */}
        {!loading && psws.length > 0 && (
          <section className="bg-muted/50 px-4 py-12 border-y border-border">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Personal Support Workers Near {city}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {psws.slice(0, 8).map((p, idx) => {
                  const profileSlug = generatePrivacySlug(p.first_name, p.last_name, p.home_city);
                  return (
                    <Link key={idx} to={`/psw/profile/${profileSlug}`} className="bg-card rounded-xl p-4 border border-border hover:border-primary hover:shadow-md transition-all text-center">
                      {p.profile_photo_url && (
                        <img src={p.profile_photo_url} alt={generatePSWAltText(p.first_name, p.last_name.charAt(0), p.home_city)} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" loading="lazy" />
                      )}
                      <p className="font-semibold text-foreground text-sm">{p.first_name} {p.last_name.charAt(0)}.</p>
                      <p className="text-xs text-muted-foreground">{p.home_city}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-primary/5 px-4 py-12 border-y border-border">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">{ctaCopy.heading}</h2>
            <p className="text-muted-foreground mb-6">{ctaCopy.body}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/">
                <Button size="lg" className="text-lg px-8 py-6">Book Care Now</Button>
              </Link>
              <Link to="/home-care-toronto">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">See Toronto Home Care</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions — {city}</h2>
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

        {/* Home Care SEO Content */}
        <PrivateHomeCareSection city={city} />

        {/* Related Pages in Same City */}
        <section className="px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-lg font-bold text-foreground mb-4">More Care Options in {city}</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to={`/personal-support-worker-${cityToSlug(city)}`} className="text-primary hover:underline text-sm font-medium">PSW in {city}</Link>
              <Link to={`/psw-${cityToSlug(city)}`} className="text-primary hover:underline text-sm font-medium">PSWs in {city}</Link>
              <Link to={`/senior-care-${cityToSlug(city)}`} className="text-primary hover:underline text-sm font-medium">Senior Care in {city}</Link>
              <Link to={`/24-hour-home-care-${cityToSlug(city)}`} className="text-primary hover:underline text-sm font-medium">24-Hour Care in {city}</Link>
              <Link to={`/overnight-care-${cityToSlug(city)}`} className="text-primary hover:underline text-sm font-medium">Overnight Care in {city}</Link>
            </div>
          </div>
        </section>

        {/* Nearby Cities */}
        {nearbyCities.length > 0 && (
          <section className="bg-muted/50 px-4 py-12 border-y border-border">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-xl font-bold text-foreground mb-6">Home Care in Nearby Cities</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {nearbyCities.map((nc) => (
                  <Link key={nc} to={`/home-care-${cityToSlug(nc)}`} className="text-primary hover:underline text-sm font-medium">
                    Home Care in {nc}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Freshness Signal */}
        <section className="px-4 py-6 max-w-4xl mx-auto">
          <SEOFreshnessSignal location={city} />
        </section>

        {/* Internal Links */}
        <CityInternalLinks city={city} />
        <SEOInternalLinks excludeCity={city} compact />

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

export default HomeCareCityPage;

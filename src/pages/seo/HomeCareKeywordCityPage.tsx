import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, getNearbyCities, generatePrivacySlug, generatePSWAltText } from "@/lib/seoUtils";
import { isTier1CityByLabel } from "@/lib/seoTierConfig";
import { getNearbyPSWsByCity, type NearbyPSW } from "@/lib/nearbyPSWs";
import { buildFAQSchema } from "@/lib/seoShared";
import PrivateHomeCareSection from "@/components/seo/PrivateHomeCareSection";
import LongFormSEOContent from "@/components/seo/LongFormSEOContent";

interface Props {
  city: string;
  slug: string;
  keyword: "senior-care" | "private-caregiver" | "in-home-care";
  keywordLabel: string;
}

const hubMap: Record<string, { path: string; label: string }> = {
  "senior-care": { path: "/senior-care-near-me", label: "Senior Care Near Me" },
  "private-caregiver": { path: "/private-caregiver", label: "Private Caregiver Ontario" },
  "in-home-care": { path: "/in-home-care-ontario", label: "In-Home Care Ontario" },
};

const HomeCareKeywordCityPage = ({ city, slug, keyword, keywordLabel }: Props) => {
  const [psws, setPsws] = useState<NearbyPSW[]>([]);
  const [loading, setLoading] = useState(true);

  const title = `${keywordLabel} in ${city} | PSW Direct`;
  const description = `Find affordable ${keywordLabel.toLowerCase()} in ${city}, Ontario. PSW Direct connects families with vetted personal support workers — book online from $35/hr with no contracts.`;
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const nearbyCities = getNearbyCities(city);
  const hub = hubMap[keyword];
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const faqs = [
    { question: `How much does ${keywordLabel.toLowerCase()} cost in ${city}?`, answer: `${keywordLabel} through PSW Direct in ${city} starts at $35/hr. Traditional agencies charge $55+. No contracts or hidden fees.` },
    { question: `How do I find ${keywordLabel.toLowerCase()} in ${city}?`, answer: `Visit PSWDIRECT.CA to browse vetted personal support workers serving ${city}. Book online in minutes — no contracts required.` },
    { question: `Can I book ${keywordLabel.toLowerCase()} for my parent in ${city}?`, answer: `Yes. You can book ${keywordLabel.toLowerCase()} for a family member in ${city}. Select "Someone Else" during booking and provide care details.` },
  ];

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
            { name: hub.label, url: `${SITE_URL}${hub.path}` },
            { name: `${keywordLabel} in ${city}`, url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildFAQSchema(faqs))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HomeHealthService",
            name: `PSW Direct — ${keywordLabel} in ${city}`,
            description: `${keywordLabel} services in ${city}, Ontario.`,
            url: canonicalUrl,
            telephone: "+1-249-288-4787",
            priceRange: "$35-$45",
            serviceType: [keywordLabel, "Personal Support Worker", "Home Care"],
            areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } },
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
            {city}, Ontario
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{keywordLabel} in {city}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            Find affordable {keywordLabel.toLowerCase()} in {city}. PSW Direct connects families with vetted personal support workers — book online from $35/hr with no contracts.
          </p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">Book {keywordLabel}</Button>
          </a>
        </section>

        {/* PSW Profiles */}
        {!loading && psws.length > 0 && (
          <section className="bg-muted/50 px-4 py-12 border-y border-border">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Available Caregivers in {city}</h2>
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

        {/* FAQ */}
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

        {/* Home Care SEO Content */}
        <PrivateHomeCareSection city={city} />

        {/* Nearby Cities */}
        {nearbyCities.length > 0 && (
          <section className="bg-muted/50 px-4 py-12 border-y border-border">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-xl font-bold text-foreground mb-6">{keywordLabel} in Nearby Cities</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {nearbyCities.map((nc) => {
                  const ncSlug = nc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                  return (
                    <Link key={nc} to={`/${keyword}-${ncSlug}`} className="text-primary hover:underline text-sm font-medium">
                      {keywordLabel} in {nc}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Internal Links */}
        <section className="px-4 py-12 max-w-4xl mx-auto text-center">
          <h2 className="text-lg font-bold text-foreground mb-3">Related Pages</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to={hub.path} className="text-primary hover:underline text-sm">{hub.label}</Link>
            <Link to={`/psw-${citySlug}`} className="text-primary hover:underline text-sm">PSWs in {city}</Link>
            <Link to={`/personal-support-worker-${citySlug}`} className="text-primary hover:underline text-sm">PSW in {city}</Link>
            <Link to={`/home-care-${citySlug}`} className="text-primary hover:underline text-sm">Home Care {city}</Link>
            <Link to={`/24-hour-home-care-${citySlug}`} className="text-primary hover:underline text-sm">24-Hour Care {city}</Link>
            <Link to="/home-care-ontario" className="text-primary hover:underline text-sm">Home Care Ontario</Link>
            <Link to="/psw-directory" className="text-primary hover:underline text-sm">PSW Directory</Link>
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
};

export default HomeCareKeywordCityPage;

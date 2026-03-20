import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Clock, Heart, Shield, Users, Moon, Building2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, generatePrivacySlug, generatePSWAltText } from "@/lib/seoUtils";
import { getNearbyPSWsByCity, type NearbyPSW } from "@/lib/nearbyPSWs";
import { buildFAQSchema } from "@/lib/seoShared";
import { getNearbyCities, cityToSlug } from "@/lib/seoCityData";
import PrivateHomeCareSection from "@/components/seo/PrivateHomeCareSection";

interface Props {
  city: string;
  slug: string;
}

const HomeCareCityPage = ({ city, slug }: Props) => {
  const [psws, setPsws] = useState<NearbyPSW[]>([]);
  const [loading, setLoading] = useState(true);

  const title = `Home Care Services in ${city} | PSW Direct`;
  const description = `Reliable home care services in ${city}. Book trusted home care and caregivers for in-home support, companionship, and 24-hour care.`;
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const nearbyCities = getNearbyCities(city);
  const citySlug = cityToSlug(city);

  // Geo expansion mentions per city (nearby areas referenced naturally)
  const geoMentions: Record<string, string[]> = {
    "Toronto": ["North York", "Scarborough", "Etobicoke"],
    "Mississauga": ["Oakville", "Milton"],
    "Vaughan": ["Richmond Hill", "Maple"],
    "Brampton": ["Caledon"],
    "Barrie": ["Innisfil", "Orillia", "Midland"],
    "Markham": ["Unionville", "Stouffville"],
  };
  const nearbyAreas = geoMentions[city] || [];

  const faqs = [
    { question: `How much does home care cost in ${city}?`, answer: `Home care through PSW Direct in ${city} starts at $30/hr. Traditional agencies charge $55+. No contracts, no hidden fees.` },
    { question: `What home care services are available in ${city}?`, answer: `PSW Direct offers personal care, companionship, mobility support, meal preparation, medication reminders, post-hospital care, overnight care, and 24-hour home care in ${city}.` },
    { question: `Can I book overnight home care in ${city}?`, answer: `Yes. PSW Direct provides overnight and 24-hour home care in ${city}. Book online or call (249) 288-4787.` },
    { question: `How do I book home care in ${city}?`, answer: `Visit pswdirect.ca, enter your care needs, and get matched with a vetted personal support worker in ${city}. No contracts required.` },
    { question: `Is home care in ${city} covered by insurance?`, answer: `Some extended health plans cover PSW services. Check with your insurance provider. PSW Direct provides receipts for all bookings.` },
  ];

  const services = [
    { icon: Heart, title: "Personal Care", desc: `Bathing, grooming, dressing, and hygiene assistance from trained PSWs in ${city}.` },
    { icon: Users, title: "Companionship & Senior Care", desc: `Social interaction, meal preparation, light housekeeping, and emotional support for seniors in ${city}.` },
    { icon: Shield, title: "Mobility Support", desc: `Safe transfers, walking assistance, fall prevention, and wheelchair support in ${city}.` },
    { icon: Building2, title: "Post-Hospital Care", desc: `Recovery support after surgery or hospital discharge in ${city}. Medication reminders and wound care assistance.` },
    { icon: Moon, title: "Overnight Home Care", desc: `Nighttime supervision, bathroom assistance, repositioning, and emergency response in ${city}.` },
    { icon: Clock, title: "24-Hour Home Care", desc: `Round-the-clock personal support worker coverage in ${city}. Flexible scheduling with no long-term contracts.` },
  ];

  useEffect(() => {
    getNearbyPSWsByCity(city, 50).then((r) => { setPsws(r); setLoading(false); });
  }, [city]);

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
            priceRange: "$30-$35",
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
            priceRange: "$30-$35",
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

        {/* Hero */}
        <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            {city}, Ontario
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Home Care Services in {city}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            Book trusted home care and personal support workers in {city}{nearbyAreas.length > 0 ? ` and nearby areas including ${nearbyAreas.join(", ")}` : ""}. Companionship, personal care, meal prep, overnight care, and post-hospital support — starting at $30/hr with no contracts.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://pswdirect.ca/">
              <Button size="lg" className="text-lg px-8 py-6">Book Home Care in {city}</Button>
            </a>
            <a href="https://pswdirect.ca/">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">Get Instant Price Estimate</Button>
            </a>
          </div>
        </section>

        {/* Services Grid */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Private Home Care in {city}</h2>
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

        {/* Available PSWs */}
        {!loading && psws.length > 0 && (
          <section className="px-4 py-12">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Personal Support Workers Available in {city}</h2>
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

        {/* Book CTA */}
        <section className="bg-primary/5 px-4 py-12 border-y border-border">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Book Care in {city}</h2>
            <p className="text-muted-foreground mb-6">
              Get matched with a vetted personal support worker in {city}. No contracts, no agency fees — just quality home care starting at $30/hr.
            </p>
            <a href="https://pswdirect.ca/">
              <Button size="lg" className="text-lg px-8 py-6">Book Now</Button>
            </a>
          </div>
        </section>

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
              <h2 className="text-xl font-bold text-foreground mb-6">Home Care in Nearby Cities</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {nearbyCities.map((nc) => {
                  const ncSlug = cityToSlug(nc);
                  return (
                    <Link key={nc} to={`/home-care-${ncSlug}`} className="text-primary hover:underline text-sm font-medium">
                      Home Care in {nc}
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
            <Link to="/private-home-care" className="text-primary hover:underline text-sm font-medium">Home Care Services</Link>
            {citySlug !== "toronto" && (
              <Link to="/home-care-toronto" className="text-primary hover:underline text-sm">Home Care Toronto</Link>
            )}
            <Link to={`/psw-${citySlug}`} className="text-primary hover:underline text-sm">Caregivers in {city}</Link>
            <Link to="/psw-directory" className="text-primary hover:underline text-sm">Caregiver Directory</Link>
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

export default HomeCareCityPage;

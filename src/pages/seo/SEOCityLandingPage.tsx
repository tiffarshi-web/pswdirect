import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Users, Heart, Phone, MapPin, Globereact";
import { Input }m "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, buildProfessionalService, generatePrivacySlug, generatePSWAltText, getNearbyCities } from "@/lib/seoUtils";
import { getNearbyPSWsByCity, type NearbyPSW } from "@/lib/nearbyPSWs";
import { langName, buildFAQSchema, getCityFAQs, seoFooterLinks } from "@/lib/seoShared";

interface SEOCityLandingPageProps {
  city: string;
  slug: string;
}

type PSWListItem = NearbyPSW;

const SEOCityLandingPage = ({ city, slug }: SEOCityLandingPageProps) => {
  const [psws, setPsws] = useState<PSWListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const title = `Personal Support Workers in ${city} | PSW Direct`;
  const description = `Find vetted Personal Support Workers in ${city} through PSW Direct. Book trusted in-home care including companionship, mobility assistance, and personal care.`;
  const canonicalUrl = `https://psadirect.ca/${slug}`;
  const nearbyCities = getNearbyCities(city);
  const faqs = getCityFAQs(city);

  useEffect(() => {
    const fetchPSWs = async () => {
      const nearby = await getNearbyPSWsByCity(city, 50);
      setPsws(nearby);
      setLoading(false);
    };
    fetchPSWs();
  }, [city]);


  const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  // Service pages for this city
  const serviceLinks = [
    { label: "Dementia Care", slug: `dementia-care-${citySlug}` },
    { label: "Alzheimer's Care", slug: `alzheimers-care-${citySlug}` },
    { label: "Overnight Care", slug: `overnight-care-${citySlug}` },
    { label: "24-Hour Home Care", slug: `24-hour-home-care-${citySlug}` },
    { label: "Post-Surgery Care", slug: `post-surgery-care-${citySlug}` },
    { label: "Palliative Care", slug: `palliative-care-${citySlug}` },
    { label: "Respite Care", slug: `respite-care-${citySlug}` },
    { label: "Senior Home Care", slug: `senior-home-care-${citySlug}` },
  ];

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
            { name: "PSW Directory", url: `${SITE_URL}/psw-directory` },
            { name: `PSWs in ${city}`, url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Personal Support Workers in ${city}`,
            description,
            provider: {
              "@type": "Organization",
              name: "PSW Direct",
              url: SITE_URL,
            },
            areaServed: {
              "@type": "City",
              name: city,
              containedInPlace: { "@type": "AdministrativeArea", name: "Ontario, Canada" },
            },
            serviceType: "Personal Support Worker",
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildProfessionalService(city))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(buildFAQSchema(faqs))}
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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Personal Support Workers in {city}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-4">
            PSW Direct connects families with vetted personal support workers (PSWs) in {city}.
            Book affordable home care services online in minutes with transparent pricing starting at $30 per hour.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            Whether you need dementia care, overnight care, post-surgery support, or companionship for a senior loved one in {city}, 
            our platform works like Uber for PSWs — post your care needs, get matched with a credential-verified caregiver, and care begins at your scheduled time.
          </p>
          <a href="https://psadirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
        </section>

        {/* How Booking Works */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-8">How Booking Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Post Your Shift</h3>
                <p className="text-sm text-muted-foreground">Tell us what care you need, when, and where in {city}.</p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Match with a PSW</h3>
                <p className="text-sm text-muted-foreground">A vetted caregiver in your area accepts your request.</p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Care Begins</h3>
                <p className="text-sm text-muted-foreground">Your PSW arrives and provides professional home care.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Available PSW Profile Grid — max 6 cards, hidden if zero */}
        {!loading && psws.length > 0 && (
          <section className="px-4 py-12 max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Available Personal Support Workers in {city}
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {psws.slice(0, 6).map((p, i) => {
                const pswSlug = generatePrivacySlug(p.first_name, p.last_name, p.home_city);
                const altText = generatePSWAltText(p.first_name, p.last_name.charAt(0), p.home_city);
                return (
                  <article key={`${pswSlug}-${i}`} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      {p.profile_photo_url ? (
                        <img
                          src={p.profile_photo_url}
                          alt={altText}
                          width={44}
                          height={44}
                          loading={i < 3 ? "eager" : "lazy"}
                          className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {p.first_name} {p.last_name.charAt(0)}.
                        </h3>
                        {p.home_city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {p.home_city}
                          </p>
                        )}
                      </div>
                    </div>
                    {p.languages && p.languages.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                        <Globe className="w-3 h-3" />
                        {p.languages.map((l) => langName(l)).join(", ")}
                      </p>
                    )}
                    <Link to={`/psw/profile/${pswSlug}`}>
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        View Profile
                      </Button>
                    </Link>
                  </article>
                );
              })}
            </div>

            <div className="text-center">
              <Link to="/psw-directory" className="text-sm text-primary underline">
                Browse all PSWs in Ontario →
              </Link>
            </div>
          </section>
        )}

        {/* Services */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              PSW Services Available in {city}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Personal Care & Senior Care</h3>
                <p className="text-sm text-muted-foreground">
                  In-home personal support for seniors and individuals who need assistance with bathing, grooming,
                  mobility, and daily living activities in {city}.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Companionship & In-Home Support</h3>
                <p className="text-sm text-muted-foreground">
                  Friendly companionship and supervision for loved ones who need someone present for safety,
                  social engagement, and emotional wellbeing.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Hospital Discharge Support</h3>
                <p className="text-sm text-muted-foreground">
                  Safe transition from hospital to home with a qualified personal support worker who provides
                  post-discharge care and recovery assistance.
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Doctor Escort Services</h3>
                <p className="text-sm text-muted-foreground">
                  Accompaniment to doctor visits, specialist appointments, and medical procedures with reliable
                  transportation support in {city}.
                </p>
              </div>
            </div>
            {/* Service page links */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-foreground mb-3 text-center">Specialized Care in {city}</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {serviceLinks.map((s) => (
                  <Link key={s.slug} to={`/${s.slug}`} className="text-sm text-primary hover:underline px-2 py-1">
                    {s.label} in {city}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-8">
              Transparent PSW Pricing in {city}
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border flex-1 min-w-[220px]">
                <h3 className="font-semibold text-foreground text-lg">Home Care Visits</h3>
                <p className="text-primary text-3xl font-bold mt-2">$30</p>
                <p className="text-muted-foreground text-sm mt-1">per hour</p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border flex-1 min-w-[220px]">
                <h3 className="font-semibold text-foreground text-lg">Doctor Escort Visits</h3>
                <p className="text-primary text-3xl font-bold mt-2">$35</p>
                <p className="text-muted-foreground text-sm mt-1">per hour</p>
              </div>
            </div>
            <div className="mt-8">
              <a href="https://psadirect.ca/">
                <Button size="lg" className="text-lg px-8 py-6">
                  Book a Personal Support Worker
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-12 bg-muted/30 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              Frequently Asked Questions About PSW Care in {city}
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-card rounded-xl p-5 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nearby cities & service cross-links */}
        <section className="px-4 py-8 max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-foreground mb-3">Also Serving Nearby Areas</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {nearbyCities.map((nearCity) => {
              const nearSlug = nearCity.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
              return (
                <Link key={nearCity} to={`/psw-${nearSlug}`} className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">
                  PSWs in {nearCity}
                </Link>
              );
            })}
            <Link to={`/home-care-${citySlug}`} className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">
              Home Care {city}
            </Link>
            <Link to={`/psw-jobs-${citySlug}`} className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">
              PSW Jobs {city}
            </Link>
            <Link to={`/urgent-home-care-${citySlug}`} className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">
              Urgent Care {city}
            </Link>
            <Link to="/ontario-psw-locations" className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">
              All Ontario Locations →
            </Link>
          </div>
          {/* Nearby city service cross-links */}
          {nearbyCities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Specialized Care in Nearby Cities</h3>
              <div className="flex flex-wrap gap-1.5">
                {nearbyCities.slice(0, 4).flatMap((nearCity) => {
                  const ns = nearCity.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                  return [
                    <Link key={`dem-${ns}`} to={`/dementia-care-${ns}`} className="text-xs text-primary hover:underline bg-muted px-2 py-0.5 rounded-full">
                      Dementia Care {nearCity}
                    </Link>,
                    <Link key={`sen-${ns}`} to={`/senior-home-care-${ns}`} className="text-xs text-primary hover:underline bg-muted px-2 py-0.5 rounded-full">
                      Senior Care {nearCity}
                    </Link>,
                  ];
                })}
              </div>
            </div>
          )}
        </section>

        {/* Popular PSW Services Link Cluster */}
        <section className="px-4 py-10 max-w-4xl mx-auto border-t border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">Popular PSW Services in {city}</h2>
          <nav aria-label={`PSW services in ${city}`} className="flex flex-wrap gap-2">
            {[
              { label: `Personal Support Worker ${city}`, to: `/psw-${citySlug}` },
              { label: `Emergency Home Care ${city}`, to: `/emergency-home-care-${citySlug}` },
              { label: `Same Day Home Care ${city}`, to: `/same-day-home-care-${citySlug}` },
              { label: `Home Care Services ${city}`, to: `/home-care-${citySlug}` },
              { label: `Overnight PSW Care ${city}`, to: `/overnight-care-${citySlug}` },
              { label: `Senior Home Care ${city}`, to: `/senior-home-care-${citySlug}` },
              { label: `Dementia Home Care ${city}`, to: `/dementia-care-${citySlug}` },
              { label: `PSW Jobs in ${city}`, to: `/psw-jobs-${citySlug}` },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="text-sm text-primary hover:underline bg-muted px-3 py-1.5 rounded-full">
                {link.label}
              </Link>
            ))}
          </nav>
        </section>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              {seoFooterLinks.map((link) => (
                <Link key={link.to} to={link.to} className="text-sm opacity-80 hover:opacity-100 hover:underline">
                  {link.label}
                </Link>
              ))}
            </div>
            <p className="text-sm opacity-80 mb-2">
              Proudly serving {city}, Toronto, the GTA, and communities across Ontario.
            </p>
            <p className="text-sm opacity-80 mb-4">Quality personal support care for Ontario families</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SEOCityLandingPage;

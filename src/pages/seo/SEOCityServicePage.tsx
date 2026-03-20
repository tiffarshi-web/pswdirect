import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, Heart, Phone, MapPin, Globe, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, buildProfessionalService, generatePrivacySlug, generatePSWAltText, getNearbyCities } from "@/lib/seoUtils";
import { langName, buildFAQSchema, getServiceFAQs, seoFooterLinks } from "@/lib/seoShared";
import PrivateHomeCareSection from "@/components/seo/PrivateHomeCareSection";

interface SEOCityServicePageProps {
  city: string;
  service: string;
  serviceLabel: string;
  slug: string;
}

interface PSWListItem {
  first_name: string;
  last_name: string;
  home_city: string | null;
  years_experience: string | null;
  languages: string[] | null;
  gender: string | null;
  profile_photo_url: string | null;
}

const ITEMS_PER_PAGE = 20;

const serviceIcon = (service: string) => {
  switch (service) {
    case "personal-care": return <Heart className="w-6 h-6 text-primary" />;
    case "companionship": return <Users className="w-6 h-6 text-primary" />;
    case "mobility-support": return <Shield className="w-6 h-6 text-primary" />;
    case "doctor-escort": return <Clock className="w-6 h-6 text-primary" />;
    case "dementia-care": return <Heart className="w-6 h-6 text-primary" />;
    case "alzheimers-care": return <Heart className="w-6 h-6 text-primary" />;
    case "overnight-care": return <Clock className="w-6 h-6 text-primary" />;
    case "24-hour-home-care": return <Clock className="w-6 h-6 text-primary" />;
    case "post-surgery-care": return <Shield className="w-6 h-6 text-primary" />;
    case "palliative-care": return <Heart className="w-6 h-6 text-primary" />;
    case "respite-care": return <Users className="w-6 h-6 text-primary" />;
    case "senior-home-care": return <Users className="w-6 h-6 text-primary" />;
    default: return <Heart className="w-6 h-6 text-primary" />;
  }
};

const serviceDescriptions: Record<string, string> = {
  "personal-care": "Our personal care PSWs assist with bathing, grooming, dressing, toileting, and other daily living activities. Every caregiver is credential-verified and trained to provide dignified, respectful support.",
  "companionship": "Companionship PSWs provide social engagement, emotional support, and daily supervision. Whether your loved one needs someone to talk to, play cards with, or simply be present for safety — our caregivers are here.",
  "mobility-support": "Mobility support PSWs help with walking assistance, wheelchair transfers, fall prevention, and safe movement around the home. Ideal for seniors recovering from surgery or living with mobility challenges.",
  "doctor-escort": "Doctor escort PSWs accompany your loved one to medical appointments, specialist visits, and hospital procedures. They provide transportation support and ensure your family member arrives safely.",
  "dementia-care": "Our dementia care PSWs are trained to support individuals living with dementia through patient, compassionate, and structured daily routines. They provide cognitive stimulation, safety monitoring, and help with personal care while maintaining the dignity and comfort of your loved one.",
  "alzheimers-care": "Alzheimer's care PSWs specialize in supporting individuals at various stages of Alzheimer's disease. They provide consistent routines, gentle redirection, wandering prevention, and personal care assistance — giving families peace of mind knowing their loved one is safe and supported.",
  "overnight-care": "Overnight care PSWs provide supervision and support during nighttime hours. They assist with bathroom trips, repositioning, medication reminders, and emergency response — ensuring your loved one is safe throughout the night.",
  "24-hour-home-care": "24-hour home care provides round-the-clock personal support through rotating PSW shifts. This service is ideal for individuals who require continuous supervision, assistance with daily activities, and immediate access to care at any time of day or night.",
  "post-surgery-care": "Post-surgery care PSWs help with recovery at home after a hospital procedure. They assist with wound care monitoring, mobility support, medication reminders, meal preparation, and personal hygiene — helping your loved one recover safely and comfortably.",
  "palliative-care": "Palliative care PSWs provide compassionate support for individuals with serious or life-limiting illnesses. They focus on comfort, dignity, pain management support, and emotional well-being for both the patient and their family.",
  "respite-care": "Respite care PSWs provide temporary relief for family caregivers. Whether you need a few hours, a full day, or regular weekly breaks, our caregivers step in seamlessly so you can rest, recharge, and take care of yourself.",
  "senior-home-care": "Senior home care PSWs provide comprehensive in-home support for aging adults. From personal care and meal preparation to companionship and mobility assistance, our caregivers help seniors live independently and safely in the comfort of their own home.",
};

const SEOCityServicePage = ({ city, service, serviceLabel, slug }: SEOCityServicePageProps) => {
  const [psws, setPsws] = useState<PSWListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const title = `${serviceLabel} in ${city} | PSW Direct`;
  const description = `Find Personal Support Workers in ${city} offering ${serviceLabel.toLowerCase()}. Book trusted home care services starting at $30/hour through PSW Direct.`;
  const canonicalUrl = `https://pswdirect.ca/${slug}`;
  const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const nearbyCities = getNearbyCities(city);
  const faqs = getServiceFAQs(serviceLabel, city);

  useEffect(() => {
    const fetchPSWs = async () => {
      const { data } = await (supabase as any)
        .from("psw_public_directory")
        .select("first_name, last_name, home_city, years_experience, languages, gender, profile_photo_url")
        .eq("home_city", city) as { data: any[] | null; error: any };
      if (data) setPsws(data as any);
      setLoading(false);
    };
    fetchPSWs();
  }, [city]);

  const filtered = useMemo(() => {
    if (!search) return psws;
    const q = search.toLowerCase();
    return psws.filter(
      (p) => p.first_name.toLowerCase().includes(q)
    );
  }, [psws, search]);

  const visible = filtered.slice(0, visibleCount);

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
            { name: `PSWs in ${city}`, url: `${SITE_URL}/psw-${citySlug}` },
            { name: `${serviceLabel} in ${city}`, url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HealthAndBeautyBusiness",
            name: `${serviceLabel} – PSW Direct ${city}`,
            description,
            provider: { "@type": "Organization", name: "PSW Direct", url: SITE_URL },
            areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario, Canada" } },
            serviceType: serviceLabel,
            offers: { "@type": "Offer", priceSpecification: { "@type": "PriceSpecification", price: "30", priceCurrency: "CAD", unitText: "per hour" } },
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
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            {serviceIcon(service)}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            {serviceLabel} in {city}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-4">
            PSW Direct connects families with vetted Personal Support Workers (PSWs) across {city} and surrounding areas
            for trusted {serviceLabel.toLowerCase()} services.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            {serviceDescriptions[service]}
          </p>
          <a href="https://pswdirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
        </section>

        {/* Why families choose this service */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Why Families in {city} Choose PSW Direct</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              PSW Direct works like Uber for personal support workers. No agency contracts, no hidden fees — just 
              transparent pricing and vetted caregivers matched to your needs.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl p-5 border border-border text-center">
                <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1">Vetted & Police-Checked</h3>
                <p className="text-xs text-muted-foreground">Every PSW is credential-verified</p>
              </div>
              <div className="bg-card rounded-xl p-5 border border-border text-center">
                <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1">Book in Minutes</h3>
                <p className="text-xs text-muted-foreground">No contracts or commitments</p>
              </div>
              <div className="bg-card rounded-xl p-5 border border-border text-center">
                <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1">Starting at $30/hr</h3>
                <p className="text-xs text-muted-foreground">Transparent, affordable pricing</p>
              </div>
            </div>
          </div>
        </section>

        {/* PSW Listing */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Available PSWs for {serviceLabel} in {city}
          </h2>

          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Search PSWs in ${city}...`}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
                className="pl-10"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4 text-center">
            {loading ? "Loading..." : `${filtered.length} PSW${filtered.length !== 1 ? "s" : ""} found in ${city}`}
          </p>

          {!loading && filtered.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {visible.map((p, i) => {
                const pswSlug = generatePrivacySlug(p.first_name, p.last_name, p.home_city);
                const altText = generatePSWAltText(p.first_name, p.last_name.charAt(0), p.home_city);
                return (
                  <article key={`${pswSlug}-${i}`} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      {p.profile_photo_url ? (
                        <img src={p.profile_photo_url} alt={altText} loading="lazy" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
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
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {serviceLabel}
                      </span>
                    </div>
                    {p.languages && p.languages.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                        <Globe className="w-3 h-3" />
                        {p.languages.map((l) => langName(l)).join(", ")}
                      </p>
                    )}
                    <Link to={`/psw/profile/${pswSlug}`}>
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        View PSW Profile
                      </Button>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No PSWs currently listed in {city}. <Link to="/psw-directory" className="text-primary underline">Browse all PSWs in Ontario</Link>.
            </p>
          )}

          {visibleCount < filtered.length && (
            <div className="text-center mb-8">
              <Button variant="outline" onClick={() => setVisibleCount((v) => v + ITEMS_PER_PAGE)}>
                Load More ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </section>

        {/* FAQ */}
        <section className="px-4 py-12 bg-muted/30 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              {serviceLabel} FAQ – {city}
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

        {/* Home Care SEO Content */}
        <PrivateHomeCareSection city={city} hideInternalLinks />

        {/* Internal links */}
        <section className="px-4 py-8 max-w-4xl mx-auto">
          <div className="bg-muted/50 rounded-xl p-6 border border-border">
            <h2 className="text-lg font-bold text-foreground mb-3">More PSW Services</h2>
            <div className="flex flex-wrap gap-3">
              <Link to={`/psw-${citySlug}`} className="text-sm text-primary hover:underline">
                All PSWs in {city} →
              </Link>
              <Link to={`/home-care-${citySlug}`} className="text-sm text-primary hover:underline">
                Home Care in {city} →
              </Link>
              <Link to="/psw-directory" className="text-sm text-primary hover:underline">
                PSW Directory (Ontario) →
              </Link>
              <Link to="/coverage" className="text-sm text-primary hover:underline">
                Coverage Map →
              </Link>
              <Link to="/join-team" className="text-sm text-primary hover:underline">
                Become a PSW →
              </Link>
            </div>
            {/* Nearby cities */}
            {nearbyCities.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  {serviceLabel} also available in nearby areas:
                </p>
                <div className="flex flex-wrap gap-2">
                  {nearbyCities.map((nearCity) => {
                    const nearSlug = nearCity.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                    return (
                      <Link key={nearCity} to={`/${service}-${nearSlug}`} className="text-sm text-primary hover:underline">
                        {serviceLabel} in {nearCity}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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

export default SEOCityServicePage;

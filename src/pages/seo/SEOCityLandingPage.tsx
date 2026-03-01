import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, Heart, Phone, MapPin, Globe, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

interface SEOCityLandingPageProps {
  city: string;
  slug: string;
}

interface PSWListItem {
  first_name: string;
  last_name: string;
  home_city: string | null;
  years_experience: string | null;
  languages: string[] | null;
  gender: string | null;
}

const ITEMS_PER_PAGE = 20;

const generateSlug = (p: PSWListItem) =>
  `${p.first_name}-${p.last_name}-${p.home_city || "ontario"}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const langName = (code: string) => {
  const map: Record<string, string> = {
    en: "English", fr: "French", es: "Spanish", pt: "Portuguese",
    zh: "Chinese", hi: "Hindi", ar: "Arabic", tl: "Tagalog",
    ta: "Tamil", ur: "Urdu", pa: "Punjabi", bn: "Bengali",
    ko: "Korean", ja: "Japanese", de: "German", it: "Italian",
    ru: "Russian", pl: "Polish", uk: "Ukrainian", so: "Somali",
    am: "Amharic", sw: "Swahili", ha: "Hausa", yo: "Yoruba",
    ig: "Igbo", tw: "Twi", fa: "Farsi", tr: "Turkish",
    vi: "Vietnamese", th: "Thai", el: "Greek", nl: "Dutch",
    ro: "Romanian", hu: "Hungarian", cs: "Czech", hr: "Croatian",
    sr: "Serbian", bg: "Bulgarian", he: "Hebrew", km: "Khmer",
    my: "Burmese", ne: "Nepali", si: "Sinhala", ml: "Malayalam",
    te: "Telugu", kn: "Kannada", gu: "Gujarati", mr: "Marathi",
  };
  return map[code] || code;
};

const SEOCityLandingPage = ({ city, slug }: SEOCityLandingPageProps) => {
  const [psws, setPsws] = useState<PSWListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const title = `Personal Support Workers in ${city} | PSW Direct`;
  const description = `Find vetted Personal Support Workers in ${city} through PSW Direct. Book trusted in-home care including companionship, mobility assistance, and personal care.`;
  const canonicalUrl = `https://psadirect.ca/${slug}`;

  useEffect(() => {
    const fetchPSWs = async () => {
      const { data } = await supabase
        .from("psw_profiles")
        .select("first_name, last_name, home_city, years_experience, languages, gender")
        .eq("vetting_status", "approved")
        .eq("home_city", city);
      if (data) setPsws(data);
      setLoading(false);
    };
    fetchPSWs();
  }, [city]);

  const filtered = useMemo(() => {
    if (!search) return psws;
    const q = search.toLowerCase();
    return psws.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q)
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
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Personal Support Workers in ${city}`,
            description,
            provider: {
              "@type": "Organization",
              name: "PSW Direct",
              url: "https://psadirect.ca",
            },
            areaServed: {
              "@type": "City",
              name: city,
              containedInPlace: { "@type": "AdministrativeArea", name: "Ontario, Canada" },
            },
            serviceType: "Personal Support Worker",
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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Personal Support Workers in {city}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct connects families with vetted personal support workers (PSWs) in {city}.
            Book affordable home care services online in minutes with transparent pricing starting at $30 per hour.
          </p>
          <a href="https://psadirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
        </section>

        {/* PSW Directory for this city */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Available PSWs in {city}
          </h2>

          {/* Search */}
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
                const pswSlug = generateSlug(p);
                return (
                  <article key={`${pswSlug}-${i}`} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {p.first_name} {p.last_name}
                        </h3>
                        {p.home_city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {p.home_city}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">
                        <Heart className="w-3 h-3" /> Personal Care
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">
                        <Users className="w-3 h-3" /> Companionship
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">
                        <Shield className="w-3 h-3" /> Mobility
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

          <div className="text-center">
            <Link to="/psw-directory" className="text-sm text-primary underline">
              ← Browse all PSWs in Ontario
            </Link>
          </div>
        </section>

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

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">
              Proudly serving {city}, Toronto, the GTA, and communities across Ontario.
            </p>
            <p className="text-sm opacity-80 mb-4">
              Quality personal support care for Ontario families
            </p>
            <p className="text-xs opacity-60">
              © 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SEOCityLandingPage;

import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, Heart, Globe, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList, getNearbyCities } from "@/lib/seoUtils";
import { isTier1CityByLabel } from "@/lib/seoTierConfig";
import { getNearbyPSWsByCity, type NearbyPSW } from "@/lib/nearbyPSWs";
import { languageRoutes } from "./languageRoutes";
import { seoRoutes } from "./seoRoutes";

interface PSWLanguageCityPageProps {
  languageCode: string;
  languageLabel: string;
  city: string;
  slug: string;
  citySlug: string;
  languageSlug: string;
}

const ITEMS_PER_PAGE = 20;

const generateSlug = (p: NearbyPSW) =>
  `${p.first_name}-${p.last_name}-${p.home_city || "ontario"}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const langName = (code: string) => {
  const map: Record<string, string> = {
    en: "English", fr: "French", es: "Spanish", pt: "Portuguese",
    zh: "Mandarin Chinese", hi: "Hindi", ar: "Arabic", tl: "Tagalog",
    ta: "Tamil", ur: "Urdu", pa: "Punjabi", bn: "Bengali",
    ko: "Korean", ja: "Japanese", de: "German", it: "Italian",
    ru: "Russian", pl: "Polish", uk: "Ukrainian", so: "Somali",
    am: "Amharic", sw: "Swahili", fa: "Farsi", tr: "Turkish",
    vi: "Vietnamese", el: "Greek", gu: "Gujarati", mr: "Marathi",
    te: "Telugu", "zh-yue": "Cantonese",
  };
  return map[code] || code;
};

const PSWLanguageCityPage = ({
  languageCode,
  languageLabel,
  city,
  slug,
  citySlug,
  languageSlug,
}: PSWLanguageCityPageProps) => {
  const [psws, setPsws] = useState<NearbyPSW[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    const fetchPSWs = async () => {
      setLoading(true);
      const nearby = await getNearbyPSWsByCity(city, 50);
      // Filter by language
      const matched = nearby.filter(
        (p) => p.languages && p.languages.includes(languageCode)
      );
      setPsws(matched);
      setLoading(false);
    };
    fetchPSWs();
  }, [city, languageCode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return psws;
    const q = search.toLowerCase();
    return psws.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        (p.home_city && p.home_city.toLowerCase().includes(q))
    );
  }, [psws, search]);

  const visible = filtered.slice(0, visibleCount);

  const pageTitle = `${languageLabel} Speaking Personal Support Workers in ${city} | PSW Direct`;
  const pageDescription = `Find trusted ${languageLabel} speaking Personal Support Workers in ${city}. Book in-home care and companionship with PSW Direct.`;
  const canonicalUrl = `${SITE_URL}/${slug}`;

  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", url: SITE_URL },
    { name: "PSW Directory", url: `${SITE_URL}/psw-directory` },
    { name: `${languageLabel} PSWs`, url: `${SITE_URL}/${languageSlug}` },
    { name: `${languageLabel} PSWs in ${city}`, url: canonicalUrl },
  ]);

  const professionalServiceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${canonicalUrl}#service`,
    name: "PSW Direct",
    description: `${languageLabel} speaking Personal Support Workers in ${city}, Ontario.`,
    url: SITE_URL,
    telephone: "+1-249-288-4787",
    priceRange: "$30-$35",
    serviceType: ["Personal Support Worker", "Home Care Worker", "Elderly Caregiver"],
    knowsLanguage: languageLabel,
    areaServed: {
      "@type": "City",
      name: city,
      containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" },
    },
    provider: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {!isTier1CityByLabel(city) && <meta name="robots" content="noindex, follow" />}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbs)}</script>
        <script type="application/ld+json">{JSON.stringify(professionalServiceSchema)}</script>
      </Helmet>

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="PSW Direct" className="h-8 w-auto" />
            <span className="font-bold text-lg text-foreground">PSW Direct</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link to="/psw-directory" className="text-muted-foreground hover:text-foreground transition-colors">PSW Directory</Link>
            <Link to="/psw-near-me" className="text-muted-foreground hover:text-foreground transition-colors">PSW Near Me</Link>
            <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/psw-directory" className="hover:text-foreground">PSW Directory</Link>
          <span className="mx-2">/</span>
          <Link to={`/${languageSlug}`} className="hover:text-foreground">{languageLabel} PSWs</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{city}</span>
        </nav>

        {/* H1 */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          {languageLabel} Speaking Personal Support Workers in {city}
        </h1>

        {/* Intro */}
        <section className="mb-8">
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            PSW Direct connects families in {city} with vetted Personal Support Workers who speak {languageLabel}.
            Whether you need personal care, companionship, or mobility support, our {languageLabel} speaking
            caregivers provide culturally sensitive home care you can trust.
          </p>
        </section>

        {/* Value Props */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
            <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">{languageLabel} Speaking</p>
              <p className="text-xs text-muted-foreground">Caregivers fluent in {languageLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Serving {city}</p>
              <p className="text-xs text-muted-foreground">Within 50 km of {city} center</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Vetted & Police Checked</p>
              <p className="text-xs text-muted-foreground">Starting at $30/hour</p>
            </div>
          </div>
        </section>

        {/* Search & PSW List */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Available {languageLabel} Speaking Caregivers Near {city}
          </h2>
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground mt-3 text-sm">Loading caregivers...</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No {languageLabel} speaking PSWs found near {city}{search ? " matching your search" : ""}.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                <Link to={`/${languageSlug}`}>
                  <Button variant="outline">All {languageLabel} PSWs</Button>
                </Link>
                <Link to={`/${citySlug}`}>
                  <Button variant="outline">All PSWs in {city}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {filtered.length} {languageLabel} speaking PSW{filtered.length !== 1 ? "s" : ""} near {city}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visible.map((p, i) => (
                  <Link
                    key={i}
                    to={`/psw/profile/${generateSlug(p)}`}
                    className="block p-4 rounded-lg bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{p.first_name}</p>
                        {p.home_city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {p.home_city}
                            {p.distanceKm > 0 && <span>· {p.distanceKm} km</span>}
                          </p>
                        )}
                      </div>
                    </div>
                    {p.languages && p.languages.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.languages.map((l) => (
                          <span
                            key={l}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              l === languageCode
                                ? "bg-primary/10 text-primary font-medium"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {langName(l)}
                          </span>
                        ))}
                      </div>
                    )}
                    {p.years_experience && (
                      <p className="text-xs text-muted-foreground mt-2">{p.years_experience} experience</p>
                    )}
                  </Link>
                ))}
              </div>

              {visibleCount < filtered.length && (
                <div className="text-center mt-6">
                  <Button variant="outline" onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}>
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Why section */}
        <section className="mb-10 bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Why Choose a {languageLabel} Speaking PSW in {city}?
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            For families in {city}, having a caregiver who speaks {languageLabel} means better communication
            about medications, daily routines, and care preferences. This is especially important for seniors
            who may feel more comfortable expressing their needs in their native language.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            PSW Direct's {languageLabel} speaking caregivers serving {city} are vetted, police-checked,
            and trained to provide compassionate in-home support including personal care, companionship,
            mobility assistance, and doctor escort services.
          </p>
        </section>

        {/* Other languages in this city */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Other Personal Support Workers in {city}
          </h2>
          <div className="flex flex-wrap gap-2">
            {languageRoutes
              .filter((l) => l.code !== languageCode)
              .map((l) => {
                const lSlug = l.slug.replace("psw-language-", "");
                const cSlug = citySlug.replace("psw-", "");
                return (
                  <Link
                    key={l.code}
                    to={`/${lSlug}-psw-${cSlug}`}
                    className="px-3 py-1.5 rounded-full text-sm bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-foreground"
                  >
                    {l.label} PSW {city}
                  </Link>
                );
              })}
          </div>
        </section>

        {/* Nearby Cities */}
        {(() => {
          const nearby = getNearbyCities(city);
          if (nearby.length === 0) return null;
          // Map city names to their slugs from seoRoutes
          const cityToSlug: Record<string, string> = {};
          seoRoutes.forEach((r) => {
            if (r.slug.startsWith("psw-") && !cityToSlug[r.city]) {
              cityToSlug[r.city] = r.slug;
            }
          });
          const linkedCities = nearby.filter((c) => cityToSlug[c]);
          if (linkedCities.length === 0) return null;
          return (
            <section className="mb-10">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Nearby Cities
              </h2>
              <div className="flex flex-wrap gap-2">
                {linkedCities.map((c) => (
                  <Link
                    key={c}
                    to={`/${cityToSlug[c]}`}
                    className="px-3 py-1.5 rounded-full text-sm bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-foreground"
                  >
                    PSW {c}
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Explore More */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">Explore More</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to={`/${citySlug}`}
              className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-center"
            >
              <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium text-foreground text-sm">All PSWs in {city}</p>
            </Link>
            <Link
              to={`/${languageSlug}`}
              className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-center"
            >
              <Globe className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium text-foreground text-sm">All {languageLabel} PSWs</p>
            </Link>
            <Link
              to="/psw-directory"
              className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-center"
            >
              <Users className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium text-foreground text-sm">Full PSW Directory</p>
            </Link>
            <Link
              to="/psw-near-me"
              className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-center"
            >
              <Search className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium text-foreground text-sm">PSW Near Me</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-10 bg-primary/5 rounded-lg border border-primary/10">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Book a {languageLabel} Speaking Caregiver in {city}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Quality home care starting at $30/hour. All PSWs are vetted and police-checked.
          </p>
          <Link to="/">
            <Button size="lg" className="px-8">Book Now</Button>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-8 text-center text-sm text-muted-foreground">
        <p>PSW Direct — Quality personal support care for Ontario families</p>
        <p className="mt-1">© {new Date().getFullYear()} PSW Direct. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default PSWLanguageCityPage;

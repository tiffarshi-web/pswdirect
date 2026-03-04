import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, Heart, Globe, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { seoRoutes } from "./seoRoutes";
import { languageRoutes } from "./languageRoutes";

interface PSWLanguagePageProps {
  languageCode: string;
  languageLabel: string;
  slug: string;
}

interface PSWListItem {
  first_name: string;
  last_name: string;
  home_city: string | null;
  languages: string[] | null;
  gender: string | null;
  years_experience: string | null;
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
    zh: "Mandarin Chinese", hi: "Hindi", ar: "Arabic", tl: "Tagalog",
    ta: "Tamil", ur: "Urdu", pa: "Punjabi", bn: "Bengali",
    ko: "Korean", ja: "Japanese", de: "German", it: "Italian",
    ru: "Russian", pl: "Polish", uk: "Ukrainian", so: "Somali",
    am: "Amharic", sw: "Swahili", fa: "Farsi", tr: "Turkish",
    vi: "Vietnamese", th: "Thai", el: "Greek", nl: "Dutch",
    ro: "Romanian", hu: "Hungarian", cs: "Czech", hr: "Croatian",
    sr: "Serbian", gu: "Gujarati", mr: "Marathi", te: "Telugu",
    "zh-yue": "Cantonese",
  };
  return map[code] || code;
};

const PSWLanguagePage = ({ languageCode, languageLabel, slug }: PSWLanguagePageProps) => {
  const [psws, setPsws] = useState<PSWListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    const fetchPSWs = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("psw_public_directory")
        .select("first_name, last_name, home_city, languages, gender, years_experience")
        .contains("languages", [languageCode]) as { data: PSWListItem[] | null; error: any };

      if (!error && data) {
        setPsws(data);
      }
      setLoading(false);
    };
    fetchPSWs();
  }, [languageCode]);

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

  const pageTitle = `${languageLabel} Speaking Personal Support Workers | PSW Direct`;
  const pageDescription = `Find ${languageLabel} speaking Personal Support Workers in Ontario. Book trusted in-home care and companionship through PSW Direct.`;
  const canonicalUrl = `${SITE_URL}/${slug}`;

  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", url: SITE_URL },
    { name: "PSW Directory", url: `${SITE_URL}/psw-directory` },
    { name: `${languageLabel} Speaking PSWs`, url: canonicalUrl },
  ]);

  const professionalServiceSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${canonicalUrl}#service`,
    name: "PSW Direct",
    description: `${languageLabel} speaking Personal Support Workers in Ontario. Vetted home care workers providing in-home support, companionship, and personal care.`,
    url: SITE_URL,
    telephone: "+1-249-288-4787",
    priceRange: "$30-$35",
    serviceType: ["Personal Support Worker", "Home Care Worker", "Elderly Caregiver"],
    knowsLanguage: languageLabel,
    areaServed: { "@type": "AdministrativeArea", name: "Ontario, Canada" },
    provider: { "@id": `${SITE_URL}/#organization` },
  };

  // Get unique cities from PSWs for internal linking
  const pswCities = useMemo(() => {
    const cities = new Set<string>();
    psws.forEach((p) => {
      if (p.home_city) cities.add(p.home_city);
    });
    return Array.from(cities).sort();
  }, [psws]);

  // Other language pages for cross-linking
  const otherLanguages = languageRoutes.filter((r) => r.code !== languageCode).slice(0, 12);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
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
          <span className="text-foreground">{languageLabel} Speaking PSWs</span>
        </nav>

        {/* H1 */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          {languageLabel} Speaking Personal Support Workers
        </h1>

        {/* Intro */}
        <section className="mb-8">
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            Finding a caregiver who speaks {languageLabel} can make all the difference in the quality of home care.
            PSW Direct connects Ontario families with vetted Personal Support Workers who speak {languageLabel},
            ensuring clear communication and culturally sensitive care for your loved ones.
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
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Vetted & Police Checked</p>
              <p className="text-xs text-muted-foreground">All PSWs are credential-verified</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
            <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">Book in Minutes</p>
              <p className="text-xs text-muted-foreground">Starting at $30/hour</p>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Available {languageLabel} Speaking Caregivers
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
              <p className="text-muted-foreground">No {languageLabel} speaking PSWs found{search ? " matching your search" : ""}.</p>
              <Link to="/psw-directory">
                <Button variant="outline" className="mt-4">Browse All PSWs</Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {filtered.length} {languageLabel} speaking PSW{filtered.length !== 1 ? "s" : ""} available
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
                          </p>
                        )}
                      </div>
                    </div>
                    {p.languages && p.languages.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.languages.map((l) => (
                          <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {langName(l)}
                          </span>
                        ))
                        }
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

        {/* Why Language Matters */}
        <section className="mb-10 bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Why Choose a {languageLabel} Speaking PSW?
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Language is a critical factor in quality home care. A caregiver who speaks {languageLabel} can
            communicate clearly with your loved one about their needs, medications, and daily routines.
            This reduces misunderstandings, builds trust, and creates a more comfortable care environment.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            For seniors and individuals with cognitive challenges, hearing their native language can provide
            emotional comfort and reduce anxiety. PSW Direct makes it easy to find {languageLabel} speaking
            caregivers across Ontario.
          </p>
        </section>

        {/* Cities served */}
        {pswCities.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Cities with {languageLabel} Speaking PSWs
            </h2>
            <div className="flex flex-wrap gap-2">
              {pswCities.map((city) => {
                const cityRoute = seoRoutes.find(
                  (r) => r.city.toLowerCase() === city.toLowerCase()
                );
                return cityRoute ? (
                  <Link
                    key={city}
                    to={`/${cityRoute.slug}`}
                    className="text-sm px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {city}
                  </Link>
                ) : (
                  <span key={city} className="text-sm px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground">
                    {city}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* Other Languages */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Browse PSWs by Other Languages
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherLanguages.map((r) => (
              <Link
                key={r.slug}
                to={`/${r.slug}`}
                className="text-sm px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {r.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/psw-near-me"
            className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-center"
          >
            <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="font-medium text-foreground text-sm">Find PSWs Near You</p>
          </Link>
          <Link
            to="/psw-directory"
            className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-center"
          >
            <Users className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="font-medium text-foreground text-sm">Full PSW Directory</p>
          </Link>
          <Link
            to="/faq"
            className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-center"
          >
            <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="font-medium text-foreground text-sm">FAQ</p>
          </Link>
        </section>

        {/* CTA */}
        <section className="text-center py-10 bg-primary/5 rounded-lg border border-primary/10">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Book a {languageLabel} Speaking Caregiver
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Quality home care starts at $30/hour. All PSWs are vetted, police-checked, and ready to help.
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

export default PSWLanguagePage;

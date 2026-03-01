import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, MapPin, Search, ChevronDown, Globe, Heart, Shield, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

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

const PSWDirectory = () => {
  const [psws, setPsws] = useState<PSWListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("psw_profiles")
        .select("first_name, last_name, home_city, years_experience, languages, gender")
        .eq("vetting_status", "approved");
      if (data) setPsws(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const cities = useMemo(() => {
    const set = new Set<string>();
    psws.forEach((p) => p.home_city && set.add(p.home_city));
    return Array.from(set).sort();
  }, [psws]);

  const allLangs = useMemo(() => {
    const set = new Set<string>();
    psws.forEach((p) => p.languages?.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [psws]);

  const filtered = useMemo(() => {
    let list = psws;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          (p.home_city && p.home_city.toLowerCase().includes(q))
      );
    }
    if (cityFilter) list = list.filter((p) => p.home_city === cityFilter);
    if (langFilter) list = list.filter((p) => p.languages?.includes(langFilter));
    return list;
  }, [psws, search, cityFilter, langFilter]);

  const visible = filtered.slice(0, visibleCount);

  const metaTitle = "Personal Support Workers in Ontario | PSW Directory | PSW Direct";
  const metaDesc = "Browse vetted personal support workers across Ontario. Find a PSW by city or language. Book trusted home care starting at $30/hour on PSADIRECT.CA.";

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href="https://psadirect.ca/psw-directory" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content="https://psadirect.ca/psw-directory" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2">
                <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
                <span className="text-sm font-semibold text-foreground">PSW Direct</span>
              </Link>
              <a href="tel:2492884787" className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">(249) 288-4787</span>
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Personal Support Workers (PSWs) in Ontario
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-3xl">
            Browse credential-verified personal support workers available through PSW Direct.
            All caregivers on <strong>PSADIRECT.CA</strong> are screened, police-checked, and ready to
            provide quality home care across Ontario.
          </p>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or city..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <select
                value={cityFilter}
                onChange={(e) => { setCityFilter(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
                className="h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm text-foreground appearance-none cursor-pointer"
              >
                <option value="">All Cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={langFilter}
                onChange={(e) => { setLangFilter(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
                className="h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm text-foreground appearance-none cursor-pointer"
              >
                <option value="">All Languages</option>
                {allLangs.map((l) => <option key={l} value={l}>{langName(l)}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            {loading ? "Loading..." : `${filtered.length} PSW${filtered.length !== 1 ? "s" : ""} found`}
          </p>

          {/* PSW Cards */}
          {!loading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {visible.map((p, i) => {
                const slug = generateSlug(p);
                return (
                  <article key={`${slug}-${i}`} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-foreground text-sm truncate">
                          {p.first_name} {p.last_name}
                        </h2>
                        {p.home_city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {p.home_city}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Services snippet */}
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

                    {/* Languages */}
                    {p.languages && p.languages.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                        <Globe className="w-3 h-3" />
                        {p.languages.map((l) => langName(l)).join(", ")}
                      </p>
                    )}

                    <Link to={`/psw/profile/${slug}`}>
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        View PSW Profile
                      </Button>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {visibleCount < filtered.length && (
            <div className="text-center mb-10">
              <Button variant="outline" onClick={() => setVisibleCount((v) => v + ITEMS_PER_PAGE)}>
                Load More ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}

          {/* CTA */}
          <div className="text-center py-8">
            <a href="https://psadirect.ca/">
              <Button size="lg" className="text-lg px-8 py-6">
                Book a Personal Support Worker
              </Button>
            </a>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-4">Quality personal support care for Ontario families</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PSWDirectory;

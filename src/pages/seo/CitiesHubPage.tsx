import SeoCallCta from "@/components/seo/SeoCallCta";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { languageRoutes } from "./languageRoutes";
import { SEO_CITIES } from "@/lib/seoCityData";
import { SEO_SERVICES } from "./languageServiceCityRoutes";

// "caregiver" is consolidated into /{lang}-speaking-psw-{city}; never link the alias.
const HUB_SERVICES = SEO_SERVICES.filter((s) => s.key !== "caregiver");
import { SITE_URL } from "@/lib/seoUtils";
import { isSitemapEligiblePath, seoEligibilityManifest } from "@/lib/seoEligibilityManifest";

const TOP_LANGUAGES = languageRoutes.filter((l) =>
  ["pa", "hi", "ur", "ar", "ta", "zh", "tl", "it", "fr", "es"].includes(l.code)
);

const CitiesHubPage = () => {
  const canonical = `${SITE_URL}/cities`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cities", item: canonical },
    ],
  };

  return (
    <>
      <Helmet>
        <title>PSW Services by City – Ontario Home Care | PSW Direct</title>
        <meta name="description" content="Find personal support workers in your Ontario city. Browse multilingual home care, caregiver, and PSW services in Toronto, Brampton, Mississauga, Vaughan, Barrie and 30+ cities." />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content="PSW Services by City – Ontario" />
        <meta property="og:description" content="Browse multilingual PSW services across 35+ Ontario cities." />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <nav className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2">›</span>
            <span>Cities</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Home Care &amp; PSW Services by City
          </h1>
          <div className="mb-6"><SeoCallCta /></div>
          <p className="text-muted-foreground mb-10 max-w-3xl">
            Browse Ontario care topics and nearby caregiver directories. Timing, language matching and suitability depend on a caregiver accepting your specific request.
          </p>

          <div className="space-y-10">
            {SEO_CITIES.filter(city => seoEligibilityManifest.activeCityKeys.includes(city.key)).map((city) => (
              <section key={city.key} id={city.key}>
                <h2 className="text-xl font-semibold text-foreground mb-3 border-b border-border pb-2">
                  {city.label}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {TOP_LANGUAGES.flatMap((lang) => {
                    const langSlug = lang.slug.replace("psw-language-", "");
                    return [
                      <Link
                        key={`${langSlug}-speaking-psw-${city.key}`}
                        to={`/${langSlug}-speaking-psw-${city.key}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {lang.label} Speaking PSW {city.label}
                      </Link>,
                      ...HUB_SERVICES.slice(0, 1).map((svc) => (
                        <Link
                          key={`${langSlug}-${svc.key}-${city.key}`}
                          to={`/${langSlug}-${svc.key}-${city.key}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {lang.label} {svc.label} {city.label}
                        </Link>
                      )),
                    ].filter(link => isSitemapEligiblePath(link.props.to));
                  })}
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {(seoEligibilityManifest.localLandingPages ?? []).filter(page => page.cityKey === city.key).map(page => (
                    <li key={page.path}><Link to={page.path} className="text-sm text-primary hover:underline">{page.label} in {city.label}</Link></li>
                  ))}
                  {(seoEligibilityManifest.languageCarePages ?? []).filter(page => page.cityKey === city.key).map(page => (
                    <li key={page.path}><Link to={page.path} className="text-sm text-primary hover:underline">{page.languageLabel} {page.label} in {city.label}</Link></li>
                  ))}
                  {isSitemapEligiblePath(`/psw-jobs-${city.key}`) && <li><Link to={`/psw-jobs-${city.key}`} className="text-sm text-primary hover:underline">PSW recruitment in {city.label}</Link></li>}
                </ul>
                <div className="flex gap-4 mt-2">
                  {isSitemapEligiblePath(`/psw-${city.key}`) &&
                  <Link
                    to={`/psw-${city.key}`}
                    className="text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    All PSWs in {city.label} →
                  </Link>}
                  {isSitemapEligiblePath(`/home-care-${city.key}`) && <Link
                    to={`/home-care-${city.key}`}
                    className="text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    Home Care {city.label} →
                  </Link>}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <Link to="/languages" className="text-primary hover:underline mr-4">Browse by Language</Link>
            <Link to="/psw-directory" className="text-primary hover:underline mr-4">PSW Directory</Link>
            <Link to="/personal-support-workers-ontario" className="text-primary hover:underline">Ontario PSWs</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default CitiesHubPage;

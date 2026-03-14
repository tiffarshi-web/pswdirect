import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { languageRoutes } from "./languageRoutes";
import { SEO_CITIES } from "@/lib/seoCityData";
import { SEO_SERVICES } from "./languageServiceCityRoutes";
import { SITE_URL } from "@/lib/seoUtils";

const TOP_CITIES = SEO_CITIES.slice(0, 8);

const LanguagesHubPage = () => {
  const canonical = `${SITE_URL}/languages`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Languages", item: canonical },
    ],
  };

  return (
    <>
      <Helmet>
        <title>Multilingual PSW Services Across Ontario | PSW Direct</title>
        <meta name="description" content="Find personal support workers who speak your language. Browse PSW services in Punjabi, Hindi, Urdu, Arabic, Mandarin, Tamil and 20+ languages across Ontario cities." />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content="Multilingual PSW Services Across Ontario" />
        <meta property="og:description" content="Find personal support workers who speak your language across Ontario." />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <nav className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2">›</span>
            <span>Languages</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Multilingual Personal Support Workers in Ontario
          </h1>
          <p className="text-muted-foreground mb-10 max-w-3xl">
            PSW Direct connects you with caregivers who speak your language. Browse our network of verified personal support workers across {languageRoutes.length} languages and {SEO_CITIES.length}+ Ontario communities.
          </p>

          <div className="space-y-10">
            {languageRoutes.map((lang) => {
              const langSlug = lang.slug.replace("psw-language-", "");
              return (
                <section key={lang.code} id={langSlug}>
                  <h2 className="text-xl font-semibold text-foreground mb-3 border-b border-border pb-2">
                    <Link to={`/${lang.slug}`} className="hover:text-primary hover:underline">
                      {lang.label}-Speaking PSWs
                    </Link>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {SEO_SERVICES.map((svc) =>
                      TOP_CITIES.map((city) => (
                        <Link
                          key={`${langSlug}-${svc.key}-${city.key}`}
                          to={`/${langSlug}-${svc.key}-${city.key}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {lang.label} {svc.label} {city.label}
                        </Link>
                      ))
                    )}
                  </div>
                  <Link
                    to={`/${lang.slug}`}
                    className="inline-block mt-2 text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    View all {lang.label} PSWs →
                  </Link>
                </section>
              );
            })}
          </div>

          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <Link to="/cities" className="text-primary hover:underline mr-4">Browse by City</Link>
            <Link to="/psw-directory" className="text-primary hover:underline mr-4">PSW Directory</Link>
            <Link to="/personal-support-workers-ontario" className="text-primary hover:underline">Ontario PSWs</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default LanguagesHubPage;

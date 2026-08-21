import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/seoUtils";
import { resolveLegacySeoPath } from "@/pages/seo/legacyRedirects";

const NotFound = () => {
  const location = useLocation();
  const legacyTarget = resolveLegacySeoPath(location.pathname);

  useEffect(() => {
    if (legacyTarget) return;
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname, legacyTarget]);

  // Obsolete SEO slug with a known canonical destination: consolidate instead of
  // rendering a Soft 404.
  if (legacyTarget) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex,nofollow" />
          <meta name="googlebot" content="noindex,nofollow" />
          <link rel="canonical" href={`${SITE_URL}${legacyTarget}`} />
          <meta property="og:url" content={`${SITE_URL}${legacyTarget}`} />
        </Helmet>
        <Navigate to={legacyTarget} replace />
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Helmet>
        <title>Page Not Found | PSW Direct</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="googlebot" content="noindex,nofollow" />
      </Helmet>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;

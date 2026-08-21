import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { isPrivatePath } from "@/lib/seoIndexability";
import { isKnownPublicPath, isSitemapEligiblePath } from "@/lib/seoEligibilityManifest";

/**
 * Synchronous route-level robots owner. Its decision is generated before the
 * app bundle and never changes in response to client-side inventory requests.
 */
const RouteIndexabilityMeta = () => {
  const { pathname } = useLocation();
  const robots = isPrivatePath(pathname)
    ? "noindex,nofollow"
    : isKnownPublicPath(pathname)
      ? isSitemapEligiblePath(pathname) ? "index,follow" : "noindex,follow"
      : "noindex,nofollow";

  return (
    <Helmet>
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
    </Helmet>
  );
};

export default RouteIndexabilityMeta;
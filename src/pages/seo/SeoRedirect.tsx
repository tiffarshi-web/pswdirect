import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { SITE_URL } from "@/lib/seoUtils";

interface Props {
  /** Canonical destination slug (no leading slash). */
  to: string;
}

/**
 * Permanent consolidation redirect for obsolete / duplicate SEO URLs.
 *
 * Lovable static hosting cannot emit a dynamic server-side 301 for these
 * routes, so this is a client-side replace navigation, NOT an HTTP 301.
 * To stop the obsolete URL competing as a duplicate in search it:
 *  - declares the canonical destination (never itself),
 *  - declares noindex,follow,
 *  - navigates before any page content renders.
 */
const SeoRedirect = ({ to }: Props) => {
  const target = to.startsWith("/") ? to : `/${to}`;
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href={`${SITE_URL}${target}`} />
        <meta property="og:url" content={`${SITE_URL}${target}`} />
      </Helmet>
      <Navigate to={target} replace />
    </>
  );
};

export default SeoRedirect;

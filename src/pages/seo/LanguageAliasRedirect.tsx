import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { SITE_URL } from "@/lib/seoUtils";

interface Props {
  /** Canonical /{lang}-speaking-psw-{city} slug this alias resolves to. */
  canonicalSlug: string;
}

/**
 * Legacy /{lang}-psw-{city} alias handler.
 *
 * Lovable static hosting cannot emit a dynamic server-side 301/308 for these
 * routes, so this is a client-side replace navigation, NOT an HTTP redirect.
 * To stop the alias competing as a duplicate in search:
 *  - it declares the long canonical (never itself),
 *  - it declares noindex,follow,
 *  - it navigates to the canonical before any SEO page content renders.
 */
const LanguageAliasRedirect = ({ canonicalSlug }: Props) => (
  <>
    <Helmet>
      <meta name="robots" content="noindex,follow" />
      <link rel="canonical" href={`${SITE_URL}/${canonicalSlug}`} />
      <meta property="og:url" content={`${SITE_URL}/${canonicalSlug}`} />
    </Helmet>
    <Navigate to={`/${canonicalSlug}`} replace />
  </>
);

export default LanguageAliasRedirect;

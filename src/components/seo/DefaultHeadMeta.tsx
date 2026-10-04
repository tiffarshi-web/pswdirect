import { Helmet } from "react-helmet-async";

/**
 * Sitewide fallback head tags owned by Helmet.
 *
 * index.html marks its static description / og:* tags with data-rh so
 * react-helmet-async replaces them instead of appending a second copy. This
 * component re-supplies the same values for routes that don't declare their
 * own; any page-level <Helmet> with the same name/property wins (deeper wins).
 */
const DEFAULT_TITLE = "Home Care Services in Ontario | Book In-Home Care Online | PSW Direct";
const DEFAULT_DESCRIPTION =
  "Book trusted home care services across Ontario. Get professional in-home care, senior care, and personal support workers on demand. No contracts. Available 24/7.";

const DefaultHeadMeta = () => (
  <Helmet>
    <meta name="description" content={DEFAULT_DESCRIPTION} />
    <meta property="og:title" content={DEFAULT_TITLE} />
    <meta property="og:description" content={DEFAULT_DESCRIPTION} />
    <meta property="og:type" content="website" />
  </Helmet>
);

export default DefaultHeadMeta;

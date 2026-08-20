import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { isPrivatePath, isPswProfilePath, privateRobotsDirective } from "@/lib/seoIndexability";

/**
 * Emits `noindex` for account, authentication, checkout and booking-management
 * routes so Google never indexes a functional app screen.
 *
 * Rendered once inside the router. It deliberately renders nothing for public
 * SEO routes so that each landing page keeps sole ownership of its own robots
 * directive (Helmet dedupes `<meta name="robots">`, so two owners would fight).
 *
 * `/psw/profile/*` keeps its own page-level directive — that page distinguishes
 * a valid profile (noindex,follow) from a missing one (noindex,nofollow).
 */
const PrivateRouteMeta = () => {
  const { pathname } = useLocation();

  if (!isPrivatePath(pathname) || isPswProfilePath(pathname)) return null;

  return (
    <Helmet>
      <meta name="robots" content={privateRobotsDirective(pathname)} />
      <meta name="googlebot" content={privateRobotsDirective(pathname)} />
    </Helmet>
  );
};

export default PrivateRouteMeta;

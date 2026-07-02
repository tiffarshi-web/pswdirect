import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { cityToSlug, getNearbyCities, SEO_CITIES } from "@/lib/seoCityData";
import { EXPANDED_SERVICE_CONTENT } from "@/pages/seo/expandedServiceContent";

/**
 * Shared internal-linking block for city + service SEO pages.
 * Renders:
 *   1. "Related Care Services in {City}" (18 canonical services)
 *   2. Parent-service hub back-link
 *   3. "Nearby Communities We Serve" (8–12 cities, service-scoped when possible)
 *
 * Purely additive — does not affect metadata, canonicals, robots, or schema.
 */

interface Props {
  city: string;
  /** Current service key (e.g. "post-surgery-care"). Used to skip self-links and scope nearby links. */
  currentServiceKey?: string;
  /** Human label for the current service, for the hub back-link copy. */
  currentServiceLabel?: string;
}

// Canonical list of related services requested by SEO plan.
// Each entry resolves to an existing route:
//   - If `expandedKey` is in EXPANDED_SERVICE_CONTENT, we link to /{expandedKey}-{citySlug}
//   - Otherwise we fall back to `hub` (an existing hub URL) or /{fallbackCityPrefix}-{citySlug}
interface RelatedService {
  label: string;
  /** Slug that exists in EXPANDED_SERVICE_CONTENT — used to build city-scoped URL. */
  expandedKey?: string;
  /** City-prefixed slug pattern for legacy routes (e.g. "home-care", "psw"). */
  cityPrefix?: string;
  /** Fallback Ontario-wide hub URL. */
  hub?: string;
}

const RELATED_SERVICES: RelatedService[] = [
  { label: "Home Care", cityPrefix: "home-care" },
  { label: "Senior Home Care", expandedKey: "senior-home-care", hub: "/senior-home-care" },
  { label: "Personal Support Worker", cityPrefix: "psw" },
  { label: "Personal Care", expandedKey: "personal-care-assistance" },
  { label: "Companion Care", expandedKey: "companion-care" },
  { label: "Respite Care", expandedKey: "family-caregiver-relief" },
  { label: "Dementia Care", expandedKey: "memory-care" },
  { label: "Alzheimer's Care", expandedKey: "memory-care" },
  { label: "Overnight Care", hub: "/overnight-home-care" },
  { label: "24-Hour Home Care", hub: "/24-hour-home-care" },
  { label: "Post-Surgery Care", expandedKey: "post-surgery-care", hub: "/hospital-discharge-care" },
  { label: "Hospital Discharge Care", hub: "/hospital-discharge-care" },
  { label: "Doctor Escort", hub: "/doctor-escort-service" },
  { label: "Private Caregiver", expandedKey: "private-caregiver", hub: "/private-caregiver" },
  { label: "Same-Day Home Care", expandedKey: "same-day-home-care", hub: "/same-day-home-care" },
  { label: "Palliative Care", expandedKey: "palliative-home-care" },
  { label: "Stroke Recovery Care", expandedKey: "stroke-recovery-care" },
  { label: "Mobility Assistance", expandedKey: "mobility-assistance" },
];

const FALLBACK_MAJOR_CITIES = [
  "Toronto", "Mississauga", "Brampton", "Vaughan", "Markham", "Hamilton",
  "Barrie", "Ottawa", "London", "Kitchener", "Waterloo", "Guelph",
];

function buildServiceUrl(svc: RelatedService, citySlug: string): string | null {
  if (svc.expandedKey && EXPANDED_SERVICE_CONTENT[svc.expandedKey]) {
    return `/${svc.expandedKey}-${citySlug}`;
  }
  if (svc.cityPrefix) {
    return `/${svc.cityPrefix}-${citySlug}`;
  }
  if (svc.hub) return svc.hub;
  return null;
}

const RelatedServiceLinks = ({ city, currentServiceKey, currentServiceLabel }: Props) => {
  const citySlug = cityToSlug(city);

  // Dedupe URLs and skip self
  const seen = new Set<string>();
  const services = RELATED_SERVICES.map((s) => {
    const url = buildServiceUrl(s, citySlug);
    if (!url) return null;
    if (currentServiceKey && s.expandedKey === currentServiceKey) return null;
    if (seen.has(url)) return null;
    seen.add(url);
    return { label: s.label, url };
  }).filter(Boolean) as { label: string; url: string }[];

  // Nearby: prefer database entries, then top up from major cities
  const nearbyRaw = getNearbyCities(city);
  const pool: string[] = [];
  for (const n of nearbyRaw) if (n !== city && !pool.includes(n)) pool.push(n);
  if (pool.length < 8) {
    for (const n of FALLBACK_MAJOR_CITIES) {
      if (n === city) continue;
      if (pool.includes(n)) continue;
      pool.push(n);
      if (pool.length >= 12) break;
    }
  }
  const nearby = pool.slice(0, 12);

  // Parent hub back-link
  const parentHubUrl =
    currentServiceKey && EXPANDED_SERVICE_CONTENT[currentServiceKey]
      ? `/home-care-ontario`
      : "/home-care-ontario";

  return (
    <>
      {/* Related Care Services in {City} */}
      <section
        className="px-4 py-12 border-t border-border bg-background"
        aria-label={`Related care services in ${city}`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Related Care Services in {city}
          </h2>
          <p className="text-muted-foreground mb-6">
            Explore other trusted in-home care options families in {city} book through PSW Direct.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            {services.map((s) => (
              <li key={s.url}>
                <Link
                  to={s.url}
                  className="text-primary hover:underline inline-flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {s.label} in {city}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {currentServiceLabel && (
            <p className="mt-8 text-muted-foreground">
              Learn more about our{" "}
              <Link to={parentHubUrl} className="text-primary hover:underline font-medium">
                Ontario-wide {currentServiceLabel} services
              </Link>{" "}
              or browse{" "}
              <Link to="/home-care-services" className="text-primary hover:underline font-medium">
                every home care service
              </Link>{" "}
              we offer.
            </p>
          )}
        </div>
      </section>

      {/* Nearby Communities We Serve */}
      {nearby.length > 0 && (
        <section
          className="px-4 py-12 bg-muted/40 border-t border-border"
          aria-label="Nearby communities we serve"
        >
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Nearby Communities We Serve
            </h2>
            <p className="text-muted-foreground mb-6">
              PSW Direct dispatches vetted caregivers across the region around {city}. Browse
              home care in nearby Ontario communities:
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {nearby.map((n) => {
                const nSlug = cityToSlug(n);
                const url =
                  currentServiceKey && EXPANDED_SERVICE_CONTENT[currentServiceKey]
                    ? `/${currentServiceKey}-${nSlug}`
                    : `/home-care-${nSlug}`;
                return (
                  <li key={n}>
                    <Link
                      to={url}
                      className="text-primary hover:underline inline-flex items-center gap-1.5 text-sm"
                    >
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {currentServiceLabel ? `${currentServiceLabel} in ${n}` : `Home Care in ${n}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-sm text-muted-foreground">
              See our{" "}
              <Link to="/cities" className="text-primary hover:underline font-medium">
                full Ontario coverage map
              </Link>{" "}
              for every community we serve.
            </p>
          </div>
        </section>
      )}
    </>
  );
};

// Compact popular-cities list for Ontario-wide service hub pages.
export const PopularCityLinks = ({
  serviceKey,
  serviceLabel,
  pathBuilder,
}: {
  serviceKey?: string;
  serviceLabel: string;
  /** Optional: build path per city. Defaults to /home-care-{slug}. */
  pathBuilder?: (citySlug: string) => string;
}) => {
  const CITIES = [
    "Toronto", "Mississauga", "Brampton", "Vaughan", "Markham", "Hamilton",
    "Barrie", "Ottawa", "London", "Kitchener", "Waterloo", "Cambridge",
    "Guelph", "Windsor", "Kingston", "Sudbury",
  ];
  const build = pathBuilder
    ?? ((slug: string) =>
      serviceKey && EXPANDED_SERVICE_CONTENT[serviceKey]
        ? `/${serviceKey}-${slug}`
        : `/home-care-${slug}`);

  return (
    <section
      className="px-4 py-12 bg-muted/40 border-t border-border"
      aria-label={`${serviceLabel} in popular Ontario cities`}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {serviceLabel} in Popular Ontario Cities
        </h2>
        <p className="text-muted-foreground mb-6">
          PSW Direct provides {serviceLabel.toLowerCase()} across every major Ontario city:
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {CITIES.map((c) => {
            const slug = cityToSlug(c);
            return (
              <li key={c}>
                <Link
                  to={build(slug)}
                  className="text-primary hover:underline inline-flex items-center gap-1.5 text-sm"
                >
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{serviceLabel} in {c}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

// Prevent tree-shaking of SEO_CITIES import warning
void SEO_CITIES;

export default RelatedServiceLinks;

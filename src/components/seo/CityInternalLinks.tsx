import { Link } from "react-router-dom";
import { MapPin, Heart, Search, TrendingUp } from "lucide-react";
import { getNearbyCities, cityToSlug, SEO_CITIES } from "@/lib/seoCityData";

/**
 * Reusable internal-linking block for SEO city/service pages.
 * Renders three crawlable sections:
 *   - Nearby Locations (3–5 nearby cities)
 *   - Our Services (Home Care, Doctor Escort, Hospital Discharge)
 *   - Popular Searches (PSW near me, Home care near me, Private home care)
 *
 * All links are real <a href> elements (react-router <Link> renders <a href>).
 */

interface CityInternalLinksProps {
  /** City label (e.g. "Toronto"). Optional — when omitted, Nearby section uses top cities. */
  city?: string;
  /** URL path prefix for nearby city links. Defaults to /home-care- */
  nearbyPathPrefix?: string;
}

const FALLBACK_NEARBY = SEO_CITIES.slice(0, 5).map((c) => c.label);

const SERVICES = [
  { label: "Home Care", to: "/home-care-services" },
  { label: "Doctor Escort", to: "/doctor-escort-service" },
  { label: "Hospital Discharge", to: "/hospital-discharge-care" },
];

const POPULAR = [
  { label: "PSW Near Me", to: "/psw-near-me" },
  { label: "Home Care Near Me", to: "/home-care-near-me" },
  { label: "Private Home Care", to: "/private-home-care" },
];

/**
 * "People also searched for" — rotating anchor variants per destination
 * to vary text across pages and reduce duplicate-content signals.
 */
const ALSO_SEARCHED: { to: string; variants: string[] }[] = [
  {
    to: "/senior-care-near-me",
    variants: ["Senior care near me", "Senior care services nearby", "Find senior care near you", "Local senior care options"],
  },
  {
    to: "/in-home-care-services",
    variants: ["In-home caregiver services", "In-home care services", "At-home caregiver support", "Personal in-home care"],
  },
  {
    to: "/overnight-home-care",
    variants: ["Overnight home care", "Overnight caregiver service", "Nighttime home care", "24-hour overnight care"],
  },
  {
    to: "/companionship-for-seniors",
    variants: ["Companion care services", "Senior companionship care", "Companion care for elderly", "Companionship visits"],
  },
  {
    to: "/senior-home-care",
    variants: ["Senior home care", "Home care for seniors", "Elderly home care services", "Senior at-home support"],
  },
];

const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const CityInternalLinks = ({ city, nearbyPathPrefix = "/home-care-" }: CityInternalLinksProps) => {
  const nearbyRaw = city ? getNearbyCities(city) : [];
  const nearby = (nearbyRaw.length > 0 ? nearbyRaw : FALLBACK_NEARBY)
    .filter((n) => !city || n.toLowerCase() !== city.toLowerCase())
    .slice(0, 5);

  const seed = hashStr(city ?? "ontario");
  const alsoSearched = ALSO_SEARCHED.map((entry, i) => ({
    to: entry.to,
    label: entry.variants[(seed + i) % entry.variants.length],
  }));

  return (
    <section
      className="px-4 py-10 border-t border-border bg-muted/30"
      aria-label="Internal navigation links"
    >
      <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-8">

        {/* Nearby Locations */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" />
            Nearby Locations
          </h2>
          <ul className="space-y-1.5">
            {nearby.map((label) => (
              <li key={label}>
                <Link
                  to={`${nearbyPathPrefix}${cityToSlug(label)}`}
                  className="text-sm text-primary hover:underline"
                >
                  Home Care in {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Our Services */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-primary" />
            Our Services
          </h2>
          <ul className="space-y-1.5">
            {SERVICES.map((s) => (
              <li key={s.to}>
                <Link to={s.to} className="text-sm text-primary hover:underline">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Popular Searches */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-primary" />
            Popular Searches
          </h2>
          <ul className="space-y-1.5">
            {POPULAR.map((p) => (
              <li key={p.to}>
                <Link to={p.to} className="text-sm text-primary hover:underline">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* People also searched for */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />
            People also searched for
          </h2>
          <ul className="space-y-1.5">
            {alsoSearched.map((p) => (
              <li key={p.to}>
                <Link to={p.to} className="text-sm text-primary hover:underline">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default CityInternalLinks;

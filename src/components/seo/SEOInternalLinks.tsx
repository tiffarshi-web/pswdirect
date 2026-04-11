import { Link } from "react-router-dom";
import { MapPin, Heart, BookOpen } from "lucide-react";

/**
 * Reusable crawlable internal linking block for SEO.
 * Used on homepage and SEO pages to boost crawl priority.
 */

const topCities = [
  { label: "Toronto", slug: "toronto" },
  { label: "Mississauga", slug: "mississauga" },
  { label: "Brampton", slug: "brampton" },
  { label: "Vaughan", slug: "vaughan" },
  { label: "Markham", slug: "markham" },
  { label: "Barrie", slug: "barrie" },
  { label: "Hamilton", slug: "hamilton" },
  { label: "Ottawa", slug: "ottawa" },
  { label: "Oakville", slug: "oakville" },
  { label: "Kitchener", slug: "kitchener" },
  { label: "London", slug: "london" },
  { label: "Richmond Hill", slug: "richmond-hill" },
];

const topServices = [
  { label: "Home Care Near Me", to: "/home-care-near-me" },
  { label: "Find a Caregiver Near You", to: "/caregiver-near-me" },
  { label: "PSW Near Me", to: "/psw-near-me" },
  { label: "Home Care in Toronto", to: "/home-care-toronto" },
  { label: "Help for Elderly Parents at Home", to: "/help-for-elderly-parents-at-home" },
  { label: "Home Care After Hospital Discharge", to: "/home-care-after-hospital-discharge" },
  { label: "Private Home Care Near You", to: "/private-home-care" },
  { label: "Senior Home Care", to: "/senior-home-care" },
  { label: "In-Home Care Services", to: "/in-home-care-services" },
  { label: "Home Care Services in Ontario", to: "/home-care-ontario" },
];

const topGuides = [
  { label: "How to Hire a PSW", to: "/guides/how-to-hire-a-personal-support-worker" },
  { label: "Cost of Home Care Ontario", to: "/guides/cost-of-home-care-ontario" },
  { label: "Hospital Discharge Checklist", to: "/guides/hospital-discharge-checklist" },
  { label: "PSW vs Nurse", to: "/guides/psw-vs-nurse-difference" },
];

interface SEOInternalLinksProps {
  /** Hide city currently being viewed */
  excludeCity?: string;
  /** Compact mode for SEO subpages */
  compact?: boolean;
}

const SEOInternalLinks = ({ excludeCity, compact = false }: SEOInternalLinksProps) => {
  const cities = excludeCity
    ? topCities.filter((c) => c.label.toLowerCase() !== excludeCity.toLowerCase())
    : topCities;

  return (
    <section className="px-4 py-10 border-t border-border bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-lg font-bold text-foreground mb-6 text-center">
          Home Care Across Ontario
        </h2>

        <div className={`grid ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-8`}>
          {/* City Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              Home Care by City
            </h3>
            <ul className="space-y-1.5">
              {cities.slice(0, compact ? 8 : 12).map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/home-care-${c.slug}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Home Care in {c.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/cities" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                  View all cities →
                </Link>
              </li>
            </ul>
          </div>

          {/* Service Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-primary" />
              Services
            </h3>
            <ul className="space-y-1.5">
              {topServices.map((s) => (
                <li key={s.to}>
                  <Link to={s.to} className="text-sm text-primary hover:underline">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Guides */}
          {!compact && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                Care Guides
              </h3>
              <ul className="space-y-1.5">
                {topGuides.map((g) => (
                  <li key={g.to}>
                    <Link to={g.to} className="text-sm text-primary hover:underline">
                      {g.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/guides" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                    All guides →
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SEOInternalLinks;

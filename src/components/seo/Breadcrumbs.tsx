import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cityToSlug } from "@/lib/seoCityData";

export interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  /** Convenience: auto-build Home > Ontario > City > Service */
  city?: string;
  service?: { label: string; href: string };
  /** Override the City link path (defaults to /home-care-{slug}) */
  cityHref?: string;
}

/**
 * Crawlable SEO breadcrumb trail. Renders real <a href> links via react-router <Link>.
 * Always starts with Home > Ontario, then optional City and Service.
 */
const Breadcrumbs = ({ items, city, service, cityHref }: BreadcrumbsProps) => {
  const trail: BreadcrumbItem[] = items ?? [
    { name: "Home", href: "/" },
    { name: "Ontario", href: "/home-care-ontario" },
    ...(city
      ? [{ name: city, href: cityHref ?? `/home-care-${cityToSlug(city)}` }]
      : []),
    ...(service ? [service] : []),
  ];

  return (
    <nav
      aria-label="Breadcrumb"
      className="px-4 py-3 bg-muted/30 border-b border-border"
    >
      <ol className="max-w-7xl mx-auto flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
        {trail.map((item, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={item.href + i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              {isLast ? (
                <span className="text-foreground font-medium" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link to={item.href} className="hover:text-primary hover:underline">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;

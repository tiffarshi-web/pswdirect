// GeocodeQualityBadge — surfaces how an order's address was resolved:
// exact vs. indirect fallback, confidence score, and any geocoding error.

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle2, HelpCircle, MapPinOff } from "lucide-react";

export interface GeocodeQualityFields {
  geocode_status?: string | null;
  geocode_confidence?: number | null;
  geocode_source?: string | null;
  geocode_error_code?: string | null;
  geocode_error_message?: string | null;
  geocode_raw_address?: string | null;
  geocode_attempts?: number | null;
  geocode_last_attempt_at?: string | null;
}

/** Human-readable label for each resilient-geocoder fallback stage. */
const SOURCE_LABELS: Record<string, string> = {
  full_address: "Exact street address",
  street_city_province: "Street + city (no postal code)",
  postal_full: "Postal code + city",
  postal_centroid: "Postal code centroid",
  postal_compact: "Partial postal code (FSA)",
  city_province: "City centre only",
  known_city_table: "Known-city lookup table",
  fsa_lookup: "Local FSA lookup",
  nominatim: "OpenStreetMap search",
  existing: "Previously stored coordinates",
  manual: "Manually corrected by admin",
};

/** Fallback stages that mean the pin is NOT the actual doorstep. */
const INDIRECT_SOURCES = new Set([
  "postal_centroid",
  "postal_compact",
  "city_province",
  "known_city_table",
  "fsa_lookup",
]);

export const formatGeocodeSource = (source?: string | null): string =>
  !source ? "Unknown method" : SOURCE_LABELS[source] || source.replace(/_/g, " ");

type Level = "exact" | "approximate" | "indirect" | "failed" | "unknown";

const resolveLevel = (g: GeocodeQualityFields): Level => {
  const status = (g.geocode_status || "").toLowerCase();
  if (status === "failed" || g.geocode_error_code) return "failed";
  if (!g.geocode_source && g.geocode_confidence == null) return "unknown";
  const confidence = g.geocode_confidence ?? 0;
  if (g.geocode_source && INDIRECT_SOURCES.has(g.geocode_source)) return "indirect";
  if (confidence < 0.4) return "indirect";
  if (confidence < 0.6) return "approximate";
  return "exact";
};

const LEVEL_META: Record<Level, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  exact: {
    label: "Address verified",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    Icon: CheckCircle2,
  },
  approximate: {
    label: "Approximate location",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    Icon: AlertTriangle,
  },
  indirect: {
    label: "Low confidence — resolved indirectly",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    Icon: AlertTriangle,
  },
  failed: {
    label: "Address could not be located",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    Icon: MapPinOff,
  },
  unknown: {
    label: "Location quality unknown",
    className: "bg-muted text-muted-foreground border-border",
    Icon: HelpCircle,
  },
};

interface Props {
  geocode: GeocodeQualityFields;
  /** Show the extra detail lines (source, raw address, error) under the badge. */
  showDetails?: boolean;
  className?: string;
}

export const GeocodeQualityBadge = ({ geocode, showDetails = true, className }: Props) => {
  const level = resolveLevel(geocode);
  const { label, className: badgeClass, Icon } = LEVEL_META[level];
  const confidencePct =
    geocode.geocode_confidence != null ? Math.round(geocode.geocode_confidence * 100) : null;

  const tooltip = [
    `Method: ${formatGeocodeSource(geocode.geocode_source)}`,
    confidencePct != null ? `Confidence: ${confidencePct}%` : null,
    geocode.geocode_attempts ? `Attempts: ${geocode.geocode_attempts}` : null,
    geocode.geocode_last_attempt_at
      ? `Last attempt: ${new Date(geocode.geocode_last_attempt_at).toLocaleString()}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`space-y-1 ${className || ""}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`gap-1 text-[11px] font-medium ${badgeClass}`}>
              <Icon className="w-3 h-3" />
              {label}
              {confidencePct != null && <span className="opacity-80">· {confidencePct}%</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showDetails && level !== "exact" && (
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          <p>Resolved via: {formatGeocodeSource(geocode.geocode_source)}</p>
          {geocode.geocode_raw_address && (
            <p className="break-words">Searched: “{geocode.geocode_raw_address}”</p>
          )}
          {(geocode.geocode_error_message || geocode.geocode_error_code) && (
            <p className="text-destructive break-words">
              {geocode.geocode_error_message || geocode.geocode_error_code}
            </p>
          )}
          {level !== "failed" && (
            <p>The map pin may not be the exact doorstep — confirm with the client before dispatch.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GeocodeQualityBadge;

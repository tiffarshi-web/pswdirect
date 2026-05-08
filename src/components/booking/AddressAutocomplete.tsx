// AddressAutocomplete — Nominatim (free OSM) backed address search
// Soft validation only: user can always type freely and submit unverified addresses.
// On selection, populates structured fields + stashes lat/lng/confidence on form data.

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, CheckCircle2 } from "lucide-react";

export interface ResolvedAddress {
  streetNumber: string;
  streetName: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  confidence: number; // 0..1 from Nominatim importance
  displayName: string;
}

interface NominatimSuggestion {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    state?: string;
    "ISO3166-2-lvl4"?: string;
    postcode?: string;
  };
}

interface Props {
  label?: string;
  placeholder?: string;
  value: string; // free-text street value (e.g. "175 Rutledge Rd")
  onChange: (value: string) => void; // called as user types
  onResolved: (resolved: ResolvedAddress) => void; // called when user picks a suggestion
  disabled?: boolean;
  className?: string;
  resolvedConfidence?: number | null; // for the small "verified" indicator
  id?: string;
}

const provinceCode = (s: NominatimSuggestion): string => {
  const iso = s.address?.["ISO3166-2-lvl4"];
  if (iso && iso.startsWith("CA-")) return iso.slice(3);
  const map: Record<string, string> = {
    Ontario: "ON",
    Quebec: "QC",
    "British Columbia": "BC",
    Alberta: "AB",
    Manitoba: "MB",
    Saskatchewan: "SK",
    "Nova Scotia": "NS",
    "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL",
    "Prince Edward Island": "PE",
  };
  return map[s.address?.state || ""] || "ON";
};

const cityFrom = (s: NominatimSuggestion): string => {
  const a = s.address || {};
  return a.city || a.town || a.village || a.hamlet || a.municipality || "";
};

export const AddressAutocomplete = ({
  label,
  placeholder,
  value,
  onChange,
  onResolved,
  disabled,
  className,
  resolvedConfidence,
  id,
}: Props) => {
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const lastQueryRef = useRef<string>("");

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced query
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 4 || trimmed === lastQueryRef.current) {
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      lastQueryRef.current = trimmed;
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ca&limit=6&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en-CA" },
        });
        if (res.ok) {
          const data: NominatimSuggestion[] = await res.json();
          setSuggestions(data);
          setOpen(data.length > 0);
          setActiveIdx(-1);
        }
      } catch {
        // silent — soft feature
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handlePick = (s: NominatimSuggestion) => {
    const a = s.address || {};
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    const street = `${a.house_number || ""} ${a.road || a.pedestrian || ""}`.trim();
    onChange(street || s.display_name.split(",")[0]);
    onResolved({
      streetNumber: a.house_number || "",
      streetName: a.road || a.pedestrian || "",
      city: cityFrom(s),
      province: provinceCode(s),
      postalCode: (a.postcode || "").toUpperCase(),
      lat,
      lng,
      confidence: typeof s.importance === "number" ? s.importance : 0.5,
      displayName: s.display_name,
    });
    setOpen(false);
    lastQueryRef.current = street;
  };

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground mb-1 inline-block">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && activeIdx >= 0) {
              e.preventDefault();
              handlePick(suggestions[activeIdx]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          autoComplete="off"
          className="pr-9"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : resolvedConfidence != null ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <MapPin className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-lg text-sm"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.place_id}
              role="option"
              aria-selected={i === activeIdx}
              className={`px-3 py-2 cursor-pointer flex items-start gap-2 ${
                i === activeIdx ? "bg-accent" : "hover:bg-accent/60"
              }`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                handlePick(s);
              }}
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
              <span className="text-foreground leading-snug">{s.display_name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground mt-1">
        Start typing your address and pick from the suggestions, or enter it manually.
      </p>
    </div>
  );
};

export default AddressAutocomplete;

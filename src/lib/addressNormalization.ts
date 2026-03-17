// Address normalization utilities
// Cleans and standardizes address components for consistent database storage
// Does NOT alter geocoded/autocomplete addresses — only normalizes stored values

const SUFFIX_MAP: Record<string, string> = {
  // Full → Abbreviated
  road: "Rd",
  street: "St",
  avenue: "Ave",
  boulevard: "Blvd",
  drive: "Dr",
  court: "Ct",
  crescent: "Cres",
  lane: "Ln",
  place: "Pl",
  terrace: "Terr",
  circle: "Cir",
  trail: "Trl",
  way: "Way",
  highway: "Hwy",
  parkway: "Pkwy",
  gardens: "Gdns",
  gate: "Gate",
  square: "Sq",
  path: "Path",
  grove: "Grv",
  heights: "Hts",
  // Abbreviated → Abbreviated (identity)
  rd: "Rd",
  st: "St",
  ave: "Ave",
  blvd: "Blvd",
  dr: "Dr",
  ct: "Ct",
  cres: "Cres",
  ln: "Ln",
  pl: "Pl",
  terr: "Terr",
  cir: "Cir",
  trl: "Trl",
  hwy: "Hwy",
  pkwy: "Pkwy",
  gdns: "Gdns",
  sq: "Sq",
  grv: "Grv",
  hts: "Hts",
};

/**
 * Normalize a street number: trim, extract only the civic number portion.
 * "  175  " → "175"
 * "175A" → "175A" (unit letters are kept)
 */
export function normalizeStreetNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/\s+/g, "");
}

/**
 * Normalize a street name:
 * - Trim and collapse whitespace
 * - Title-case each word
 * - Standardize common suffixes (Road → Rd, Street → St, etc.)
 * - Remove trailing periods from suffixes
 */
export function normalizeStreetName(raw: string | null | undefined): string {
  if (!raw) return "";

  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const words = trimmed.split(" ");
  const normalized = words.map((word, idx) => {
    // Remove trailing period (e.g. "Rd." → "Rd")
    const clean = word.replace(/\.+$/, "");
    const lower = clean.toLowerCase();

    // Check if this word is a suffix (typically the last word, but could be second-to-last)
    if (idx >= words.length - 2 && SUFFIX_MAP[lower]) {
      return SUFFIX_MAP[lower];
    }

    // Title case
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  });

  return normalized.join(" ");
}

/**
 * Build a canonical full address from normalized components.
 * Example: "175 Rutledge Rd, Mississauga, ON, L5M 0X7"
 */
export function buildCanonicalAddress(parts: {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}): string {
  const segments: string[] = [];

  const street = [parts.streetNumber, parts.streetName].filter(Boolean).join(" ");
  if (street) segments.push(street);
  if (parts.city) segments.push(parts.city);
  if (parts.province) segments.push(parts.province);
  if (parts.postalCode) segments.push(parts.postalCode);

  return segments.join(", ");
}

/**
 * Try to parse a full address string into street_number and street_name.
 * Handles formats like "175 Rutledge Road" or "42A Main Street".
 * Returns null fields if parsing fails — never overwrites with bad data.
 */
export function parseStreetFromAddress(address: string | null | undefined): {
  streetNumber: string;
  streetName: string;
} {
  if (!address) return { streetNumber: "", streetName: "" };

  // Take only the street portion (before first comma)
  const streetPart = address.split(",")[0].trim();
  if (!streetPart) return { streetNumber: "", streetName: "" };

  // Match leading number (with optional letter suffix like 42A, 175-B)
  const match = streetPart.match(/^(\d+[A-Za-z]?(?:-\d+)?)\s+(.+)$/);
  if (match) {
    return {
      streetNumber: normalizeStreetNumber(match[1]),
      streetName: normalizeStreetName(match[2]),
    };
  }

  // Could not parse — return empty rather than guessing
  return { streetNumber: "", streetName: "" };
}

/**
 * Apply all normalizations to booking address fields before DB write.
 * Returns normalized values without mutating the originals.
 */
export function normalizeBookingAddress(fields: {
  streetNumber?: string | null;
  streetName?: string | null;
  clientAddress?: string | null;
  patientAddress?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
}): {
  streetNumber: string | null;
  streetName: string | null;
} {
  let sn = normalizeStreetNumber(fields.streetNumber);
  let st = normalizeStreetName(fields.streetName);

  // If split fields are empty but we have an address, try to parse
  if (!sn && !st) {
    const addr = fields.patientAddress || fields.clientAddress || "";
    const parsed = parseStreetFromAddress(addr);
    sn = parsed.streetNumber;
    st = parsed.streetName;
  }

  return {
    streetNumber: sn || null,
    streetName: st || null,
  };
}

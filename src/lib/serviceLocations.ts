// Canonical service-location model for transport orders.
//
// Single source of truth for deriving the labelled operational locations of an
// order (Hospital Discharge / Doctor Escort) from the existing booking columns.
// Reused by admin, PSW and client surfaces so every screen shows the same thing.
//
// Columns reused (no duplicates created):
//   pickup_address / pickup_postal_code  -> pickup leg
//   dropoff_address / dropoff_postal_code -> destination leg
//   facility_name / facility_unit / pickup_instructions / appointment_time / is_round_trip
//   client_address / patient_address / client_postal_code / patient_postal_code -> home

export type ServiceKind = "hospital-discharge" | "doctor-escort" | "home-care";

export interface ServiceLocation {
  key: "pickup" | "facility" | "destination" | "service";
  /** Human label shown in the UI, e.g. "Pickup — Hospital". */
  label: string;
  /** Facility / business name when known. */
  name?: string;
  /** Street address. */
  address?: string;
  postalCode?: string;
  /** Department, unit, floor, suite or room. */
  unit?: string;
  /** Free-text pickup instructions (PII-gated upstream). */
  instructions?: string;
  /** Appointment time when different from the shift start time. */
  time?: string;
  /** True when this location is operationally required but has no address. */
  missing?: boolean;
  /** True when the address is the client's private home (privacy-sensitive). */
  isPrivateHome?: boolean;
}

const val = (...candidates: unknown[]): string | undefined => {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return undefined;
};

const CANADA_POSTAL = /\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b/g;

/**
 * Removes duplicated province / postal-code fragments so cards never render
 * e.g. "… Aurora, ON, L4G 1A6, ON L4G 1A6".
 */
export const cleanAddress = (address?: string | null): string => {
  if (!address) return "";
  let out = address.replace(/\s+/g, " ").trim();

  // Collapse repeated postal codes (keep the first occurrence).
  const seenPostal = new Set<string>();
  out = out.replace(CANADA_POSTAL, (m) => {
    const norm = m.toUpperCase().replace(/[ -]/g, "");
    if (seenPostal.has(norm)) return "\u0000";
    seenPostal.add(norm);
    return m.toUpperCase().replace(/^([A-Z]\d[A-Z])[ -]?(\d[A-Z]\d)$/, "$1 $2");
  });

  // Collapse repeated province tokens.
  const seenProv = new Set<string>();
  out = out.replace(/\b(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU)\b/g, (m) => {
    const u = m.toUpperCase();
    if (seenProv.has(u)) return "\u0000";
    seenProv.add(u);
    return u;
  });

  return out
    .split(",")
    .map((part) => part.replace(/\u0000/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ")
    .replace(/,\s*,/g, ",")
    .replace(/^[,\s]+|[,\s]+$/g, "");
};

/** Appends a postal code only when it is not already present in the address. */
export const withPostalCode = (address?: string, postalCode?: string): string => {
  const base = cleanAddress(address);
  if (!postalCode?.trim()) return base;
  const norm = postalCode.toUpperCase().replace(/[ -]/g, "");
  const already = (base.toUpperCase().match(CANADA_POSTAL) || []).some(
    (m) => m.replace(/[ -]/g, "") === norm,
  );
  if (already) return base;
  return base ? `${base}, ${postalCode.toUpperCase()}` : postalCode.toUpperCase();
};

const HOSPITAL_HINTS = ["hospital", "discharge"];
const ESCORT_HINTS = ["doctor", "escort", "appointment", "clinic"];

/** Detects the service kind from the service_type array + transport flag. */
export const getServiceKind = (booking: any): ServiceKind => {
  if (!booking) return "home-care";
  const raw = booking.service_type ?? booking.serviceType ?? booking.services ?? [];
  const types = (Array.isArray(raw) ? raw : [raw]).map((t: any) => String(t || "").toLowerCase());
  const joined = types.join(" | ");
  const isTransport =
    booking.is_transport_booking ?? booking.isTransportBooking ?? booking.isTransportShift ?? false;

  if (HOSPITAL_HINTS.some((h) => joined.includes(h))) return "hospital-discharge";
  if (ESCORT_HINTS.some((h) => joined.includes(h))) return "doctor-escort";
  // Transport flag with an unrecognised label: treat as escort so both legs show.
  return isTransport ? "doctor-escort" : "home-care";
};

const homeAddress = (b: any) =>
  withPostalCode(
    val(b.patient_address, b.patientAddress, b.client_address, b.clientAddress),
    val(b.patient_postal_code, b.patientPostalCode, b.client_postal_code, b.postalCode),
  );

/**
 * Builds the labelled locations for an order. Works with raw booking rows
 * (snake_case) and with mapped ShiftRecord objects (camelCase).
 */
export const getServiceLocations = (booking: any): ServiceLocation[] => {
  if (!booking) return [];
  const kind = getServiceKind(booking);

  const facilityName = val(booking.facility_name, booking.facilityName);
  const facilityUnit = val(booking.facility_unit, booking.facilityUnit);
  const instructions = val(booking.pickup_instructions, booking.pickupInstructions);
  const appointmentTime = val(booking.appointment_time, booking.appointmentTime);
  const pickup = val(booking.pickup_address, booking.pickupAddress);
  const pickupPostal = val(booking.pickup_postal_code, booking.pickupPostalCode);
  const dropoff = val(booking.dropoff_address, booking.dropoffAddress);
  const dropoffPostal = val(booking.dropoff_postal_code, booking.dropoffPostalCode);
  const roundTrip = booking.is_round_trip ?? booking.isRoundTrip ?? null;
  const home = homeAddress(booking);

  if (kind === "home-care") {
    return [
      {
        key: "service",
        label: "Service Address",
        address: home,
        isPrivateHome: true,
        missing: !home,
      },
    ];
  }

  if (kind === "hospital-discharge") {
    const pickupAddr = withPostalCode(pickup, pickupPostal);
    return [
      {
        key: "pickup",
        label: "Pickup — Hospital",
        name: facilityName,
        address: pickupAddr,
        unit: facilityUnit,
        instructions,
        time: appointmentTime,
        missing: !pickupAddr && !facilityName,
      },
      {
        key: "destination",
        label: "Destination — Home",
        address: withPostalCode(dropoff, dropoffPostal) || home,
        isPrivateHome: !dropoff || dropoff === home,
        missing: !(withPostalCode(dropoff, dropoffPostal) || home),
      },
    ];
  }

  // Doctor escort.
  // Canonical mapping (matches existing production data + dispatch):
  //   pickup_address  -> the doctor/clinic the caregiver drives to
  //   patient/client address -> where the client is collected
  //   dropoff_address -> explicit return destination (falls back to round trip)
  const clinicAddr = withPostalCode(pickup, pickupPostal);
  const locations: ServiceLocation[] = [
    {
      key: "pickup",
      label: "Client Pickup",
      address: home,
      instructions,
      isPrivateHome: true,
      missing: !home,
    },
    {
      key: "facility",
      label: "Doctor / Clinic",
      name: facilityName,
      address: clinicAddr,
      unit: facilityUnit,
      time: appointmentTime,
      missing: !clinicAddr && !facilityName,
    },
  ];

  const explicitReturn = withPostalCode(dropoff, dropoffPostal);
  if (explicitReturn) {
    locations.push({
      key: "destination",
      label: "Return Destination",
      address: explicitReturn,
      isPrivateHome: explicitReturn === home,
    });
  } else if (roundTrip !== false) {
    locations.push({
      key: "destination",
      label: "Return Destination",
      name: "Round trip — return to client pickup",
      address: home,
      isPrivateHome: true,
      missing: !home,
    });
  }

  return locations;
};

/** True when a transport order is missing the hospital/clinic location. */
export const isFacilityLocationMissing = (booking: any): boolean => {
  const kind = getServiceKind(booking);
  if (kind === "home-care") return false;
  const locs = getServiceLocations(booking);
  const facility = locs.find((l) => l.key === (kind === "hospital-discharge" ? "pickup" : "facility"));
  return !!facility?.missing;
};

export const FACILITY_MISSING_WARNING =
  "Hospital/clinic address missing — edit order before assigning.";

/** Builds a maps deep link for navigation buttons. */
export const mapsUrl = (location: ServiceLocation): string => {
  const q = [location.name, location.address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

/** Compact one-line summary used in dense lists, emails and push payloads. */
export const summarizeServiceLocations = (booking: any): string =>
  getServiceLocations(booking)
    .filter((l) => l.address || l.name)
    .map((l) => `${l.label}: ${[l.name, l.address, l.unit].filter(Boolean).join(", ")}`)
    .join(" • ");

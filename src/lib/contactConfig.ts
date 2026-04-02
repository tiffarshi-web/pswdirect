// Central Business Contact Configuration
// Single source of truth for all business contact details across the platform.
// Update here to change phone/address everywhere.

export const BUSINESS_CONTACT: {
  phone: string;
  phoneRaw: string;
  phoneInternational: string;
  phoneTel: string;
  address: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
} = {
  phone: "(249) 288-4787",
  phoneRaw: "2492884787",
  phoneInternational: "+1-249-288-4787",
  phoneTel: "tel:2492884787",
  address: "239 Grove St E, Barrie, ON",
  streetAddress: "239 Grove St E",
  city: "Barrie",
  province: "ON",
  postalCode: "L4M 2R1",
  country: "CA",
  lat: 44.3894,
  lng: -79.6903,
};

/** Schema.org PostalAddress for structured data */
export const BUSINESS_POSTAL_ADDRESS = {
  "@type": "PostalAddress" as const,
  streetAddress: BUSINESS_CONTACT.streetAddress,
  addressLocality: BUSINESS_CONTACT.city,
  addressRegion: BUSINESS_CONTACT.province,
  addressCountry: BUSINESS_CONTACT.country,
};

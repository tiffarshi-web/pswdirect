import { SEO_CITIES } from "@/lib/seoCityData";

export interface AdditionalCityServiceRoute {
  slug: string;
  city: string;
  service: string;
  serviceLabel: string;
}

/**
 * Additional city+service routes not covered by cityServiceRoutes.ts
 * Covers: emergency-home-care, on-demand-home-care, hospital-discharge,
 * doctor-escort, in-home-care-services, hospital-discharge-care
 */
const additionalServices = [
  { key: "emergency-home-care", label: "Emergency Home Care" },
  { key: "on-demand-home-care", label: "On-Demand Home Care" },
  { key: "hospital-discharge", label: "Hospital Discharge Care" },
  { key: "hospital-discharge-care", label: "Hospital Discharge Care" },
  { key: "doctor-escort", label: "Doctor Escort" },
  { key: "in-home-care-services", label: "In-Home Care Services" },
  { key: "psw-services-in", label: "PSW Services" },
  { key: "home-care-in", label: "Home Care" },
  { key: "private-home-care-in", label: "Private Home Care" },
];

export const additionalCityServiceRoutes: AdditionalCityServiceRoute[] =
  SEO_CITIES.flatMap((city) =>
    additionalServices.map((service) => ({
      slug: `${service.key}-${city.key}`,
      city: city.label,
      service: service.key,
      serviceLabel: service.label,
    }))
  );

import { SEO_CITIES } from "@/lib/seoCityData";

export interface CityServiceRoute {
  slug: string;
  city: string;
  service: string;
  serviceLabel: string;
}

const services = [
  { key: "personal-care", label: "Personal Care" },
  { key: "companionship", label: "Companionship" },
  { key: "mobility-support", label: "Mobility Support" },
  { key: "doctor-escort", label: "Doctor Escort" },
  { key: "dementia-care", label: "Dementia Care" },
  { key: "alzheimers-care", label: "Alzheimer's Care" },
  { key: "overnight-care", label: "Overnight Care" },
  { key: "24-hour-home-care", label: "24-Hour Home Care" },
  { key: "post-surgery-care", label: "Post-Surgery Care" },
  { key: "palliative-care", label: "Palliative Care" },
  { key: "respite-care", label: "Respite Care" },
  { key: "senior-home-care", label: "Senior Home Care" },
];

// Generate both psw-[city]-[service] and [service]-[city] slug formats
export const cityServiceRoutes: CityServiceRoute[] = SEO_CITIES.flatMap((city) =>
  services.flatMap((service) => {
    const routes: CityServiceRoute[] = [
      {
        slug: `psw-${city.key}-${service.key}`,
        city: city.label,
        service: service.key,
        serviceLabel: service.label,
      },
    ];
    // Also create /[service]-[city] routes for health-condition services
    const conditionServices = [
      "dementia-care", "alzheimers-care", "overnight-care",
      "24-hour-home-care", "post-surgery-care", "palliative-care",
      "respite-care", "senior-home-care",
    ];
    if (conditionServices.includes(service.key)) {
      routes.push({
        slug: `${service.key}-${city.key}`,
        city: city.label,
        service: service.key,
        serviceLabel: service.label,
      });
    }
    // Alternate slug: alzheimer-care-{city} (without "s")
    if (service.key === "alzheimers-care") {
      routes.push({
        slug: `alzheimer-care-${city.key}`,
        city: city.label,
        service: service.key,
        serviceLabel: service.label,
      });
    }
    // Alternate slug: overnight-psw-{city}
    if (service.key === "overnight-care") {
      routes.push({
        slug: `overnight-psw-${city.key}`,
        city: city.label,
        service: service.key,
        serviceLabel: service.label,
      });
    }
    return routes;
  })
);

// Also generate home-care-[city] routes
export const homeCareRoutes = SEO_CITIES.map((city) => ({
  slug: `home-care-${city.key}`,
  city: city.label,
}));

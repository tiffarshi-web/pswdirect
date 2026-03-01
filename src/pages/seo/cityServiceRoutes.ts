export interface CityServiceRoute {
  slug: string;
  city: string;
  service: string;
  serviceLabel: string;
}

const cities = [
  { key: "toronto", label: "Toronto" },
  { key: "mississauga", label: "Mississauga" },
  { key: "brampton", label: "Brampton" },
  { key: "vaughan", label: "Vaughan" },
  { key: "markham", label: "Markham" },
  { key: "richmond-hill", label: "Richmond Hill" },
  { key: "oakville", label: "Oakville" },
  { key: "burlington", label: "Burlington" },
  { key: "ajax", label: "Ajax" },
  { key: "pickering", label: "Pickering" },
  { key: "oshawa", label: "Oshawa" },
  { key: "barrie", label: "Barrie" },
  { key: "hamilton", label: "Hamilton" },
  { key: "kitchener", label: "Kitchener" },
  { key: "waterloo", label: "Waterloo" },
  { key: "cambridge", label: "Cambridge" },
  { key: "london", label: "London" },
  { key: "windsor", label: "Windsor" },
  { key: "st-catharines", label: "St. Catharines" },
  { key: "niagara-falls", label: "Niagara Falls" },
  { key: "guelph", label: "Guelph" },
  { key: "kingston", label: "Kingston" },
  { key: "peterborough", label: "Peterborough" },
  { key: "ottawa", label: "Ottawa" },
];

const services = [
  { key: "personal-care", label: "Personal Care" },
  { key: "companionship", label: "Companionship" },
  { key: "mobility-support", label: "Mobility Support" },
  { key: "doctor-escort", label: "Doctor Escort" },
];

export const cityServiceRoutes: CityServiceRoute[] = cities.flatMap((city) =>
  services.map((service) => ({
    slug: `psw-${city.key}-${service.key}`,
    city: city.label,
    service: service.key,
    serviceLabel: service.label,
  }))
);

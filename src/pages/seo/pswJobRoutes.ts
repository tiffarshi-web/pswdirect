export interface PSWJobCityRoute {
  slug: string;
  city: string;
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
  { key: "newmarket", label: "Newmarket" },
  { key: "aurora", label: "Aurora" },
  { key: "milton", label: "Milton" },
];

export const pswJobCityRoutes: PSWJobCityRoute[] = cities.map((c) => ({
  slug: `psw-jobs-${c.key}`,
  city: c.label,
}));

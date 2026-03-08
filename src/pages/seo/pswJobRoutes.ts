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
  { key: "whitby", label: "Whitby" },
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
  { key: "innisfil", label: "Innisfil" },
  { key: "orillia", label: "Orillia" },
  { key: "bradford", label: "Bradford" },
  { key: "alliston", label: "Alliston" },
  { key: "cobourg", label: "Cobourg" },
  { key: "belleville", label: "Belleville" },
  { key: "welland", label: "Welland" },
  { key: "stoney-creek", label: "Stoney Creek" },
  { key: "georgetown", label: "Georgetown" },
  { key: "dundas", label: "Dundas" },
  { key: "woodstock", label: "Woodstock" },
  { key: "courtice", label: "Courtice" },
];

export const pswJobCityRoutes: PSWJobCityRoute[] = cities.map((c) => ({
  slug: `psw-jobs-${c.key}`,
  city: c.label,
}));

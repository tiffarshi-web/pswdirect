// Centralized SEO city/suburb data source
// Used by all SEO route generators and nearby-city sections
// DO NOT use for dispatch logic — dispatch uses postalCodeUtils + serviceRadiusStore

export interface SEOCity {
  key: string;
  label: string;
  lat: number;
  lng: number;
}

/** All Ontario cities used for SEO page generation */
export const SEO_CITIES: SEOCity[] = [
  { key: "toronto", label: "Toronto", lat: 43.6532, lng: -79.3832 },
  { key: "scarborough", label: "Scarborough", lat: 43.7731, lng: -79.2578 },
  { key: "north-york", label: "North York", lat: 43.7615, lng: -79.4111 },
  { key: "etobicoke", label: "Etobicoke", lat: 43.6205, lng: -79.5132 },
  { key: "mississauga", label: "Mississauga", lat: 43.5890, lng: -79.6441 },
  { key: "brampton", label: "Brampton", lat: 43.7315, lng: -79.7624 },
  { key: "vaughan", label: "Vaughan", lat: 43.8361, lng: -79.4983 },
  { key: "markham", label: "Markham", lat: 43.8561, lng: -79.3370 },
  { key: "richmond-hill", label: "Richmond Hill", lat: 43.8828, lng: -79.4403 },
  { key: "oakville", label: "Oakville", lat: 43.4675, lng: -79.6877 },
  { key: "burlington", label: "Burlington", lat: 43.3255, lng: -79.7990 },
  { key: "ajax", label: "Ajax", lat: 43.8509, lng: -79.0204 },
  { key: "pickering", label: "Pickering", lat: 43.8354, lng: -79.0868 },
  { key: "oshawa", label: "Oshawa", lat: 43.8971, lng: -78.8658 },
  { key: "whitby", label: "Whitby", lat: 43.8975, lng: -78.9429 },
  { key: "barrie", label: "Barrie", lat: 44.3894, lng: -79.6903 },
  { key: "hamilton", label: "Hamilton", lat: 43.2557, lng: -79.8711 },
  { key: "kitchener", label: "Kitchener", lat: 43.4516, lng: -80.4925 },
  { key: "waterloo", label: "Waterloo", lat: 43.4643, lng: -80.5204 },
  { key: "cambridge", label: "Cambridge", lat: 43.3616, lng: -80.3144 },
  { key: "london", label: "London", lat: 42.9849, lng: -81.2453 },
  { key: "windsor", label: "Windsor", lat: 42.3149, lng: -83.0364 },
  { key: "st-catharines", label: "St. Catharines", lat: 43.1594, lng: -79.2469 },
  { key: "niagara-falls", label: "Niagara Falls", lat: 43.0896, lng: -79.0849 },
  { key: "guelph", label: "Guelph", lat: 43.5448, lng: -80.2482 },
  { key: "kingston", label: "Kingston", lat: 44.2312, lng: -76.4860 },
  { key: "peterborough", label: "Peterborough", lat: 44.3091, lng: -78.3197 },
  { key: "ottawa", label: "Ottawa", lat: 45.4215, lng: -75.6972 },
  { key: "newmarket", label: "Newmarket", lat: 44.0592, lng: -79.4613 },
  { key: "aurora", label: "Aurora", lat: 44.0065, lng: -79.4504 },
  { key: "milton", label: "Milton", lat: 43.5183, lng: -79.8774 },
  { key: "innisfil", label: "Innisfil", lat: 44.3023, lng: -79.5833 },
  { key: "orillia", label: "Orillia", lat: 44.6083, lng: -79.4208 },
  { key: "bradford", label: "Bradford", lat: 44.1145, lng: -79.5625 },
  { key: "alliston", label: "Alliston", lat: 44.1530, lng: -79.8665 },
  { key: "cobourg", label: "Cobourg", lat: 43.9594, lng: -78.1677 },
  { key: "belleville", label: "Belleville", lat: 44.1628, lng: -77.3832 },
  { key: "welland", label: "Welland", lat: 42.9922, lng: -79.2483 },
  { key: "stoney-creek", label: "Stoney Creek", lat: 43.2173, lng: -79.7652 },
  { key: "georgetown", label: "Georgetown", lat: 43.6526, lng: -79.9178 },
  { key: "dundas", label: "Dundas", lat: 43.2667, lng: -79.9553 },
  { key: "woodstock", label: "Woodstock", lat: 43.1306, lng: -80.7565 },
  { key: "courtice", label: "Courtice", lat: 43.8768, lng: -78.8065 },
  { key: "brantford", label: "Brantford", lat: 43.1394, lng: -80.2644 },
  { key: "sarnia", label: "Sarnia", lat: 42.9745, lng: -82.4066 },
  { key: "thunder-bay", label: "Thunder Bay", lat: 48.3809, lng: -89.2477 },
  { key: "sudbury", label: "Sudbury", lat: 46.4917, lng: -80.9930 },
  { key: "sault-ste-marie", label: "Sault Ste Marie", lat: 46.5136, lng: -84.3358 },
  { key: "midland", label: "Midland", lat: 44.7494, lng: -79.8873 },
  { key: "collingwood", label: "Collingwood", lat: 44.5001, lng: -80.2170 },
  // Expansion wave 2
  { key: "bowmanville", label: "Bowmanville", lat: 43.9126, lng: -78.6882 },
  { key: "orangeville", label: "Orangeville", lat: 43.9197, lng: -80.0943 },
  { key: "stouffville", label: "Stouffville", lat: 43.9700, lng: -79.2454 },
  { key: "keswick", label: "Keswick", lat: 44.2296, lng: -79.4679 },
  { key: "shelburne", label: "Shelburne", lat: 44.0787, lng: -80.2034 },
  { key: "wasaga-beach", label: "Wasaga Beach", lat: 44.5204, lng: -80.0167 },
  { key: "penetanguishene", label: "Penetanguishene", lat: 44.7676, lng: -79.9379 },
  { key: "gravenhurst", label: "Gravenhurst", lat: 44.9188, lng: -79.3736 },
  { key: "bracebridge", label: "Bracebridge", lat: 45.0376, lng: -79.3124 },
  { key: "huntsville", label: "Huntsville", lat: 45.3258, lng: -79.2160 },
  { key: "north-bay", label: "North Bay", lat: 46.3091, lng: -79.4608 },
  { key: "timmins", label: "Timmins", lat: 48.4758, lng: -81.3305 },
  { key: "kenora", label: "Kenora", lat: 49.7671, lng: -94.4894 },
  { key: "cornwall", label: "Cornwall", lat: 45.0213, lng: -74.7307 },
  { key: "hawkesbury", label: "Hawkesbury", lat: 45.6004, lng: -74.6003 },
  { key: "smiths-falls", label: "Smiths Falls", lat: 44.9042, lng: -76.0272 },
  { key: "pembroke", label: "Pembroke", lat: 45.8268, lng: -77.1116 },
  { key: "stratford", label: "Stratford", lat: 43.3700, lng: -80.9823 },
  { key: "owen-sound", label: "Owen Sound", lat: 44.5691, lng: -80.9406 },
  { key: "chatham-kent", label: "Chatham-Kent", lat: 42.4048, lng: -82.1910 },
  { key: "leamington", label: "Leamington", lat: 42.0532, lng: -82.5997 },
  { key: "port-hope", label: "Port Hope", lat: 43.9516, lng: -78.2913 },
  { key: "lindsay", label: "Lindsay", lat: 44.3491, lng: -78.7394 },
  { key: "fort-erie", label: "Fort Erie", lat: 42.9011, lng: -78.9326 },
  { key: "grimsby", label: "Grimsby", lat: 43.1936, lng: -79.5582 },
  { key: "caledon", label: "Caledon", lat: 43.8621, lng: -79.8755 },
  { key: "halton-hills", label: "Halton Hills", lat: 43.6317, lng: -79.9495 },
  { key: "east-gwillimbury", label: "East Gwillimbury", lat: 44.1315, lng: -79.4371 },
  { key: "king-city", label: "King City", lat: 43.9245, lng: -79.5262 },
  { key: "uxbridge", label: "Uxbridge", lat: 44.1085, lng: -79.1188 },
  { key: "clarington", label: "Clarington", lat: 43.9352, lng: -78.6084 },
];

/** Build CITY_CENTERS record from SEO_CITIES for backward compatibility */
export const SEO_CITY_CENTERS: Record<string, { lat: number; lng: number }> = Object.fromEntries(
  SEO_CITIES.map((c) => [c.label, { lat: c.lat, lng: c.lng }])
);

/**
 * Expanded nearby cities/suburbs map for SEO "near me" sections.
 * Each major city maps to 10-15 nearby suburbs/neighborhoods.
 * Used for SEO only — does NOT affect dispatch.
 */
export const nearbyCitiesMap: Record<string, string[]> = {
  "Toronto": [
    "North York", "Scarborough", "Etobicoke", "York", "East York",
    "Don Mills", "Leaside", "Riverdale", "Liberty Village", "Danforth",
    "High Park", "Parkdale", "The Beaches", "Forest Hill", "Rosedale",
  ],
  "Scarborough": [
    "Toronto", "Pickering", "Ajax", "Markham", "North York",
    "East York", "Agincourt", "Malvern", "Rouge", "Highland Creek",
    "Woburn", "Birch Cliff", "Cliffside",
  ],
  "North York": [
    "Toronto", "Vaughan", "Markham", "Scarborough", "Etobicoke",
    "Don Mills", "Willowdale", "Thornhill", "Downsview", "York Mills",
    "Bayview Village", "Lawrence Park",
  ],
  "Etobicoke": [
    "Toronto", "Mississauga", "Brampton", "North York", "York",
    "Mimico", "Long Branch", "Islington", "Rexdale", "Humber Bay",
    "New Toronto", "Kingsway",
  ],
  "Mississauga": [
    "Toronto", "Brampton", "Oakville", "Burlington", "Etobicoke",
    "Meadowvale", "Streetsville", "Port Credit", "Erin Mills", "Clarkson",
    "Malton", "Cooksville", "Lorne Park",
  ],
  "Brampton": [
    "Toronto", "Mississauga", "Vaughan", "Georgetown", "Malton",
    "Bramalea", "Caledon", "Heart Lake", "Castlemore", "Springdale",
    "Mount Pleasant", "Snelgrove",
  ],
  "Vaughan": [
    "Toronto", "Brampton", "Richmond Hill", "Markham", "Woodbridge",
    "Maple", "Concord", "Kleinburg", "Thornhill", "King City",
    "Nobleton",
  ],
  "Markham": [
    "Toronto", "Vaughan", "Richmond Hill", "Pickering", "Unionville",
    "Stouffville", "Scarborough", "Thornhill", "Milliken", "Cornell",
    "Berczy Village", "Cathedraltown",
  ],
  "Richmond Hill": [
    "Toronto", "Vaughan", "Markham", "Aurora", "Newmarket",
    "Oak Ridges", "Thornhill", "King City", "Langstaff", "Bayview Hill",
  ],
  "Oakville": [
    "Mississauga", "Burlington", "Milton", "Bronte", "Palermo",
    "Clearview", "Glen Abbey", "River Oaks", "Iroquois Ridge",
    "Joshua Creek", "Sixteen Mile",
  ],
  "Burlington": [
    "Oakville", "Hamilton", "Milton", "Waterdown", "Aldershot",
    "Appleby", "Tyandaga", "Brant Hills", "Palmer", "Kilbride",
  ],
  "Ajax": [
    "Pickering", "Whitby", "Oshawa", "Courtice", "Scarborough",
    "Bayly", "Westney Heights", "Village Green", "Audley",
  ],
  "Pickering": [
    "Ajax", "Toronto", "Markham", "Scarborough", "Whitby",
    "Dunbarton", "Bay Ridges", "Rouge Hill", "Claremont",
  ],
  "Oshawa": [
    "Whitby", "Ajax", "Courtice", "Bowmanville", "Brooklin",
    "Harmony", "Taunton", "Lakeview", "Northwood",
  ],
  "Whitby": [
    "Oshawa", "Ajax", "Pickering", "Courtice", "Brooklin",
    "Port Whitby", "Blue Grass Meadows", "Williamsburg",
  ],
  "Barrie": [
    "Innisfil", "Orillia", "Alliston", "Newmarket", "Angus",
    "Alcona", "Midhurst", "Shanty Bay", "Springwater",
    "Minesing", "Stroud",
  ],
  "Hamilton": [
    "Burlington", "Dundas", "Stoney Creek", "Ancaster", "Waterdown",
    "Binbrook", "Flamborough", "Winona", "Caledonia",
    "Grimsby", "Mount Hope", "Westdale",
  ],
  "Kitchener": [
    "Waterloo", "Cambridge", "Guelph", "Elmira", "New Hamburg",
    "Baden", "St. Jacobs", "Breslau", "Heidelberg",
  ],
  "Waterloo": [
    "Kitchener", "Cambridge", "Guelph", "Elmira", "St. Jacobs",
    "Bridgeport", "Conestogo", "Woolwich",
  ],
  "Cambridge": [
    "Kitchener", "Waterloo", "Guelph", "Hespeler", "Preston",
    "Galt", "Ayr", "Paris",
  ],
  "London": [
    "St. Thomas", "Woodstock", "Strathroy", "Aylmer", "Dorchester",
    "Ingersoll", "Komoka", "Byron", "Lambeth",
  ],
  "Windsor": [
    "LaSalle", "Tecumseh", "Lakeshore", "Amherstburg", "Essex",
    "Leamington", "Kingsville", "Belle River",
  ],
  "St. Catharines": [
    "Niagara Falls", "Welland", "Thorold", "Pelham", "Grimsby",
    "Beamsville", "Vineland", "Jordan", "Port Dalhousie",
  ],
  "Niagara Falls": [
    "St. Catharines", "Welland", "Fort Erie", "Thorold",
    "Niagara-on-the-Lake", "Chippawa", "Queenston",
  ],
  "Guelph": [
    "Kitchener", "Cambridge", "Waterloo", "Milton", "Fergus",
    "Elora", "Rockwood", "Puslinch", "Eden Mills",
  ],
  "Kingston": [
    "Gananoque", "Napanee", "Belleville", "Amherstview", "Bath",
    "Cataraqui", "Collins Bay", "Sydenham",
  ],
  "Peterborough": [
    "Lindsay", "Lakefield", "Cobourg", "Norwood", "Bridgenorth",
    "Millbrook", "Buckhorn", "Keene", "Havelock",
  ],
  "Ottawa": [
    "Gatineau", "Kanata", "Orleans", "Barrhaven", "Nepean",
    "Gloucester", "Stittsville", "Manotick", "Rockcliffe Park",
    "Westboro", "The Glebe", "Sandy Hill",
  ],
  "Newmarket": [
    "Aurora", "Richmond Hill", "Barrie", "Markham", "Bradford",
    "Holland Landing", "Sharon", "Queensville", "Keswick",
  ],
  "Aurora": [
    "Newmarket", "Richmond Hill", "Markham", "King City",
    "Stouffville", "Ballantrae", "Oak Ridges",
  ],
  "Milton": [
    "Oakville", "Burlington", "Guelph", "Cambridge", "Georgetown",
    "Campbellville", "Halton Hills", "Acton",
  ],
  "Innisfil": [
    "Barrie", "Bradford", "Newmarket", "Alliston", "Alcona",
    "Stroud", "Lefroy", "Big Bay Point", "Cookstown",
  ],
  "Orillia": [
    "Barrie", "Innisfil", "Midland", "Gravenhurst",
    "Washago", "Coldwater", "Ramara",
  ],
  "Bradford": [
    "Newmarket", "Innisfil", "Barrie", "Aurora", "Holland Landing",
    "Bond Head", "Newton Robinson",
  ],
  "Alliston": [
    "Barrie", "Innisfil", "Bradford", "Angus", "Beeton",
    "Tottenham", "New Tecumseth",
  ],
  "Cobourg": [
    "Peterborough", "Belleville", "Port Hope", "Trenton",
    "Grafton", "Baltimore", "Colborne",
  ],
  "Belleville": [
    "Kingston", "Cobourg", "Peterborough", "Trenton", "Napanee",
    "Deseronto", "Foxboro", "Stirling",
  ],
  "Welland": [
    "St. Catharines", "Niagara Falls", "Thorold", "Pelham",
    "Port Colborne", "Fonthill",
  ],
  "Stoney Creek": [
    "Hamilton", "Burlington", "Dundas", "Ancaster", "Grimsby",
    "Winona", "Fruitland",
  ],
  "Georgetown": [
    "Brampton", "Milton", "Guelph", "Acton", "Halton Hills",
    "Glen Williams",
  ],
  "Dundas": [
    "Hamilton", "Burlington", "Stoney Creek", "Ancaster",
    "Greensville", "Flamborough",
  ],
  "Woodstock": [
    "London", "Cambridge", "Kitchener", "Tillsonburg",
    "Ingersoll", "Norwich",
  ],
  "Courtice": [
    "Oshawa", "Whitby", "Ajax", "Bowmanville",
    "Newcastle", "Orono",
  ],
  "Brantford": [
    "Cambridge", "Hamilton", "Woodstock", "Paris",
    "Simcoe", "Ancaster", "Dundas", "Norfolk",
  ],
  "Sarnia": [
    "London", "Chatham", "Petrolia", "Forest",
    "Grand Bend", "Strathroy", "Point Edward",
  ],
  "Thunder Bay": [
    "Nipigon", "Marathon", "Geraldton", "Dryden",
    "Kenora", "Red Rock", "Kakabeka Falls",
  ],
  "Sudbury": [
    "North Bay", "Timmins", "Sault Ste Marie", "Espanola",
    "Elliot Lake", "Sturgeon Falls", "Capreol",
  ],
  "Sault Ste Marie": [
    "Sudbury", "Elliot Lake", "Blind River", "Thessalon",
    "Wawa", "Iron Bridge",
  ],
  "Midland": [
    "Orillia", "Barrie", "Penetanguishene", "Collingwood",
    "Wasaga Beach", "Coldwater", "Elmvale",
  ],
  "Collingwood": [
    "Barrie", "Orillia", "Midland", "Wasaga Beach",
    "Stayner", "Thornbury", "Meaford", "Blue Mountains",
  ],
};

/** Get city slug from label */
export const cityToSlug = (city: string): string =>
  city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/** Get nearby suburbs/cities for a given city (SEO-only) */
export const getNearbyCities = (city: string): string[] =>
  nearbyCitiesMap[city] || [];

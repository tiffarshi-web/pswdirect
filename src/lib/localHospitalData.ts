/**
 * Verified Ontario hospitals and healthcare facilities by city.
 *
 * IMPORTANT: Only real, publicly-known Ontario hospitals are listed here.
 * Cities not in this map render NO hospital section (per SEO Phase 2 rule:
 * "If verified data is unavailable, omit this section rather than fabricating information").
 *
 * Data is used only for informational SEO content — not for dispatch,
 * clinical routing, or medical advice.
 */

export interface Hospital {
  name: string;
  /** "in {city}" or "near {city}" — describes proximity, not affiliation. */
  proximity?: string;
}

/**
 * Map keyed by SEO_CITIES.label. Absence = omit hospital section.
 * Facilities that serve a wider region (e.g. Southlake, RVH) are also
 * listed under adjacent smaller communities as "near".
 */
export const LOCAL_HOSPITALS: Record<string, Hospital[]> = {
  "Toronto": [
    { name: "Toronto General Hospital" },
    { name: "Mount Sinai Hospital" },
    { name: "St. Michael's Hospital" },
    { name: "Sunnybrook Health Sciences Centre" },
    { name: "Toronto Western Hospital" },
  ],
  "Scarborough": [
    { name: "Scarborough Health Network – General Hospital" },
    { name: "Scarborough Health Network – Birchmount Hospital" },
    { name: "Scarborough Health Network – Centenary Hospital" },
  ],
  "North York": [
    { name: "North York General Hospital" },
    { name: "Humber River Hospital" },
    { name: "Sunnybrook Health Sciences Centre", proximity: "near" },
  ],
  "Etobicoke": [
    { name: "Etobicoke General Hospital" },
    { name: "Trillium Health Partners – Queensway Health Centre" },
  ],
  "Mississauga": [
    { name: "Trillium Health Partners – Mississauga Hospital" },
    { name: "Trillium Health Partners – Credit Valley Hospital" },
  ],
  "Brampton": [
    { name: "Brampton Civic Hospital" },
    { name: "Peel Memorial Centre for Integrated Health and Wellness" },
  ],
  "Vaughan": [
    { name: "Cortellucci Vaughan Hospital" },
    { name: "Mackenzie Richmond Hill Hospital", proximity: "near" },
  ],
  "Markham": [
    { name: "Markham Stouffville Hospital (Oak Valley Health)" },
  ],
  "Richmond Hill": [
    { name: "Mackenzie Richmond Hill Hospital" },
  ],
  "Oakville": [
    { name: "Oakville Trafalgar Memorial Hospital" },
  ],
  "Burlington": [
    { name: "Joseph Brant Hospital" },
  ],
  "Ajax": [
    { name: "Lakeridge Health Ajax Pickering" },
  ],
  "Pickering": [
    { name: "Lakeridge Health Ajax Pickering" },
  ],
  "Oshawa": [
    { name: "Lakeridge Health Oshawa" },
  ],
  "Whitby": [
    { name: "Lakeridge Health Whitby" },
  ],
  "Barrie": [
    { name: "Royal Victoria Regional Health Centre" },
  ],
  "Hamilton": [
    { name: "Hamilton General Hospital" },
    { name: "Juravinski Hospital and Cancer Centre" },
    { name: "St. Joseph's Healthcare Hamilton" },
    { name: "McMaster Children's Hospital" },
  ],
  "Kitchener": [
    { name: "Grand River Hospital" },
    { name: "St. Mary's General Hospital" },
  ],
  "Waterloo": [
    { name: "Grand River Hospital – Freeport Campus", proximity: "near" },
    { name: "St. Mary's General Hospital", proximity: "near" },
  ],
  "Cambridge": [
    { name: "Cambridge Memorial Hospital" },
  ],
  "London": [
    { name: "London Health Sciences Centre – Victoria Hospital" },
    { name: "London Health Sciences Centre – University Hospital" },
    { name: "St. Joseph's Health Care London" },
  ],
  "Windsor": [
    { name: "Windsor Regional Hospital – Met Campus" },
    { name: "Windsor Regional Hospital – Ouellette Campus" },
    { name: "Hôtel-Dieu Grace Healthcare" },
  ],
  "St. Catharines": [
    { name: "Niagara Health – St. Catharines Site" },
  ],
  "Niagara Falls": [
    { name: "Niagara Health – Greater Niagara General Site" },
  ],
  "Guelph": [
    { name: "Guelph General Hospital" },
    { name: "St. Joseph's Health Centre Guelph" },
  ],
  "Kingston": [
    { name: "Kingston General Hospital (KHSC)" },
    { name: "Hotel Dieu Hospital (KHSC)" },
    { name: "Providence Care Hospital" },
  ],
  "Peterborough": [
    { name: "Peterborough Regional Health Centre" },
  ],
  "Ottawa": [
    { name: "The Ottawa Hospital – Civic Campus" },
    { name: "The Ottawa Hospital – General Campus" },
    { name: "The Ottawa Hospital – Riverside Campus" },
    { name: "Queensway Carleton Hospital" },
    { name: "Montfort Hospital" },
    { name: "Children's Hospital of Eastern Ontario (CHEO)" },
  ],
  "Newmarket": [
    { name: "Southlake Regional Health Centre" },
  ],
  "Aurora": [
    { name: "Southlake Regional Health Centre", proximity: "near" },
  ],
  "Milton": [
    { name: "Milton District Hospital (Halton Healthcare)" },
  ],
  "Innisfil": [
    { name: "Royal Victoria Regional Health Centre", proximity: "near" },
  ],
  "Orillia": [
    { name: "Orillia Soldiers' Memorial Hospital" },
  ],
  "Bradford": [
    { name: "Southlake Regional Health Centre", proximity: "near" },
  ],
  "Alliston": [
    { name: "Stevenson Memorial Hospital" },
  ],
  "Cobourg": [
    { name: "Northumberland Hills Hospital" },
  ],
  "Belleville": [
    { name: "Belleville General Hospital (Quinte Health)" },
  ],
  "Welland": [
    { name: "Niagara Health – Welland Hospital Site" },
  ],
  "Stoney Creek": [
    { name: "Juravinski Hospital", proximity: "near" },
    { name: "Hamilton General Hospital", proximity: "near" },
  ],
  "Georgetown": [
    { name: "Georgetown Hospital (Halton Healthcare)" },
  ],
  "Dundas": [
    { name: "St. Joseph's Healthcare Hamilton", proximity: "near" },
  ],
  "Woodstock": [
    { name: "Woodstock Hospital" },
  ],
  "Courtice": [
    { name: "Lakeridge Health Bowmanville", proximity: "near" },
  ],
  "Brantford": [
    { name: "Brantford General Hospital" },
  ],
  "Sarnia": [
    { name: "Bluewater Health" },
  ],
  "Thunder Bay": [
    { name: "Thunder Bay Regional Health Sciences Centre" },
  ],
  "Sudbury": [
    { name: "Health Sciences North" },
  ],
  "Sault Ste Marie": [
    { name: "Sault Area Hospital" },
  ],
  "Midland": [
    { name: "Georgian Bay General Hospital" },
  ],
  "Collingwood": [
    { name: "Collingwood General and Marine Hospital" },
  ],
  "Bowmanville": [
    { name: "Lakeridge Health Bowmanville" },
  ],
  "Orangeville": [
    { name: "Headwaters Health Care Centre" },
  ],
  "Stouffville": [
    { name: "Markham Stouffville Hospital (Oak Valley Health)" },
  ],
  "Keswick": [
    { name: "Southlake Regional Health Centre", proximity: "near" },
  ],
  "Wasaga Beach": [
    { name: "Collingwood General and Marine Hospital", proximity: "near" },
  ],
  "Penetanguishene": [
    { name: "Georgian Bay General Hospital", proximity: "near" },
  ],
  "Gravenhurst": [
    { name: "South Muskoka Memorial Hospital" },
  ],
  "Bracebridge": [
    { name: "South Muskoka Memorial Hospital" },
  ],
  "Huntsville": [
    { name: "Huntsville District Memorial Hospital" },
  ],
  "North Bay": [
    { name: "North Bay Regional Health Centre" },
  ],
  "Timmins": [
    { name: "Timmins and District Hospital" },
  ],
  "Kenora": [
    { name: "Lake of the Woods District Hospital" },
  ],
  "Cornwall": [
    { name: "Cornwall Community Hospital" },
  ],
};

export const getLocalHospitals = (city: string): Hospital[] =>
  LOCAL_HOSPITALS[city] ?? [];

export const hasLocalHospitals = (city: string): boolean =>
  (LOCAL_HOSPITALS[city]?.length ?? 0) > 0;

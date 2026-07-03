/**
 * Verified local healthcare and senior-services resources by Ontario city.
 *
 * IMPORTANT: Only publicly verifiable, well-established organizations and
 * programs are listed here. Where verified data is not available for a
 * category, the field is omitted and the UI simply does not render that
 * section (per SEO Phase 2 rule — "omit rather than fabricate").
 *
 * Categories:
 *  - rehabCentres            Public rehabilitation hospitals / campuses
 *  - retirementCommunities   Named long-standing retirement residences
 *  - seniorsCentres          Municipal / non-profit seniors' centres
 *  - physioResources         Verified clinics or provincial resources
 *  - homeHealthResources     Public home-care / community health
 *  - regionalPrograms        Ontario Health atHome region + local programs
 *  - seniorTransportation    Municipal specialized transit + community rides
 *
 * Nothing here is a dispatch record, clinical referral, or affiliation claim —
 * this data is used only to produce authoritative local SEO content.
 */

export interface LocalResources {
  rehabCentres?: string[];
  retirementCommunities?: string[];
  seniorsCentres?: string[];
  physioResources?: string[];
  homeHealthResources?: string[];
  regionalPrograms?: string[];
  seniorTransportation?: string[];
}

/**
 * Ontario Health atHome (formerly Home and Community Care Support Services)
 * publicly funds coordinated home care across Ontario. Every listed city
 * belongs to one of the 14 regional operating areas. Naming this program
 * is factual and non-affiliated.
 */
const OH_AT_HOME = "Ontario Health atHome";

export const LOCAL_RESOURCES: Record<string, LocalResources> = {
  /* ─── City of Toronto ─────────────────────────────────────── */
  "Toronto": {
    rehabCentres: [
      "Toronto Rehabilitation Institute (UHN) — University, Bickle, Lyndhurst and Rumsey Centres",
      "West Park Healthcare Centre",
      "Bridgepoint Active Healthcare (Sinai Health)",
      "Providence Healthcare (Unity Health Toronto)",
    ],
    seniorsCentres: [
      "Toronto's network of municipal 55+ and Older Adult Centres",
      "Neighbourhood houses affiliated with the Toronto Association of Neighbourhood Services",
    ],
    homeHealthResources: [
      `${OH_AT_HOME} — Toronto region publicly funded home care coordination`,
      "Toronto Public Health — Healthy Aging programs",
    ],
    regionalPrograms: [
      "City of Toronto Seniors Services and Long-Term Care",
      "Toronto Seniors Strategy 2.0",
    ],
    seniorTransportation: [
      "TTC Wheel-Trans — door-to-door specialized transit for eligible seniors",
      "Canadian Red Cross Transportation (Toronto)",
    ],
  },
  "Scarborough": {
    rehabCentres: ["Scarborough Health Network — Rehabilitation and Complex Continuing Care programs"],
    homeHealthResources: [`${OH_AT_HOME} — Toronto region`],
    seniorTransportation: ["TTC Wheel-Trans"],
    regionalPrograms: ["City of Toronto Seniors Services and Long-Term Care"],
  },
  "North York": {
    rehabCentres: [
      "Toronto Rehab — Bickle Centre (UHN)",
      "North York General Hospital — Freeman Centre for the Advancement of Palliative Care",
    ],
    homeHealthResources: [`${OH_AT_HOME} — Toronto region`],
    seniorTransportation: ["TTC Wheel-Trans"],
    regionalPrograms: ["City of Toronto Seniors Services and Long-Term Care"],
  },
  "Etobicoke": {
    rehabCentres: ["West Park Healthcare Centre", "Runnymede Healthcare Centre"],
    homeHealthResources: [`${OH_AT_HOME} — Toronto region`],
    seniorTransportation: ["TTC Wheel-Trans"],
    regionalPrograms: ["City of Toronto Seniors Services and Long-Term Care"],
  },

  /* ─── Peel ────────────────────────────────────────────────── */
  "Mississauga": {
    homeHealthResources: [`${OH_AT_HOME} — Mississauga Halton region`],
    regionalPrograms: [
      "Region of Peel — Long Term Care and Seniors' Services",
      "Peel Elder Abuse Prevention Network",
    ],
    seniorTransportation: [
      "MiWay Plus / TransHelp — Peel Region specialized transit",
      "Canadian Red Cross Transportation (Peel)",
    ],
  },
  "Brampton": {
    homeHealthResources: [`${OH_AT_HOME} — Central West region`],
    regionalPrograms: ["Region of Peel — Long Term Care and Seniors' Services"],
    seniorTransportation: ["Brampton Transit and Peel TransHelp specialized transit"],
  },
  "Caledon": {
    homeHealthResources: [`${OH_AT_HOME} — Central West region`],
    regionalPrograms: ["Region of Peel — Long Term Care and Seniors' Services"],
    seniorTransportation: ["Peel TransHelp specialized transit"],
  },

  /* ─── York ────────────────────────────────────────────────── */
  "Vaughan": {
    homeHealthResources: [`${OH_AT_HOME} — Central region`],
    regionalPrograms: ["York Region Community and Health Services — Seniors Services"],
    seniorTransportation: ["York Region Transit Mobility Plus"],
  },
  "Markham": {
    homeHealthResources: [`${OH_AT_HOME} — Central region`],
    regionalPrograms: ["York Region Community and Health Services — Seniors Services"],
    seniorTransportation: ["York Region Transit Mobility Plus"],
  },
  "Richmond Hill": {
    homeHealthResources: [`${OH_AT_HOME} — Central region`],
    regionalPrograms: ["York Region Community and Health Services — Seniors Services"],
    seniorTransportation: ["York Region Transit Mobility Plus"],
  },
  "Newmarket": {
    homeHealthResources: [`${OH_AT_HOME} — Central region`],
    regionalPrograms: ["York Region Community and Health Services — Seniors Services"],
    seniorTransportation: ["York Region Transit Mobility Plus"],
  },
  "Aurora": {
    homeHealthResources: [`${OH_AT_HOME} — Central region`],
    regionalPrograms: ["York Region Community and Health Services — Seniors Services"],
    seniorTransportation: ["York Region Transit Mobility Plus"],
  },
  "Stouffville": {
    homeHealthResources: [`${OH_AT_HOME} — Central region`],
    regionalPrograms: ["York Region Community and Health Services — Seniors Services"],
    seniorTransportation: ["York Region Transit Mobility Plus"],
  },
  "Keswick": {
    homeHealthResources: [`${OH_AT_HOME} — Central region`],
    regionalPrograms: ["Town of Georgina — Seniors Services", "York Region Community and Health Services"],
    seniorTransportation: ["York Region Transit Mobility Plus"],
  },

  /* ─── Halton ──────────────────────────────────────────────── */
  "Oakville": {
    homeHealthResources: [`${OH_AT_HOME} — Mississauga Halton region`],
    regionalPrograms: ["Halton Region — Services for Seniors", "Oak-Park Neighbourhood Centre older adult programs"],
    seniorTransportation: ["Oakville Transit care-A-van specialized service"],
  },
  "Burlington": {
    homeHealthResources: [`${OH_AT_HOME} — Hamilton Niagara Haldimand Brant region`],
    regionalPrograms: ["Halton Region — Services for Seniors", "Burlington Seniors' Centre"],
    seniorTransportation: ["Burlington Transit Handi-Van specialized service"],
  },
  "Milton": {
    homeHealthResources: [`${OH_AT_HOME} — Mississauga Halton region`],
    regionalPrograms: ["Halton Region — Services for Seniors"],
    seniorTransportation: ["Milton Transit and Halton specialized transit"],
  },
  "Georgetown": {
    homeHealthResources: [`${OH_AT_HOME} — Mississauga Halton region`],
    regionalPrograms: ["Halton Region — Services for Seniors", "Halton Hills Older Adult Programming"],
    seniorTransportation: ["ActiVan Halton Hills specialized transit"],
  },

  /* ─── Durham ──────────────────────────────────────────────── */
  "Oshawa": {
    rehabCentres: ["Lakeridge Health — Rehabilitation Services"],
    homeHealthResources: [`${OH_AT_HOME} — Central East region`],
    regionalPrograms: ["Region of Durham — Long-Term Care and Services for Seniors"],
    seniorTransportation: ["Durham Region Transit Specialized Services (DRT On Demand)"],
  },
  "Whitby": {
    rehabCentres: ["Lakeridge Health Whitby — Complex Continuing Care and Rehabilitation"],
    homeHealthResources: [`${OH_AT_HOME} — Central East region`],
    regionalPrograms: ["Region of Durham — Long-Term Care and Services for Seniors"],
    seniorTransportation: ["Durham Region Transit Specialized Services"],
  },
  "Ajax": {
    homeHealthResources: [`${OH_AT_HOME} — Central East region`],
    regionalPrograms: ["Region of Durham — Long-Term Care and Services for Seniors"],
    seniorTransportation: ["Durham Region Transit Specialized Services"],
  },
  "Pickering": {
    homeHealthResources: [`${OH_AT_HOME} — Central East region`],
    regionalPrograms: ["Region of Durham — Long-Term Care and Services for Seniors"],
    seniorTransportation: ["Durham Region Transit Specialized Services"],
  },
  "Bowmanville": {
    rehabCentres: ["Lakeridge Health Bowmanville — Rehabilitation and Complex Continuing Care"],
    homeHealthResources: [`${OH_AT_HOME} — Central East region`],
    regionalPrograms: ["Region of Durham — Long-Term Care and Services for Seniors"],
    seniorTransportation: ["Durham Region Transit Specialized Services"],
  },
  "Courtice": {
    homeHealthResources: [`${OH_AT_HOME} — Central East region`],
    regionalPrograms: ["Region of Durham — Long-Term Care and Services for Seniors"],
    seniorTransportation: ["Durham Region Transit Specialized Services"],
  },

  /* ─── Simcoe / Central ────────────────────────────────────── */
  "Barrie": {
    rehabCentres: ["Royal Victoria Regional Health Centre — Rehabilitation program"],
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: [
      "County of Simcoe — Long-Term Care and Seniors Services",
      "Alzheimer Society of Simcoe County",
    ],
    seniorTransportation: [
      "Barrie Transit BAM (Barrie Accessible Mobility)",
      "Canadian Red Cross Transportation (Simcoe County)",
    ],
  },
  "Innisfil": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["County of Simcoe — Long-Term Care and Seniors Services"],
    seniorTransportation: ["Innisfil Transit and County of Simcoe LINX services"],
  },
  "Orillia": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["County of Simcoe — Long-Term Care and Seniors Services"],
    seniorTransportation: ["Orillia Transit and Simcoe County LINX regional service"],
  },
  "Bradford": {
    homeHealthResources: [`${OH_AT_HOME} — Central region`],
    regionalPrograms: ["County of Simcoe — Long-Term Care and Seniors Services"],
    seniorTransportation: ["BWG Transit and Simcoe County LINX regional service"],
  },
  "Alliston": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["County of Simcoe — Long-Term Care and Seniors Services"],
    seniorTransportation: ["Simcoe County LINX regional service"],
  },
  "Midland": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["County of Simcoe — Long-Term Care and Seniors Services"],
    seniorTransportation: ["Midland Transit and Simcoe County LINX regional service"],
  },
  "Collingwood": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["County of Simcoe — Long-Term Care and Seniors Services"],
    seniorTransportation: ["Colltrans and Simcoe County LINX regional service"],
  },
  "Wasaga Beach": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["County of Simcoe — Long-Term Care and Seniors Services"],
    seniorTransportation: ["Wasaga Beach transit and Simcoe County LINX regional service"],
  },
  "Penetanguishene": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["County of Simcoe — Long-Term Care and Seniors Services"],
    seniorTransportation: ["Simcoe County LINX regional service"],
  },

  /* ─── Muskoka ─────────────────────────────────────────────── */
  "Gravenhurst": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["District Municipality of Muskoka — Community Services"],
  },
  "Bracebridge": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["District Municipality of Muskoka — Community Services"],
  },
  "Huntsville": {
    homeHealthResources: [`${OH_AT_HOME} — North Simcoe Muskoka region`],
    regionalPrograms: ["District Municipality of Muskoka — Community Services"],
  },

  /* ─── Hamilton / Niagara ──────────────────────────────────── */
  "Hamilton": {
    rehabCentres: [
      "Hamilton Health Sciences — Regional Rehabilitation Centre",
      "St. Peter's Hospital (Hamilton Health Sciences) — Complex Continuing Care and Rehabilitation",
    ],
    homeHealthResources: [`${OH_AT_HOME} — Hamilton Niagara Haldimand Brant region`],
    regionalPrograms: [
      "City of Hamilton — Seniors Advisory Committee and Older Adult Strategy",
      "Alzheimer Society of Brant, Haldimand Norfolk, Hamilton Halton",
    ],
    seniorTransportation: ["HSR DARTS accessible transportation service"],
  },
  "Stoney Creek": {
    homeHealthResources: [`${OH_AT_HOME} — Hamilton Niagara Haldimand Brant region`],
    regionalPrograms: ["City of Hamilton — Older Adult Strategy"],
    seniorTransportation: ["HSR DARTS accessible transportation service"],
  },
  "Dundas": {
    homeHealthResources: [`${OH_AT_HOME} — Hamilton Niagara Haldimand Brant region`],
    regionalPrograms: ["City of Hamilton — Older Adult Strategy"],
    seniorTransportation: ["HSR DARTS accessible transportation service"],
  },
  "St. Catharines": {
    homeHealthResources: [`${OH_AT_HOME} — Hamilton Niagara Haldimand Brant region`],
    regionalPrograms: ["Niagara Region — Seniors Services and Community Support"],
    seniorTransportation: ["Niagara Specialized Transit and St. Catharines Transit"],
  },
  "Niagara Falls": {
    homeHealthResources: [`${OH_AT_HOME} — Hamilton Niagara Haldimand Brant region`],
    regionalPrograms: ["Niagara Region — Seniors Services and Community Support"],
    seniorTransportation: ["Niagara Falls Transit Chair-A-Van specialized service"],
  },
  "Welland": {
    homeHealthResources: [`${OH_AT_HOME} — Hamilton Niagara Haldimand Brant region`],
    regionalPrograms: ["Niagara Region — Seniors Services and Community Support"],
    seniorTransportation: ["Welland Transit accessible service and Niagara Region Transit"],
  },
  "Brantford": {
    homeHealthResources: [`${OH_AT_HOME} — Hamilton Niagara Haldimand Brant region`],
    regionalPrograms: ["City of Brantford — Older Adult Services"],
    seniorTransportation: ["Brantford Transit Lift accessible service"],
  },

  /* ─── Waterloo Region ─────────────────────────────────────── */
  "Kitchener": {
    rehabCentres: ["Grand River Hospital — Freeport Campus (Complex Continuing Care and Rehabilitation)"],
    homeHealthResources: [`${OH_AT_HOME} — Waterloo Wellington region`],
    regionalPrograms: ["Region of Waterloo — Seniors' Services and Community Programs"],
    seniorTransportation: ["Grand River Transit MobilityPLUS specialized transit"],
  },
  "Waterloo": {
    rehabCentres: ["Grand River Hospital — Freeport Campus"],
    homeHealthResources: [`${OH_AT_HOME} — Waterloo Wellington region`],
    regionalPrograms: ["Region of Waterloo — Seniors' Services and Community Programs"],
    seniorTransportation: ["Grand River Transit MobilityPLUS specialized transit"],
  },
  "Cambridge": {
    homeHealthResources: [`${OH_AT_HOME} — Waterloo Wellington region`],
    regionalPrograms: ["Region of Waterloo — Seniors' Services and Community Programs"],
    seniorTransportation: ["Grand River Transit MobilityPLUS specialized transit"],
  },
  "Guelph": {
    homeHealthResources: [`${OH_AT_HOME} — Waterloo Wellington region`],
    regionalPrograms: ["County of Wellington — Community and Social Services"],
    seniorTransportation: ["Guelph Transit Mobility Services accessible transit"],
  },

  /* ─── Southwest ───────────────────────────────────────────── */
  "London": {
    rehabCentres: [
      "Parkwood Institute (St. Joseph's Health Care London) — regional rehabilitation, mental health and complex care",
    ],
    homeHealthResources: [`${OH_AT_HOME} — South West region`],
    regionalPrograms: [
      "City of London — Age Friendly London and Seniors Services",
      "Alzheimer Society Southwest Partners",
    ],
    seniorTransportation: ["London Transit Commission Specialized Transit (LTC Paratransit)"],
  },
  "Windsor": {
    rehabCentres: ["Hôtel-Dieu Grace Healthcare — Rehabilitation and Complex Medical program"],
    homeHealthResources: [`${OH_AT_HOME} — Erie St. Clair region`],
    regionalPrograms: ["City of Windsor — Recreation and Culture 55+ programs"],
    seniorTransportation: ["Transit Windsor Handi-Transit"],
  },
  "Sarnia": {
    homeHealthResources: [`${OH_AT_HOME} — Erie St. Clair region`],
    regionalPrograms: ["Lambton County — Long-Term Care and Community Services"],
    seniorTransportation: ["Sarnia Care-A-Van specialized transit"],
  },
  "Woodstock": {
    homeHealthResources: [`${OH_AT_HOME} — South West region`],
    regionalPrograms: ["County of Oxford — Human Services"],
    seniorTransportation: ["Woodstock Transit and T:GO regional transit"],
  },

  /* ─── East / Ottawa Valley ────────────────────────────────── */
  "Ottawa": {
    rehabCentres: [
      "The Ottawa Hospital Rehabilitation Centre",
      "Bruyère — Saint-Vincent Hospital and Élisabeth Bruyère Hospital",
    ],
    homeHealthResources: [`${OH_AT_HOME} — Champlain region`],
    regionalPrograms: [
      "City of Ottawa — Older Adult Plan",
      "The Council on Aging of Ottawa",
      "Champlain Community Support Network",
    ],
    seniorTransportation: [
      "OC Transpo Para Transpo — specialized door-to-door transit",
      "Canadian Red Cross Transportation (Ottawa)",
    ],
  },
  "Cornwall": {
    homeHealthResources: [`${OH_AT_HOME} — Champlain region`],
    regionalPrograms: ["United Counties of Stormont, Dundas and Glengarry — Social and Community Services"],
    seniorTransportation: ["Cornwall Transit Handi-Transit accessible service"],
  },
  "Kingston": {
    rehabCentres: ["Providence Care Hospital — Rehabilitation, Complex Medical and Mental Health"],
    homeHealthResources: [`${OH_AT_HOME} — South East region`],
    regionalPrograms: ["City of Kingston — Seniors Association Kingston Region", "Community Care for Seniors (Kingston)"],
    seniorTransportation: ["Kingston Access Services specialized transit"],
  },
  "Belleville": {
    homeHealthResources: [`${OH_AT_HOME} — South East region`],
    regionalPrograms: ["Hastings County — Community and Human Services"],
    seniorTransportation: ["Belleville Transit accessible service"],
  },
  "Peterborough": {
    homeHealthResources: [`${OH_AT_HOME} — Central East region`],
    regionalPrograms: ["City of Peterborough — Age-friendly Peterborough", "Peterborough County — Community Services"],
    seniorTransportation: ["Peterborough Transit Handi-Van specialized service"],
  },
  "Cobourg": {
    homeHealthResources: [`${OH_AT_HOME} — Central East region`],
    regionalPrograms: ["Northumberland County — Community and Social Services"],
    seniorTransportation: ["Cobourg Transit and Northumberland Transportation Services"],
  },
  "Orangeville": {
    homeHealthResources: [`${OH_AT_HOME} — Central West region`],
    regionalPrograms: ["County of Dufferin — Community Services"],
    seniorTransportation: ["Orangeville Transit and Dufferin County transportation programs"],
  },

  /* ─── Northern Ontario ────────────────────────────────────── */
  "Sudbury": {
    rehabCentres: ["Health Sciences North — Rehabilitation and Complex Continuing Care"],
    homeHealthResources: [`${OH_AT_HOME} — North East region`],
    regionalPrograms: ["City of Greater Sudbury — Pioneer Manor and Seniors Services"],
    seniorTransportation: ["GOVA Plus specialized accessible transit"],
  },
  "North Bay": {
    homeHealthResources: [`${OH_AT_HOME} — North East region`],
    regionalPrograms: ["District of Nipissing Social Services Administration Board"],
    seniorTransportation: ["North Bay Transit accessible service"],
  },
  "Sault Ste Marie": {
    homeHealthResources: [`${OH_AT_HOME} — North East region`],
    regionalPrograms: ["City of Sault Ste. Marie — Community Services"],
    seniorTransportation: ["Sault Ste. Marie Transit Parabus specialized service"],
  },
  "Timmins": {
    homeHealthResources: [`${OH_AT_HOME} — North East region`],
    regionalPrograms: ["Cochrane District Social Services Administration Board"],
    seniorTransportation: ["Timmins Transit Handy Transit accessible service"],
  },
  "Thunder Bay": {
    rehabCentres: ["St. Joseph's Care Group — Hogarth Riverview Manor and rehabilitation programs"],
    homeHealthResources: [`${OH_AT_HOME} — North West region`],
    regionalPrograms: ["City of Thunder Bay — 55 Plus Centre and Age Friendly Thunder Bay"],
    seniorTransportation: ["Thunder Bay Transit Lift+ accessible service"],
  },
  "Kenora": {
    homeHealthResources: [`${OH_AT_HOME} — North West region`],
    regionalPrograms: ["Kenora District Services Board"],
  },
};

/** Fallback that inherits from a parent city when a suburb has no direct entry. */
export function getLocalResources(city: string, parent?: string): LocalResources {
  const direct = LOCAL_RESOURCES[city];
  if (direct) return direct;
  if (parent && LOCAL_RESOURCES[parent]) return LOCAL_RESOURCES[parent];
  return {};
}

export function hasAnyLocalResources(res: LocalResources): boolean {
  return Boolean(
    res.rehabCentres?.length ||
    res.retirementCommunities?.length ||
    res.seniorsCentres?.length ||
    res.physioResources?.length ||
    res.homeHealthResources?.length ||
    res.regionalPrograms?.length ||
    res.seniorTransportation?.length
  );
}

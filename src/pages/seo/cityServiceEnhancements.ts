/**
 * City × Service page enhancement helpers.
 *
 * Purely additive content generators used by ExpandedCityServicePage to
 * eliminate soft-404 signals from thin pages. Deterministic per (city, service)
 * — no randomness — so crawlers see stable content.
 *
 * Does NOT change URLs, canonical, routing, schema keys, or booking flow.
 */

import { getCityProfile } from "@/lib/cityProfiles";
import { getLocalHospitals, hasLocalHospitals } from "@/lib/localHospitalData";
import { getNearbyCities } from "@/lib/seoCityData";

/** Small deterministic hash for choosing paragraph variants per (city, service). */
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

/** Extra hero paragraphs (2 paragraphs, ~180 words) that expand the intro. */
export function getExpandedHeroParagraphs(
  city: string,
  serviceLabel: string,
  service: string,
): string[] {
  const profile = getCityProfile(city);
  const county = profile.county ? ` in ${profile.county}` : "";
  const region = profile.region;
  const seed = `${city}|${service}`;

  const openerVariants = [
    `Families across ${city}${county} choose PSW Direct because every caregiver on our platform is a credential-verified Personal Support Worker — background-checked, insured and trained in compassionate in-home care. Our ${serviceLabel.toLowerCase()} visits are booked by the hour with transparent pricing, so you never sign a contract or pay agency markups you don't understand.`,
    `${city} families turn to PSW Direct for ${serviceLabel.toLowerCase()} because we combine the reliability of a professional agency with the flexibility of a direct-hire caregiver. Every PSW is credential-verified, police-checked and insured, and every visit is documented in a care sheet you can review the same day.`,
    `When families in ${city} search for ${serviceLabel.toLowerCase()}, they need a caregiver they can trust in their loved one's home the same day. PSW Direct matches you with a vetted Personal Support Worker — credential verified, background screened and covered by liability insurance — and confirms the visit online in minutes.`,
  ];

  const secondVariants = [
    `Flexible scheduling means you can book a single visit, recurring weekly support, overnight care or a full 24-hour rotation. Same-day availability is common across ${city}, and our care team can usually confirm a PSW within a few hours. Whether you need short shower visits, dementia supervision, post-hospital recovery or dependable respite for a family caregiver, the ${serviceLabel.toLowerCase()} you book stays local to ${city} and its surrounding communities.`,
    `Every ${serviceLabel.toLowerCase()} booking in ${city} includes flexible scheduling — a few hours a week, daily visits, overnights, or continuous 24-hour cover — with same-day availability when a caregiver is nearby. Because our PSWs live in and around ${city}, the person who arrives at the door already knows the neighbourhood, the hospitals and the pace of local life.`,
    `Whether the need is a few short visits each week or continuous around-the-clock support, ${serviceLabel.toLowerCase()} through PSW Direct in ${city} adapts to the family's schedule rather than forcing families to adapt to ours. Same-day bookings are supported when a PSW is available in the area, and every caregiver arrives with credentials verified and a clear plan for the visit.`,
  ];

  const paragraphs = [pick(openerVariants, seed + "|a"), pick(secondVariants, seed + "|b")];

  // Third short paragraph anchored on verifiable local geography.
  if (region === "gta" || region === "peel" || region === "york" || region === "halton" || region === "durham") {
    paragraphs.push(
      `As a GTA-area community, ${city} is served by a large pool of PSWs commuting from surrounding neighbourhoods, which is why urgent and same-day ${serviceLabel.toLowerCase()} requests are usually filled quickly.`,
    );
  } else if (region === "east" || region === "ottawa-valley") {
    paragraphs.push(
      `Eastern Ontario communities like ${city} are served by PSWs based across the region, and PSW Direct coordinates travel time so ${serviceLabel.toLowerCase()} visits still start on schedule.`,
    );
  } else if (region === "southwest") {
    paragraphs.push(
      `${city} sits within southwestern Ontario's home-care corridor, and PSW Direct dispatches caregivers from nearby communities so ${serviceLabel.toLowerCase()} visits arrive on time.`,
    );
  } else if (region === "central" || region === "simcoe" || region === "waterloo") {
    paragraphs.push(
      `Central Ontario families in ${city} rely on PSW Direct for ${serviceLabel.toLowerCase()} because our caregivers are drawn from the surrounding region, keeping visits local and predictable.`,
    );
  }

  return paragraphs;
}

/**
 * A detailed service breakdown — 15 sub-services with 1–2 sentence descriptions.
 * Rendered under an H2 like "Personal Care Services in {City}".
 */
export function getDetailedServiceBreakdown(serviceLabel: string, city: string): {
  title: string;
  body: string;
  items: { name: string; description: string }[];
} {
  return {
    title: `${serviceLabel} services in ${city}`,
    body: `Every ${serviceLabel.toLowerCase()} booking in ${city} is customized around the client's daily routine, mobility level and preferences. Below is a plain-language breakdown of the specific tasks a Personal Support Worker from PSW Direct typically covers during a visit — you can request all of them, or just the ones that matter most.`,
    items: [
      { name: "Bathing assistance", description: `Safe shower, tub and bed-bath support with fall-prevention techniques, delivered with modesty and respect in ${city} homes and apartments.` },
      { name: "Grooming and hygiene", description: "Hair care, shaving, oral care, nail care and skin checks — the small daily rituals that keep a senior feeling like themselves." },
      { name: "Dressing assistance", description: "Patient help getting ready in the morning and comfortable at night, including adaptive techniques for arthritis, stroke recovery or one-sided weakness." },
      { name: "Toileting and incontinence care", description: "Discreet bathroom transfers, brief and pad changes, perineal care and skin protection — always handled with dignity." },
      { name: "Mobility assistance", description: "Walking support, use of walkers, canes and wheelchairs, plus gentle range-of-motion exercises to preserve strength." },
      { name: "Safe transfers", description: "Sit-to-stand, bed-to-chair and bathroom transfers using proper body mechanics and, where needed, transfer belts or slide sheets." },
      { name: "Meal preparation", description: "Nutritious meals matched to the client's diet, preferences and cultural background, prepared in the client's own kitchen." },
      { name: "Medication reminders", description: "Cueing to take medications on schedule, tracking what was taken, and flagging any changes for the family. (PSWs do not administer injections.)" },
      { name: "Companionship", description: `Conversation, hobbies, walks, reading and simply being present — the antidote to isolation that so many ${city} seniors face.` },
      { name: "Dementia and Alzheimer's support", description: "Structured routines, gentle redirection, wandering supervision and calm reassurance for clients living with cognitive change." },
      { name: "Fall prevention", description: "Home hazard checks, footwear reminders, bathroom safety and steady physical support during the highest-risk transitions of the day." },
      { name: "Respite for family caregivers", description: "Blocks of care — from a few hours to overnight — that give a spouse, adult child or partner the space to rest, work or step away." },
      { name: "Post-hospital recovery", description: "Extra help in the days after a hospital discharge: medication reminders, mobility support, hygiene, and watching for warning signs." },
      { name: "Overnight and 24-hour care", description: "Nighttime supervision, bathroom help, repositioning and immediate response — booked as awake overnights or full continuous shifts." },
      { name: "Daily living assistance", description: "Light housekeeping, laundry, tidying, grocery runs and accompaniment to appointments — the everyday tasks that keep a household running." },
    ],
  };
}

/** Neighbourhoods / landmarks per city. Only verified, publicly-known entries. */
const CITY_NEIGHBOURHOODS: Record<string, string[]> = {
  "Kingston": ["Downtown Kingston", "Cataraqui", "Bayridge", "Portsmouth", "Collins Bay", "Amherstview", "Reddendale", "Kingscourt", "Sydenham Ward"],
  "Toronto": ["Downtown", "North York", "Scarborough", "Etobicoke", "East York", "The Beaches", "High Park", "Yorkville", "Leslieville"],
  "Ottawa": ["Downtown Ottawa", "Kanata", "Nepean", "Orléans", "Barrhaven", "Gloucester", "Stittsville", "Manotick"],
  "Hamilton": ["Downtown Hamilton", "Ancaster", "Dundas", "Stoney Creek", "Waterdown", "Westdale", "East Hamilton"],
  "Mississauga": ["Port Credit", "Streetsville", "Meadowvale", "Erin Mills", "Clarkson", "Lorne Park", "Cooksville", "Square One"],
  "Brampton": ["Downtown Brampton", "Bramalea", "Heart Lake", "Springdale", "Mount Pleasant", "Fletcher's Meadow"],
  "London": ["Downtown London", "Byron", "Masonville", "Westmount", "Hyde Park", "Lambeth", "Oakridge", "White Oaks"],
  "Windsor": ["Downtown Windsor", "Walkerville", "South Windsor", "Riverside", "Sandwich", "East Windsor"],
  "Barrie": ["Downtown Barrie", "Painswick", "Ardagh", "Holly", "Innis-Shore", "Sunnidale", "Letitia Heights"],
  "Kitchener": ["Downtown Kitchener", "Doon", "Forest Heights", "Stanley Park", "Rockway", "Chicopee"],
  "Waterloo": ["Uptown Waterloo", "Westmount", "Beechwood", "Lakeshore", "Columbia Forest", "Laurelwood"],
  "Cambridge": ["Galt", "Preston", "Hespeler"],
  "Guelph": ["Downtown Guelph", "Old University", "Kortright Hills", "Westminster Woods", "Grange Hill East"],
  "Oshawa": ["Downtown Oshawa", "Windfields", "Taunton", "Northglen", "Donevan", "Lakeview"],
  "Whitby": ["Downtown Whitby", "Brooklin", "Port Whitby", "Rolling Acres"],
  "Ajax": ["Central Ajax", "Pickering Village", "Duffin's Bay", "Nottingham"],
  "Pickering": ["Bay Ridges", "Rougemount", "West Shore", "Amberlea", "Rosebank"],
  "Markham": ["Unionville", "Thornhill", "Milliken", "Cornell", "Cathedraltown", "Cachet"],
  "Vaughan": ["Woodbridge", "Maple", "Thornhill", "Concord", "Kleinburg"],
  "Richmond Hill": ["Oak Ridges", "Bayview Hill", "Jefferson", "Mill Pond", "Rouge Woods"],
  "Newmarket": ["Downtown Newmarket", "Stonehaven", "Woodland Hill", "Summerhill Estates"],
  "Aurora": ["Aurora Village", "Bayview Wellington", "Aurora Heights", "Hills of St. Andrew"],
  "Burlington": ["Downtown Burlington", "Aldershot", "Alton Village", "Millcroft", "Roseland"],
  "Oakville": ["Downtown Oakville", "Bronte", "Glen Abbey", "West Oak Trails", "Palermo"],
  "Milton": ["Downtown Milton", "Beaty", "Bronte Meadows", "Willmott", "Coates"],
  "St. Catharines": ["Downtown St. Catharines", "Port Dalhousie", "Grantham", "Merritton", "Western Hill"],
  "Niagara Falls": ["Downtown Niagara Falls", "Chippawa", "Stamford", "Mount Carmel"],
  "Peterborough": ["Downtown Peterborough", "East City", "Westmount", "Kawartha Heights"],
  "Belleville": ["Downtown Belleville", "East Hill", "West Hill", "Cannifton"],
  "Kawartha Lakes": ["Lindsay", "Bobcaygeon", "Fenelon Falls", "Omemee"],
  "Sudbury": ["Downtown Sudbury", "New Sudbury", "South End", "Copper Cliff", "Val Caron"],
  "Thunder Bay": ["Downtown Thunder Bay", "Westfort", "Current River", "County Park"],
  "Sault Ste. Marie": ["Downtown Sault Ste. Marie", "West End", "East End", "Steelton"],
  "North Bay": ["Downtown North Bay", "Ferris", "West Ferris", "Airport Hill"],
  "Timmins": ["Downtown Timmins", "Schumacher", "South Porcupine", "Mountjoy"],
  "Sarnia": ["Downtown Sarnia", "Blackwell", "Point Edward", "Bright's Grove"],
  "Chatham": ["Downtown Chatham", "Wallaceburg", "Blenheim", "Tilbury"],
  "Cornwall": ["Downtown Cornwall", "Riverdale", "East Cornwall", "Long Sault"],
  "Brantford": ["Downtown Brantford", "West Brant", "Terrace Hill", "Echo Place"],
  "Brockville": ["Downtown Brockville", "North End", "South End"],
  "Orillia": ["Downtown Orillia", "Westmount", "North Ward"],
  "Collingwood": ["Downtown Collingwood", "Blue Mountain", "Sunset Point"],
};

/** Pull neighbourhoods with a safe fallback. */
export function getCityNeighbourhoods(city: string): string[] {
  return CITY_NEIGHBOURHOODS[city] || [];
}

/** Extended FAQs (8) — city-specific, merged with content.faqs for the schema. */
export function getExtendedCityFAQs(city: string, serviceLabel: string): { question: string; answer: string }[] {
  const nearby = getNearbyCities(city).slice(0, 4);
  const nearbyLine = nearby.length ? nearby.join(", ") : "surrounding Ontario communities";
  const hospitalsLine = hasLocalHospitals(city)
    ? getLocalHospitals(city).slice(0, 3).map((h) => h.name).join(", ")
    : "";

  const faqs: { question: string; answer: string }[] = [
    {
      question: `How quickly can a PSW arrive in ${city}?`,
      answer: `Same-day availability is common in ${city}. Once you book, our care team confirms a vetted Personal Support Worker — usually within a few hours — depending on the time of day and the type of ${serviceLabel.toLowerCase()} requested.`,
    },
    {
      question: `Do you provide overnight ${serviceLabel.toLowerCase()} in ${city}?`,
      answer: `Yes. Overnight visits, awake overnights and full 24-hour care are available in ${city}. Overnight PSWs provide bathroom help, repositioning, wandering supervision and immediate response through the night.`,
    },
    {
      question: `Do you offer weekend and holiday care in ${city}?`,
      answer: `Yes — ${city} coverage runs seven days a week, including weekends and statutory holidays. Same-day requests on weekends are supported when a PSW is available in the area.`,
    },
    {
      question: `Can I book recurring visits in ${city}?`,
      answer: `Absolutely. Most families in ${city} book recurring weekly or daily visits and we prioritize sending the same PSW each time to build continuity.`,
    },
    {
      question: `Do your ${city} PSWs support dementia and Alzheimer's care?`,
      answer: `Yes. Many caregivers on the PSW Direct platform have specialized training in dementia and Alzheimer's care, including redirection, wandering supervision and calm cueing for behavioural changes.`,
    },
    {
      question: `Can I choose or request a specific caregiver?`,
      answer: `Once a PSW has visited and you're comfortable with them, you can request them for future bookings in ${city}. Preferences on gender and language are also honoured whenever possible.`,
    },
    {
      question: `What areas around ${city} do you serve?`,
      answer: `In addition to ${city}, our caregivers regularly cover ${nearbyLine}. Coverage is confirmed at booking based on the exact address.`,
    },
    {
      question: `How do I book ${serviceLabel.toLowerCase()} in ${city}?`,
      answer: `Book online in about two minutes at pswdirect.ca, or call our care team at (249) 288-4787. There are no contracts and pricing starts at $35/hr.`,
    },
  ];

  if (hospitalsLine) {
    faqs.push({
      question: `Do you support post-hospital discharge from ${city} hospitals?`,
      answer: `Yes. PSW Direct supports recovery visits following discharge from hospitals serving ${city}, including ${hospitalsLine}. A PSW can be scheduled to start the day of discharge.`,
    });
  }

  return faqs;
}

/** Merge original short FAQs with the extended set, deduping by question text. */
export function mergeFaqs(
  base: { question: string; answer: string }[],
  extra: { question: string; answer: string }[],
): { question: string; answer: string }[] {
  const seen = new Set<string>();
  const out: { question: string; answer: string }[] = [];
  for (const f of [...base, ...extra]) {
    const k = f.question.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

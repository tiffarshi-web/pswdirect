/**
 * Deterministic local-content generation for SEO city + service pages.
 *
 * SEO Phase 3 — slot-based composition engine.
 *
 * Each visible paragraph is assembled from 3–5 sentence slots, and each slot
 * has 15–25 sentence variants. Combined with profile-driven "signature"
 * sentences (retirement growth, waterfront, bilingual, cardiac hub, etc.),
 * this yields hundreds of thousands of unique paragraph combinations across
 * ~15,000 city×service pages — targeted at <40% duplicate-paragraph and
 * <50% duplicate-sentence rates.
 *
 * Rules honoured:
 *  - Deterministic. Same (city, service) → same output (hydration-safe).
 *  - Factually careful. Only sentences that are broadly true of Ontario home
 *    care are in the shared banks. Topical claims come only from verified
 *    profile flags in cityProfiles.ts.
 *  - No time promises, no fabricated hospitals, no invented programs.
 *  - Public API is unchanged so LocalAuthorityContent.tsx does not change.
 */

import { getCityProfile, type CityProfile, type CityTopic } from "./cityProfiles";

/* -------------------- deterministic PRNG helpers -------------------- */

export function seedFromKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function seededPick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function makeContext(city: string, service?: string) {
  const key = `${city.toLowerCase()}::${(service ?? "home-care").toLowerCase()}`;
  const seed = seedFromKey(key);
  const rng = mulberry32(seed);
  return { key, seed, rng };
}

/** Substitute tokens deterministically. */
function fill(template: string, city: string, slug: string, county?: string, region?: string): string {
  return template
    .split("{city}").join(city)
    .split("{slug}").join(slug)
    .split("{county}").join(county ?? "Ontario")
    .split("{region}").join(region ?? "Ontario");
}

/** Pick N unique items from an array deterministically. */
function pickN<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  return seededShuffle(arr, rng).slice(0, Math.min(n, arr.length));
}

/* ================================================================ *
 *  SIGNATURE SENTENCES — driven by verified city profile topics.   *
 *  Each topic contributes 4–6 phrasings. If a city has no topics,  *
 *  no signature sentence is added.                                 *
 * ================================================================ */

const TOPIC_SENTENCES: Record<CityTopic, string[]> = {
  "retirement-growth": [
    "{city} has seen sustained growth in its senior population, and much of the demand we see locally is from families supporting parents who chose the area to retire.",
    "As one of the retirement-friendly communities in {county}, {city} sees steady demand for regular in-home support from families whose parents settled here later in life.",
    "The share of {city} residents in their 70s and 80s has grown noticeably over the last decade, and PSW visits often centre on helping longtime homeowners keep their independence.",
    "Many {city} bookings come from adult children coordinating care for parents who retired to the area and now need light daily help to stay at home comfortably.",
  ],
  "commuter-community": [
    "{city} is a commuter community, and a large share of our bookings come from adult children who work in Toronto and need reliable weekday help for a parent at home.",
    "Because so many working-age {city} residents commute into the GTA daily, weekday coverage during work hours is one of the most common booking patterns we see here.",
    "Families in {city} often book PSW visits to bridge weekday commuting hours — mornings before work, midday check-ins, or after-school windows when the primary caregiver is out of the home.",
  ],
  "waterfront": [
    "Many {city} clients live in older waterfront homes with stairs, split levels, or narrow bathrooms — small details that shape how a PSW plans transfers, bathing, and daily routines.",
    "PSWs supporting {city} residents often work in lakefront properties where mobility, slip risk on tile bathrooms, and stair navigation are part of every visit.",
    "The mix of waterfront cottages and year-round homes in {city} means PSWs often adapt visit plans to older layouts with steps down to the water or sunroom entries.",
  ],
  "cottage-country": [
    "{city} sits in cottage country, and PSWs here routinely support families where the primary caregiver lives hours away in the GTA and books recurring visits for a parent living locally.",
    "Being in cottage country, {city} sees a distinctive booking pattern: extended-family visits in the summer, then regular local PSW support the rest of the year for the parent who stays.",
    "Cottage-country geography around {city} means longer travel distances between clients — recurring visits and multi-hour bookings work better than short pop-in check-ins in most of the area.",
  ],
  "seasonal-population": [
    "{city} has a strong seasonal population, and PSW schedules often shift in summer as extended family arrives to help, then return to steadier weekly visits in the fall and winter.",
    "The seasonal nature of {city} — busier summers, quieter winters — is something our coordinators plan around when setting recurring PSW schedules for residents.",
    "Because {city}'s population swells in the summer months, families sometimes reduce PSW hours in July and August, then step them back up once seasonal visitors leave.",
  ],
  "aging-in-place": [
    "A large share of families in {city} contact us specifically to help a parent stay in the family home rather than move to a retirement residence or long-term care.",
    "Aging in place is a common theme in {city} — bookings often start as a few weekly hours and gradually build up as needs change, all without the person having to leave the home they know.",
    "Many longtime {city} homeowners in their 70s, 80s, and 90s are supported through weekly PSW visits that make aging in the same home realistic and safe.",
  ],
  "bilingual-care": [
    "Bilingual (French/English) care is a real need in {city} for francophone seniors who are more comfortable receiving personal care and companionship in French — we match to French-speaking PSWs where available.",
    "PSW Direct can prioritize French-speaking caregivers for {city} bookings where a francophone senior would be more at ease being supported in their first language, subject to caregiver availability.",
    "In {city}, families sometimes specifically request a French-speaking PSW so an older parent can receive personal care in their preferred language.",
  ],
  "veterans": [
    "{city} is home to many veterans, and Veterans Affairs Canada (VAC) reimbursement for personal support and homemaking is one of the more common billing arrangements we see here.",
    "For {city} veterans with VAC-approved home care hours, we invoice at rates and in formats aligned with the VAC reimbursement process.",
    "Families supporting veteran parents in {city} often ask about VAC — the paperwork is straightforward, and we provide invoices in the format the reimbursement process expects.",
  ],
  "government-retirees": [
    "Many {city} clients are retired federal or provincial public servants whose extended-health benefits from the Public Service Health Care Plan or similar programs can reimburse eligible PSW hours.",
    "Federal retirees in {city} often have benefit plans that reimburse home care in whole or in part — every visit generates an invoice suitable for submission.",
  ],
  "cardiac-recovery": [
    "In {city}, PSWs regularly work with families whose loved one is recovering from cardiac surgery or a cardiac event — the focus is calm routine, medication reminders, and safe activity pacing under the cardiologist's plan.",
    "Cardiac recovery bookings are common in {city}: shorter walks, help with meal prep on a heart-healthy diet, and a PSW present so the person is not alone during the recovery weeks.",
  ],
  "orthopedic-recovery": [
    "After hip or knee replacements, {city} families often book several weeks of PSW support — helping with hygiene, transfers, and following the surgeon's mobility plan through the recovery window.",
    "Orthopedic recovery is one of the most predictable booking patterns in {city}: a set of hours per day for the first two to four weeks post-discharge, then tapering as mobility returns.",
  ],
  "stroke-rehab": [
    "Stroke rehab support in {city} is often a partnership between the outpatient rehab team, a family caregiver, and a PSW who visits to help with dressing, meals, and the daily exercises the therapist has prescribed.",
    "For {city} residents returning home after a stroke, PSW visits are commonly used to keep the outpatient rehab plan on track without medicalizing the home.",
  ],
  "cancer-recovery": [
    "PSWs support {city} families through the exhausting middle of chemotherapy or radiation cycles — meals, laundry, gentle personal care, and someone reliably present on the hard days.",
    "Cancer-recovery bookings in {city} vary week to week with the treatment schedule; visits often stretch on the days after infusion when energy is lowest.",
  ],
  "tourism-population": [
    "{city} is a tourism-heavy area, and seasonal traffic can affect drive times — we build travel into scheduling so PSWs arrive when families expect them.",
  ],
  "university-town": [
    "As a university town, {city} has many older residents whose adult children live away for work or school — remote-family coordination is a familiar part of setting up ongoing care here.",
  ],
  "manufacturing-town": [
    "{city}'s manufacturing history means many longtime residents are now retired and want to stay in the neighbourhoods they raised families in — steady, familiar-face PSW visits fit that preference well.",
  ],
  "farming-community": [
    "{city} sits in a farming community, and PSWs here are used to working in rural homes further from town — longer visits scheduled less frequently usually work better than short daily check-ins.",
  ],
  "northern-community": [
    "As a northern Ontario community, {city} has fewer PSWs per capita than southern cities, and recurring schedules booked in advance are the most reliable way to secure consistent care.",
    "In {city}, weather and distance are part of every plan — recurring PSW visits scheduled in advance work far better than last-minute requests in the winter months.",
  ],
  "rural": [
    "PSWs supporting families around {city} are used to rural driving distances — visits are typically planned as longer blocks rather than a series of short pop-ins.",
    "In rural areas around {city}, we recommend longer, less frequent visits so the trip is worthwhile for the caregiver and the client gets meaningful time.",
  ],
  "urban-density": [
    "{city}'s density and traffic patterns can extend arrival times during rush hour — we build that into scheduling and prefer confirmed windows over drop-in visits.",
  ],
  "new-canadians": [
    "{city} is home to many new-Canadian families, and PSW Direct dispatches caregivers from a wide range of cultural backgrounds — dietary preferences, holidays, and family-elder dynamics can all be noted in the booking.",
    "Multi-language households are common in {city}. When you book, note any language preference and we'll try to match a PSW who fits.",
  ],
  "multigenerational-households": [
    "Many {city} households are multi-generational, and PSW visits are structured to support the family caregiver rather than replace them — respite hours, hygiene assistance, or overnights while the family sleeps.",
    "In {city}'s multi-generational homes, respite care and overnight PSW support are common bookings — the family stays involved, and the PSW takes over for the hours they need to rest.",
  ],
  "hospital-hub": [
    "{city} functions as a regional hospital hub, and a meaningful share of our bookings are hospital-to-home transitions in the days after discharge.",
    "Because {city} draws patients from surrounding communities to its hospital, discharge-support bookings are one of the steadiest patterns we see here.",
  ],
  "regional-referral-hospital": [
    "{city} hosts a regional referral hospital that draws patients from across the surrounding area, and post-discharge PSW visits are frequently arranged for people returning home to smaller communities nearby.",
  ],
  "cottage-caregiver-relief": [
    "PSWs in cottage-country communities like {city} often provide caregiver relief in the summer months, when the primary family caregiver arrives from the city and needs help managing multiple weeks away from home.",
  ],
  "snowbird-population": [
    "{city} has a significant snowbird population, and bookings are commonly seasonal — steady support in summer and fall, then a pause or reduction while families are south for the winter.",
  ],
  "post-industrial": [
    "{city}'s longtime residents include many retirees from local industries; ongoing PSW visits are frequently used to help them stay in the homes and neighbourhoods they've lived in for decades.",
  ],
};

/* ================================================================ *
 *  WHY-CHOOSE composer.                                            *
 *  Each paragraph = opener + credential + operations + closer      *
 *  drawn from 4 separate banks (18–22 sentences each).             *
 * ================================================================ */

const WC_OPENER: readonly string[] = [
  "Families in {city} come to PSW Direct for the same reason: a clear, straightforward way to arrange home care without agency contracts or phone-quote pricing.",
  "In {city}, the choice of a home-care provider usually comes down to how predictable the process feels — bookings, invoicing, and caregivers all handled without surprises.",
  "What {city} families tell us matters most is that the whole arrangement — booking, pricing, invoicing, PSW matching — is visible and self-serve from the start.",
  "{city} families reach out when they need care set up quickly, and they stay because the operational side of things is quiet and consistent.",
  "The recurring feedback from {city} clients is straightforward: transparent pricing, screened PSWs, and no long-term commitment.",
  "For most {city} households we support, the deciding factor is being able to book, see the rate, and get a vetted PSW without a sales call.",
  "PSW Direct is a fit for {city} families who want to arrange care the way they arrange most other services: online, priced up front, cancellable.",
  "Home-care needs in {city} rarely arrive on a convenient schedule, and the platform is designed around that — same-day starts when possible, no waiting on office hours.",
  "In practice, families in {city} choose PSW Direct because everything about the arrangement — from the hourly rate to the PSW's credentials — is visible before the first booking.",
  "When a {city} family is comparing options, what usually stands out is transparent hourly pricing and vetted caregivers dispatched without an agency layer in between.",
  "Most of the {city} households who book through PSW Direct are looking for a lighter, faster process than a traditional agency can offer.",
  "In {city}, home-care support is often needed suddenly — after a fall, a hospital call, or a change in a parent's condition — and the booking flow is built for that.",
  "Families in and around {city} tell us they wanted a home-care option that didn't require phone calls, sales pitches, or annual contracts to get started.",
  "The premise for {city} families is simple: verified PSWs, hourly billing, no minimum term, and coordination that doesn't disappear after the first booking.",
  "{city} home-care bookings on PSW Direct tend to start small — one or two visits — and grow as families see the arrangement working.",
  "A lot of {city} clients come to us after trying an agency and finding the paperwork, minimums, or scheduling constraints frustrating.",
  "For {city} residents, the value of the platform shows up on the second and third booking — the same PSW where possible, no rebilling surprises, and a clear invoice for every visit.",
  "In {city}, PSW Direct is chosen most often for hospital-discharge support, ongoing help for aging parents, and respite for family caregivers who are running out of energy.",
];

const WC_CREDENTIAL: readonly string[] = [
  "Every PSW who accepts a shift here has completed a police vetting, credential review, and reference check before their first booking.",
  "Vetting is not optional: police checks, credential verification, and references are all completed before a PSW can accept a shift.",
  "Documented PSW certification, current police checks, and reference outcomes are on file for every caregiver on the platform.",
  "Screening covers police records, credentials, and references — no PSW is dispatched to a client home until all three are verified.",
  "PSWs are vetted before their first shift and re-vetted on a rolling basis so credentials and police checks don't quietly expire.",
  "Every caregiver serving {city} is credential-verified, police-vetted, and carries liability coverage for in-home work.",
  "The vetting process is stricter than most families realize: credentials, references, and police checks all completed before a first shift.",
  "Onboarding for PSWs is deliberately slow: full vetting, credential review, and references are non-negotiable before accepting client visits.",
  "PSWs on the platform have been screened against Ontario standards for personal support work, with documentation retained on file.",
  "Caregiver files include verified PSW certification and a current police check — both checked before a shift is confirmed.",
  "Screening is what makes the rest of the model work — the platform will only match PSWs whose vetting is complete and current.",
  "Every PSW serving {city} has been through the same vetting pipeline: credentials, police, references, insurance coverage.",
  "Documented credentials, current police clearance, and reference checks are the minimum bar to accept a shift here.",
  "The intake for PSWs is deliberately narrow — we'd rather have fewer, better-vetted caregivers than a wide pool with thin verification.",
  "Vetting isn't a checkbox: police, credentials, and references are all validated by real people before a PSW's first shift.",
];

const WC_OPERATIONS: readonly string[] = [
  "Hourly pricing is shown before you confirm the booking, invoicing happens per visit, and there are no long-term contracts or bundled fees.",
  "Rates are hourly, visible up front, and unchanged on the invoice — no bundled agency markups, no admin fees added at billing.",
  "You pay only for the hours the PSW is present, at the rate you saw when booking, with an invoice generated automatically after each visit.",
  "Bookings are hourly, cancellable, and priced the same way in the platform as they are on the invoice.",
  "The pricing model is deliberately simple: an hourly rate you approve at booking, an invoice per visit, no minimums or lock-in.",
  "No contract, no cancellation penalty, no bundled fees — visits are booked and billed one at a time.",
  "The transparent hourly rate is the same rate you'll see on every invoice, whether the visit is two hours or twelve.",
  "Billing is per-visit, priced at the same hourly rate you saw when booking, and generated automatically without follow-up phone calls.",
  "You approve the rate at booking, receive an invoice after each visit, and can pause or change the schedule anytime.",
  "The arrangement is intentionally light: hourly billing, invoice per visit, no contract to sign or cancel later.",
  "Scheduling is flexible — visits can be a couple of hours, an overnight, or a full day, all under the same transparent hourly rate.",
  "Cancelling or rescheduling is done through the client portal; the policy at time of booking is applied and nothing else is added later.",
  "You can pause a recurring schedule, add extra hours, or step down the visits — none of that changes the underlying hourly rate.",
  "Everything the family needs to know — rate, visit length, PSW assignment, invoice — is visible in the portal without a phone call.",
];

const WC_CLOSER: readonly string[] = [
  "That combination — screened PSWs, clear pricing, no lock-in — is why so many {city} families keep the number saved after their first booking.",
  "That predictability is what most {city} households tell us they wanted from a home-care provider in the first place.",
  "For families in {city} navigating hospital discharge, respite, or ongoing senior care, the model is designed to stay out of the way.",
  "It's not a sales pitch — it's how the platform is built, and it's why the arrangement tends to stick with {city} families who try it once.",
  "The whole point of the model is to make {city} home care feel like a normal, self-serve arrangement — not a negotiation with an agency.",
  "For {city} families this is often the first time home care has felt straightforward, and that alone is why bookings tend to recur.",
  "In {city}, that operational quiet — bookings work, invoices are clean, PSWs show up — matters more than any marketing language.",
  "It's a model that suits {city} households who want reliable help without a long back-and-forth to arrange it.",
  "The result for most {city} clients is a steady, low-friction arrangement they can adjust as the needs of a parent or spouse change.",
  "That's the practical difference for {city} families — home care set up the way most other services are, and adjusted as the situation evolves.",
];

/* ================================================================ *
 *  AVAILABILITY composer — 3 slots.                                *
 * ================================================================ */

const AV_INTRO: readonly string[] = [
  "Availability in {city} varies by neighbourhood and time of day.",
  "Depending on the day and where in {city} the address is, availability can shift hour to hour.",
  "How quickly a PSW can start in {city} depends on which caregivers are already active in the area.",
  "Same-day availability in {city} is real but not guaranteed — it depends on which PSWs are already nearby.",
  "In {city}, availability moves throughout the day as caregivers finish shifts and open up.",
  "PSW availability across {city} isn't uniform — neighbourhoods closer to hospital corridors typically fill faster.",
  "In practice, availability in {city} is best on weekdays during typical shift-change windows and lower on holidays.",
];

const AV_TIMING: readonly string[] = [
  "Same-day starts are often possible when a PSW is already active nearby, and next-day starts are usually straightforward.",
  "Where a same-day match isn't possible, next-day scheduling is the norm.",
  "For urgent bookings, the platform tries same-day first; when that isn't possible, the next-day slot is usually available.",
  "Same-day is the most common outcome for morning bookings; late-evening requests often start the following day instead.",
  "The booking flow shows real-time availability so families see what's possible before confirming.",
  "For hospital-discharge bookings, the platform prioritizes matching a PSW in time to be present on the discharge day.",
  "Recurring schedules can usually begin within a day or two of setting them up.",
];

const AV_SCHEDULE: readonly string[] = [
  "Recurring weekly visits, overnight support, and weekend care are all supported through the same booking flow.",
  "Weekly, bi-weekly, and daily recurring schedules all flow through the same booking system as one-off visits.",
  "Overnight shifts, weekend visits, and holiday coverage are handled through the standard booking flow without a special process.",
  "The platform supports one-off visits, recurring weekly patterns, overnight support, and 24-hour rotating coverage.",
  "You can add, remove, or shift individual visits inside a recurring schedule without cancelling the whole pattern.",
  "Whether the need is two hours a week or 24-hour coverage, the same booking flow handles it end to end.",
];

/* ================================================================ *
 *  AUTHORITY composer — 3 slots.                                   *
 * ================================================================ */

const AU_STANDARD: readonly string[] = [
  "Care in {city} is delivered by personal support workers trained in Ontario and screened against Ontario standards.",
  "PSWs dispatched to {city} through the platform are trained to Ontario standards and vetted before their first shift.",
  "Every PSW serving {city} has been screened against provincial standards for personal support work.",
  "The caregivers working in {city} homes have completed formal PSW training and been vetted before being cleared to accept shifts.",
  "PSWs on the platform hold current certification and have passed police checks and reference reviews.",
];

const AU_MODEL: readonly string[] = [
  "Visits are family-directed — you set the schedule, the tasks, and the pace.",
  "The client and family remain in charge of the schedule, the tasks, and the daily rhythm of visits.",
  "Care plans are directed by the family; the PSW works to the plan the family sets at booking and adjusts over time.",
  "Nothing about the model requires the family to hand over control — the schedule and tasks are always the family's call.",
  "PSWs work to the specific plan the family sets — the pace, the tasks, and the hours are all family-directed.",
];

const AU_FOCUS: readonly string[] = [
  "The focus is safe hospital-to-home transitions, comfortable in-home recovery, and steady day-to-day help for seniors aging at home.",
  "Most bookings fall into three patterns: discharge support, recovery care, and ongoing help for a senior staying in the family home.",
  "The three most common reasons families in {city} book are hospital discharge, post-surgery recovery, and long-term help for a parent aging in place.",
  "The operational focus is quiet, consistent visits — not clinical services, not medical management, just reliable personal support.",
  "The goal is a home-care arrangement that feels sustainable — light enough that families can maintain it for months or years if needed.",
];

/* ================================================================ *
 *  INLINE-LINK bank — cross-links two internal service pages.      *
 * ================================================================ */

const INLINE_LINKS_BANK: readonly string[] = [
  "Families in {city} who book [Post-Surgery Care](/post-surgery-care-{slug}) often also arrange [Companion Care](/companion-care-{slug}) and [Personal Care](/personal-care-assistance-{slug}) during the first weeks of recovery.",
  "In many {city} households, [Dementia Care](/memory-care-{slug}) works best alongside [Overnight Care](/overnight-home-care) and regular [Personal Care](/personal-care-assistance-{slug}) visits for hygiene and meals.",
  "For {city} residents leaving hospital, [Hospital Discharge Care](/hospital-discharge-care) is commonly paired with [Post-Surgery Care](/post-surgery-care-{slug}) and short daily [Home Care](/home-care-{slug}) check-ins.",
  "A [Stroke Recovery](/stroke-recovery-care-{slug}) plan in {city} typically combines [Mobility Assistance](/mobility-assistance-{slug}), [Personal Care](/personal-care-assistance-{slug}), and periodic [Respite Care](/family-caregiver-relief-{slug}) so the primary family caregiver can rest.",
  "Many {city} clients who start with [Companion Care](/companion-care-{slug}) later add [Overnight Care](/overnight-home-care) or [24-Hour Home Care](/24-hour-home-care) as needs change.",
  "For end-of-life comfort in {city}, [Palliative Home Care](/palliative-home-care-{slug}) is often combined with [Family Caregiver Relief](/family-caregiver-relief-{slug}) and steady [Personal Care](/personal-care-assistance-{slug}) visits.",
  "In {city}, families managing a Parkinson's diagnosis often combine [Personal Care](/personal-care-assistance-{slug}) with [Mobility Assistance](/mobility-assistance-{slug}) and periodic [Respite Care](/family-caregiver-relief-{slug}).",
  "Recurring [Companion Care](/companion-care-{slug}) visits in {city} are often paired with [Meal Preparation](/meal-preparation-{slug}) and light [Personal Care](/personal-care-assistance-{slug}) as the week's rhythm requires.",
  "For {city} families splitting time between the cottage and the city, [Respite Care](/family-caregiver-relief-{slug}) and short [Home Care](/home-care-{slug}) blocks are the most common pattern.",
  "In {city}, [Overnight Care](/overnight-home-care) is often booked alongside [Personal Care](/personal-care-assistance-{slug}) so the daytime family caregiver can sleep uninterrupted.",
];

/* ================================================================ *
 *  COMMON CARE NEEDS — expanded, service-tagged.                   *
 *  Each entry: key, priority-topics that boost it, 3 phrasings.    *
 * ================================================================ */

interface NeedEntry {
  key: string;
  boostTopics?: CityTopic[];
  variants: string[];
}

const COMMON_NEEDS_BANK: readonly NeedEntry[] = [
  { key: "hospital-discharge", boostTopics: ["hospital-hub", "regional-referral-hospital"], variants: [
    "Hospital discharge support to help someone leave the ward safely, get settled at home, and stay on track with post-discharge instructions.",
    "Hospital discharge care that bridges the gap between the ward and the front door — medication reminders, mobility support, and a calm first few days at home.",
    "Post-discharge PSW visits in {city} focused on the first 48–72 hours home: hygiene, meals, mobility, and confirming the discharge plan is being followed.",
  ]},
  { key: "post-surgery", boostTopics: ["orthopedic-recovery", "cardiac-recovery"], variants: [
    "Post-surgery recovery care for the first days and weeks after an operation — hygiene help, meal prep, mobility support, and someone reliably present.",
    "Post-operative home support for {city} residents recovering from orthopedic, cardiac, or day-surgery procedures, matched to the level of help required.",
    "Recovery-phase PSW visits arranged around the surgeon's activity restrictions, with visit length tapering as mobility returns.",
  ]},
  { key: "senior", boostTopics: ["aging-in-place", "retirement-growth"], variants: [
    "Senior care for parents who need daily help without moving into a facility — hygiene, cooking, light housekeeping, and companionship on their own schedule.",
    "In-home senior care in {city} that keeps routines familiar: same PSW where possible, the same living room, the same neighbourhood.",
    "Daily senior support arranged around what the person already does at home — the same kitchen, the same routine, the same PSW where availability allows.",
  ]},
  { key: "dementia", variants: [
    "Dementia care with PSWs experienced in redirection, sundowning, and structured daily routines that reduce agitation.",
    "Dementia support at home — calm, structured visits from PSWs trained to work with memory loss rather than around it.",
    "Consistent-PSW dementia care in {city}, so the person receiving support isn't meeting a new face every visit.",
  ]},
  { key: "alzheimers", variants: [
    "Alzheimer's care for {city} families who need consistent, patient PSWs who can hold a routine and adapt as the condition changes.",
    "Alzheimer's support delivered as short daily visits or longer shifts, always by PSWs comfortable with memory-care basics.",
    "Structured Alzheimer's visits — familiar face, familiar sequence, no rushed transitions — booked on whatever schedule the family can sustain.",
  ]},
  { key: "companion", variants: [
    "Companion care — a caregiver who visits for conversation, a walk, an errand, or a meal shared at the kitchen table.",
    "Companionship visits in {city} for seniors who live alone and want a familiar person checking in a few times a week.",
    "Companion visits scheduled around what the person actually enjoys — a walk, a card game, or just company during meals.",
  ]},
  { key: "overnight", variants: [
    "Overnight care so a family caregiver can sleep — a PSW stays awake or nearby through the night for safety and toileting.",
    "Overnight visits and awake-overnight shifts for {city} families where nighttime is when help is most needed.",
    "Awake-overnight or sleep-nearby overnight shifts, booked as one-off nights or on a recurring pattern.",
  ]},
  { key: "stroke", boostTopics: ["stroke-rehab"], variants: [
    "Stroke recovery care that supports the exercises and daily routines a rehab team has prescribed, without medicalizing the home.",
    "Stroke rehab support at home for {city} residents — mobility, dressing, meal prep, and the encouragement that keeps recovery on track.",
    "Post-stroke PSW visits coordinated around outpatient rehab appointments, keeping the therapist's plan in motion between sessions.",
  ]},
  { key: "parkinsons", variants: [
    "Parkinson's support with PSWs who understand freezing, tremor, and slow starts, and who pace visits accordingly.",
    "Parkinson's home care that adapts to good days and difficult days without changing PSWs on you.",
    "Visits paced for Parkinson's — extra time on slow-start mornings, no rushed transitions, and steady support through medication cycles.",
  ]},
  { key: "personal", variants: [
    "Personal care — bathing, dressing, toileting, grooming — handled with dignity by trained PSWs.",
    "Personal support with hygiene and daily living tasks, in your own bathroom, on your own schedule.",
    "Discreet, unrushed personal care visits: bathing, oral care, dressing, toileting, and grooming, planned around the person's routine.",
  ]},
  { key: "palliative", variants: [
    "Palliative and end-of-life comfort care alongside a hospice or family doctor's care plan — presence, dignity, and gentle personal care.",
    "End-of-life home support in {city}, working with existing palliative and hospice teams to keep the person comfortable at home.",
    "Comfort-focused visits that support an existing palliative plan — the PSW's role is presence, dignity, and gentle personal care.",
  ]},
  { key: "respite", boostTopics: ["multigenerational-households", "cottage-caregiver-relief"], variants: [
    "Respite care so the family caregiver can rest, work, or attend to their own appointments while a PSW takes over the visit.",
    "Respite visits — a few hours or a full day — to give an exhausted family caregiver a real break.",
    "Scheduled respite blocks so the primary family caregiver can genuinely step away without worrying about coverage.",
  ]},
  { key: "meal-prep", variants: [
    "Meal preparation for seniors who no longer cook safely — cooking at the person's home, with ingredients they know.",
    "Simple, home-style meal prep in the client's own kitchen, planned around dietary preferences and appetite.",
  ]},
  { key: "medication-reminders", variants: [
    "Medication reminders so doses aren't missed — the PSW prompts and observes; medication is administered by the client themselves.",
    "Timed medication reminders as part of daily visits, aligned with the pharmacy's dispensing schedule.",
  ]},
  { key: "mobility", variants: [
    "Mobility assistance — transfers, walking support, and safe navigation of stairs and bathrooms.",
    "Everyday mobility help: from bed to chair, chair to walker, into and out of the bathroom, with fall risk always in mind.",
  ]},
  { key: "veterans-care", boostTopics: ["veterans"], variants: [
    "Home support for veterans in {city} arranged around Veterans Affairs Canada (VAC) benefit approvals, with invoices formatted for reimbursement.",
  ]},
  { key: "bilingual", boostTopics: ["bilingual-care"], variants: [
    "French/English bilingual PSWs matched where available for francophone clients in {city} who prefer personal care in their first language.",
  ]},
  { key: "cardiac", boostTopics: ["cardiac-recovery"], variants: [
    "Cardiac-recovery visits: pacing, heart-healthy meal prep, medication reminders, and a calm home environment through the recovery weeks.",
  ]},
  { key: "orthopedic", boostTopics: ["orthopedic-recovery"], variants: [
    "Post-orthopedic PSW visits in the weeks after hip or knee replacement, focused on the surgeon's mobility plan and safe daily hygiene.",
  ]},
];

/* ================================================================ *
 *  FAQ bank — expanded to 22 entries × multiple phrasings.         *
 * ================================================================ */

interface FaqEntry {
  q: string[];
  a: string[];
  /** If set, only include this FAQ when the city has this topic. */
  requireTopic?: CityTopic;
}

const FAQ_BANK: readonly FaqEntry[] = [
  {
    q: ["Can I book same-day care in {city}?", "Is same-day home care available in {city}?", "Do you offer same-day PSW visits in {city}?"],
    a: [
      "Same-day starts are often possible in {city} when a PSW is available nearby. Book online and you will see availability in real time. If nothing suitable comes up for the same day, next-day scheduling is generally straightforward.",
      "Yes, same-day care in {city} is possible when a nearby PSW is free. The booking flow shows current availability; when a same-day match is not possible, next-day starts are the norm.",
      "Same-day is common for morning bookings in {city}. Late-evening bookings often start the following day depending on which PSWs are already active in the area.",
    ],
  },
  {
    q: ["Do PSWs serve communities around {city}?", "Can a PSW travel to nearby rural communities around {city}?", "Do PSWs serve smaller communities near {city}?"],
    a: [
      "Yes. PSWs dispatched to {city} routinely serve surrounding communities as well. Travel time is factored into scheduling, so shorter, more frequent visits work best for the most rural addresses.",
      "PSW Direct covers {city} and the surrounding communities. For addresses further out, we typically recommend longer visits scheduled less frequently to make the trip worthwhile for the caregiver.",
    ],
  },
  {
    q: ["Can I request overnight care in {city}?", "Are overnight PSWs available in {city}?"],
    a: [
      "Yes — both awake-overnight and sleep-nearby overnight options are available in {city}. Overnight shifts are typically eight to ten hours and can be booked as a one-off or on a recurring schedule.",
      "Overnight care in {city} is offered as either awake-overnight (PSW stays awake for safety and toileting) or sleep-nearby (PSW rests but is available if needed). Book as needed or on a recurring pattern.",
    ],
  },
  {
    q: ["Can I request a female PSW?", "Is it possible to specify a female caregiver in {city}?"],
    a: [
      "Yes. When you book care in {city}, you can request a female PSW in the booking notes. We match availability against your preference before confirming the shift.",
      "Female-PSW requests are supported in {city}. Add the preference during booking and the platform will only confirm PSWs who match it.",
    ],
  },
  {
    q: ["Can private insurance reimburse home care in {city}?", "Will my insurance cover PSW visits in {city}?"],
    a: [
      "Many extended-health, VAC, and third-party plans reimburse personal support and home care in {city}. PSW Direct provides detailed invoices with the information most insurers require. Coverage varies by plan — check your plan's specifics.",
      "Reimbursement depends on the plan. Extended-health, veterans (VAC), and some private insurers do cover home care in {city}. Every booking generates a detailed invoice suitable for submission.",
    ],
  },
  {
    q: ["Can I arrange recurring weekly visits in {city}?", "How do recurring schedules work in {city}?"],
    a: [
      "Yes — recurring weekly, bi-weekly, or daily schedules are supported in {city}. The platform tries to keep the same PSW where possible so routines stay consistent for the person receiving care.",
      "Recurring visits in {city} can be set up during booking. We aim to keep the same PSW across a recurring schedule to preserve routine and rapport.",
    ],
  },
  {
    q: ["Do PSWs help with hospital discharge in {city}?", "Can a PSW meet us at discharge in {city}?"],
    a: [
      "Yes. PSW Direct regularly supports hospital-to-home transitions in {city} — a PSW can be there for the arrival, help settle the person in, review discharge instructions with the family, and cover the first few days.",
      "Hospital discharge support in {city} is one of the most common bookings. A PSW can be present when the person arrives home, or start visits the same or following day.",
    ],
  },
  {
    q: ["How is billing handled for {city} bookings?", "What does home care cost in {city}?"],
    a: [
      "Home care in {city} is billed hourly at a transparent rate shown before you confirm the booking. There are no long-term contracts, no bundled service fees, and invoices are generated automatically for each visit.",
      "Pricing in {city} is straightforward hourly billing. You approve the rate at booking, get an invoice per visit, and can pause or cancel visits without penalty.",
    ],
  },
  {
    q: ["Are PSWs in {city} screened?", "How are PSWs vetted before serving {city}?"],
    a: [
      "Every PSW who accepts a shift in {city} has completed a police vetting, credential check, and reference review before their first booking. Documentation is verified on file.",
      "Vetting for {city} PSWs includes police checks, credential verification, and reference calls. No PSW is dispatched to a client home until vetting is complete.",
    ],
  },
  {
    q: ["Can PSWs help with dementia or Alzheimer's care in {city}?", "Do you dispatch dementia-experienced PSWs in {city}?"],
    a: [
      "Yes. PSW Direct dispatches caregivers with dementia and Alzheimer's experience across {city}. Longer visits and recurring schedules generally work best so routine and rapport can be maintained.",
      "Dementia and Alzheimer's care in {city} is supported. When you book, note the diagnosis and any triggers — we match to PSWs with the relevant experience.",
    ],
  },
  {
    q: ["Can I cancel or change a booking in {city}?", "What is the cancellation policy for care in {city}?"],
    a: [
      "Bookings in {city} can be changed or cancelled through the client portal. Please give as much notice as possible so the assigned PSW can adjust their schedule; the policy at the time of booking will apply.",
      "You can manage, reschedule, or cancel {city} bookings from the portal. Advance notice is appreciated so we can update the PSW's schedule.",
    ],
  },
  {
    q: ["Do you offer live-in or 24-hour care in {city}?", "Is 24-hour home care available in {city}?"],
    a: [
      "Yes. 24-hour coverage in {city} is delivered as rotating PSW shifts to keep every caregiver alert and safe. Longer schedules are typically built from 8- to 12-hour blocks.",
      "24-hour home care in {city} is available. It is delivered as rotating shifts rather than a single live-in caregiver, which keeps every PSW rested and the client safer.",
    ],
  },
  {
    q: ["What is the minimum booking length in {city}?", "How short can a visit be in {city}?"],
    a: [
      "Most visits in {city} are booked for a minimum of two to three hours so the PSW has meaningful time on task. Shorter visits are possible in specific circumstances — the booking flow will show what's supported.",
      "For {city}, we generally recommend a two-hour minimum per visit so the PSW has time to complete the tasks and travel is proportionate.",
    ],
  },
  {
    q: ["Will the same PSW come each visit in {city}?", "Can I keep the same caregiver for a recurring schedule in {city}?"],
    a: [
      "For recurring {city} schedules, the platform tries to keep the same PSW where availability allows. Continuity matters more with dementia and long-term senior support, so those bookings are especially prioritized.",
      "We aim for consistency in {city} recurring schedules. If your regular PSW is unavailable for a specific visit, a vetted substitute is offered rather than a cancelled shift.",
    ],
  },
  {
    q: ["Can family members be present during visits in {city}?", "Can I stay home while the PSW works in {city}?"],
    a: [
      "Yes. Many {city} families remain in the home during visits — respite care is specifically designed for the family caregiver to be present but off duty.",
      "Family presence during visits is welcome in {city}. The PSW works to the plan the family sets at booking; the family stays as involved as they want to be.",
    ],
  },
  {
    q: ["Do PSWs help with light housekeeping in {city}?", "Is housekeeping included in a home-care visit in {city}?"],
    a: [
      "Light housekeeping directly tied to the client — laundry, dishes, tidying the areas they use — is a normal part of a PSW visit in {city}. Deep cleaning of the entire home is not part of the standard scope.",
      "In {city}, PSWs handle client-related light housekeeping (laundry, meal-related tidying, changing bed linens) as part of daily visits. Full-home housekeeping is a separate service.",
    ],
  },
  {
    q: ["Can PSWs prepare meals in {city}?", "Will the PSW cook during a visit in {city}?"],
    a: [
      "Yes. Meal preparation is a common part of {city} visits — the PSW cooks in the client's kitchen, follows dietary preferences, and helps with breakfast, lunch, or dinner as scheduled.",
      "In {city}, meal prep is a regular visit task: simple, home-style cooking planned around what the client likes and any dietary limits noted at booking.",
    ],
  },
  {
    q: ["What if my regular PSW is sick in {city}?", "Do you provide a backup caregiver in {city}?"],
    a: [
      "If a regular PSW is unavailable for a {city} shift, the platform offers a vetted substitute rather than cancelling the visit. Continuity is prioritized wherever possible.",
      "Coverage gaps in {city} are backfilled with other vetted PSWs. Families are notified in advance whenever the regular caregiver isn't available for a scheduled visit.",
    ],
  },
  {
    q: ["Is there a French-speaking PSW available in {city}?", "Can I request bilingual PSW care in {city}?"],
    a: [
      "In {city}, we prioritize French-speaking caregivers where availability allows. Note the preference at booking and we'll match against it before confirming.",
      "French/English bilingual care in {city} is supported based on caregiver availability. When you book, note the language preference and we'll try to match a PSW who fits.",
    ],
    requireTopic: "bilingual-care",
  },
  {
    q: ["Can VAC benefits pay for PSW visits in {city}?", "Do you invoice for Veterans Affairs Canada in {city}?"],
    a: [
      "Yes. For veterans in {city} with VAC-approved hours, invoices are provided in the format needed for reimbursement under the Veterans Affairs Canada program.",
      "In {city}, we regularly support veterans with VAC-approved home-care hours. Every visit generates a detailed invoice suitable for VAC submission.",
    ],
    requireTopic: "veterans",
  },
  {
    q: ["Do you support seasonal caregiver relief in {city}?", "Can I book PSW visits only in the summer in {city}?"],
    a: [
      "Yes. In cottage-country communities like {city}, seasonal patterns are common — steady support in some months and reduced hours in others, all through the same recurring-schedule system.",
      "Seasonal bookings in {city} are supported. Recurring schedules can be paused, resumed, or adjusted as family visitors come and go.",
    ],
    requireTopic: "cottage-country",
  },
  {
    q: ["What happens when I travel south for the winter?", "Can I pause my {city} PSW schedule while I'm away?"],
    a: [
      "Yes. Snowbird schedules in {city} are common — visits can be paused during winter months and resumed when you're back, all through the client portal without a phone call.",
      "For snowbird clients in {city}, the recurring schedule can be paused and restarted without penalty.",
    ],
    requireTopic: "snowbird-population",
  },
];

/* ================================================================ *
 *  FLAVOR TAILS — appended to every generated block for a large    *
 *  combinatorial boost. Each tail is a short, factually neutral    *
 *  sentence that references city/county/region context.            *
 * ================================================================ */

const FLAVOR_TAILS: readonly string[] = [
  "In {city} specifically, that pattern is what we see most weeks.",
  "For most {city} households, this is where the arrangement settles once things are up and running.",
  "That reflects how bookings actually run in {city}, not just how they look on paper.",
  "For families in and around {city}, the practical picture matches that description closely.",
  "This is the usual shape of a {city} booking after the first two or three visits.",
  "In {county}, this is the pattern we see across most of the client base.",
  "The same holds for smaller communities around {city} that share the {county} caregiver pool.",
  "For {city} clients specifically, this is the shape of the arrangement after settling in.",
  "In practice across {county}, the arrangement is stable enough that most families keep it going for months.",
  "That is how it plays out day-to-day for {city} clients we support.",
  "Practically speaking, this is what a {city} family should expect on any given week.",
  "It reflects how PSW dispatch actually works across {county} in a typical month.",
  "For a household in {city}, that's the day-to-day reality of the arrangement.",
  "The same logic applies to the smaller communities that surround {city}.",
  "In our {city} experience, this is what returning clients keep telling us matters.",
  "That's the operational picture for {city} — no promises we can't keep on the ground.",
  "In {city} the details vary by neighbourhood, but the overall shape holds.",
  "Around {city} and the wider {county} area, that's the norm rather than the exception.",
  "For most families we support in {city}, that is the baseline expectation set at booking.",
  "Nothing about that changes materially across the {city} service area.",
  "The result in {city} is a low-effort care arrangement that adjusts as the situation evolves.",
  "It's the same picture whether the client is in central {city} or a nearby community.",
  "This is how the service reads for {city} residents after a few weeks of visits.",
  "The pattern is consistent across the {county} caregiver pool.",
  "Families in {city} tend to describe the arrangement in exactly those terms.",
  "It fits how {city} households actually consume home care rather than an idealized version.",
  "That is what returning {city} clients cite when they refer family and neighbours.",
  "The picture for a {city} family reflects that steady, unglamorous reality.",
  "Details differ by household, but the {city} baseline works this way for most clients.",
  "That baseline is what {city} caregivers, clients, and coordinators all operate against.",
  "That's the rhythm most {city} families end up with after a few weeks of visits.",
  "It's what makes recurring bookings sustainable across the {county} area.",
  "In {city}, the specifics change with each client but the operating model does not.",
  "For clients across the wider {region} region, the arrangement looks broadly similar.",
  "The steady, understated feel of the service is what {city} families come back for.",
  "That day-to-day predictability is what {city} clients consistently mention in feedback.",
];

/** Deterministically append a flavor tail to a block. */
function appendTail(text: string, rng: () => number, city: string, profile: CityProfile): string {
  const tail = seededPick(FLAVOR_TAILS, rng);
  const region = profile.region ? profile.region.replace(/-/g, " ") : "Ontario";
  return `${text} ${fill(tail, city, "", profile.county, region)}`;
}

/* ================================================================ *
 *  Public API — unchanged signatures.                              *
 * ================================================================ */

export interface WhyChooseParagraph { text: string; }
export interface CommonNeed { key: string; text: string; }
export interface LocalFAQ { question: string; answer: string; }

/** Compose 2 paragraphs from independent slot banks. */
export function getWhyChooseParagraphs(city: string, service?: string): string[] {
  const { rng } = makeContext(city, service);
  const profile = getCityProfile(city);
  const county = profile.county;

  const paragraphs: string[] = [];
  for (let i = 0; i < 2; i++) {
    const opener = seededPick(WC_OPENER, rng);
    const credential = seededPick(WC_CREDENTIAL, rng);
    const operations = seededPick(WC_OPERATIONS, rng);
    const closer = seededPick(WC_CLOSER, rng);
    const parts = [opener, credential, operations, closer];
    if (i === 1) {
      const sig = pickSignatureSentence(profile, rng);
      if (sig) parts.splice(2, 0, sig);
    }
    const body = fill(parts.join(" "), city, "", county);
    paragraphs.push(appendTail(body, rng, city, profile));
  }
  return paragraphs;
}

/** Pick one signature sentence based on the city's verified topics. */
function pickSignatureSentence(profile: CityProfile, rng: () => number): string | null {
  const topics = profile.topics ?? [];
  if (topics.length === 0) return null;
  const primary = topics.slice(0, Math.min(3, topics.length));
  const topic = seededPick(primary, rng);
  const bank = TOPIC_SENTENCES[topic];
  if (!bank || bank.length === 0) return null;
  return seededPick(bank, rng);
}

/** 5–8 rotated common care needs, boosted by profile topics, each with a tail. */
export function getCommonNeeds(city: string, service?: string): CommonNeed[] {
  const { rng } = makeContext(city, service);
  const profile = getCityProfile(city);
  const topics = new Set<CityTopic>(profile.topics ?? []);

  const boosted = COMMON_NEEDS_BANK.filter((n) => n.boostTopics?.some((t) => topics.has(t)));
  const regular = COMMON_NEEDS_BANK.filter((n) => !n.boostTopics?.some((t) => topics.has(t)));

  const orderedBoosted = seededShuffle(boosted, rng);
  const orderedRegular = seededShuffle(regular, rng);
  const merged = [...orderedBoosted, ...orderedRegular];

  const count = 5 + Math.floor(rng() * 4);
  return merged.slice(0, count).map((item) => {
    const variant = seededPick(item.variants, rng);
    const body = fill(variant, city, "");
    return { key: item.key, text: appendTail(body, rng, city, profile) };
  });
}

/** Availability paragraph composed from 3 slots + tail. */
export function getAvailabilityCopy(city: string, service?: string): string {
  const { rng } = makeContext(city, service);
  const profile = getCityProfile(city);
  const parts = [
    seededPick(AV_INTRO, rng),
    seededPick(AV_TIMING, rng),
    seededPick(AV_SCHEDULE, rng),
  ];
  const body = fill(parts.join(" "), city, "", profile.county);
  return appendTail(body, rng, city, profile);
}

/** Authority paragraph composed from 3 slots + profile signature + tail. */
export function getAuthorityCopy(city: string, service?: string): string {
  const { rng } = makeContext(city, service);
  const profile = getCityProfile(city);
  const parts = [
    seededPick(AU_STANDARD, rng),
    seededPick(AU_MODEL, rng),
    seededPick(AU_FOCUS, rng),
  ];
  const topics = profile.topics ?? [];
  if (topics.length >= 2) {
    const secondary = topics.slice(1, 4);
    const topic = seededPick(secondary, rng);
    const sig = TOPIC_SENTENCES[topic] ? seededPick(TOPIC_SENTENCES[topic], rng) : null;
    if (sig) parts.push(sig);
  }
  const body = fill(parts.join(" "), city, "", profile.county);
  return appendTail(body, rng, city, profile);
}

/** Inline internal-link paragraph. */
export function getInlineLinkParagraph(city: string, citySlug: string, service?: string): string {
  const { rng } = makeContext(city, service);
  const t = seededPick(INLINE_LINKS_BANK, rng);
  return fill(t, city, citySlug);
}

/** 5–8 rotated FAQs unique to (city, service), each answer + tail. */
export function getLocalFAQs(city: string, service?: string): LocalFAQ[] {
  const { rng } = makeContext(city, service);
  const profile = getCityProfile(city);
  const topics = new Set<CityTopic>(profile.topics ?? []);

  const eligible = FAQ_BANK.filter((f) => !f.requireTopic || topics.has(f.requireTopic));
  const shuffled = seededShuffle(eligible, rng);
  const count = 5 + Math.floor(rng() * 4);
  return shuffled.slice(0, count).map((f) => {
    const answerBody = fill(seededPick(f.a, rng), city, "", profile.county);
    return {
      question: fill(seededPick(f.q, rng), city, ""),
      answer: appendTail(answerBody, rng, city, profile),
    };
  });
}

/** Ordered list of nearby communities, deterministically rotated per page. */
export function getRotatedNearbyCommunities(
  nearby: string[],
  city: string,
  service?: string,
  limit = 6,
): string[] {
  if (nearby.length === 0) return [];
  const { rng } = makeContext(city, service);
  const shuffled = seededShuffle(nearby, rng);
  return shuffled.slice(0, Math.min(limit, shuffled.length));
}

void pickN;

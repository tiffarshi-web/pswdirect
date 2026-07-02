/**
 * Deterministic local-content generation for SEO city + service pages.
 *
 * Every function is a pure function of (city, service). Same input → same output.
 * That means SSR/crawler renders are stable, no hydration mismatch, no per-request drift.
 *
 * Variation is achieved by hashing (city + service), then using the hash to shuffle
 * and pick from multiple wording banks. With ~10 banks × 8-12 variants per bank and
 * 15k+ pages, duplicate-paragraph rates drop dramatically.
 *
 * Rules honoured:
 *  - Never fabricate local facts (hospitals live in a separate verified map).
 *  - Never promise exact response times.
 *  - Content is informative, not promotional.
 */

/* -------------------- deterministic PRNG helpers -------------------- */

/** FNV-1a 32-bit hash of a string. */
export function seedFromKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG. Given a seed, returns a deterministic 0..1 generator. */
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

/** Deterministically shuffle a copy of an array. */
export function seededShuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick one deterministic item. */
export function seededPick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function makeContext(city: string, service?: string) {
  const key = `${city.toLowerCase()}::${(service ?? "home-care").toLowerCase()}`;
  const seed = seedFromKey(key);
  const rng = mulberry32(seed);
  return { key, seed, rng };
}

/* -------------------- content banks -------------------- */

/** Compact wording variants for the "Why families choose" theme.
 * Each entry mixes multiple required topics (trusted PSWs, transparent
 * pricing, coverage, discharge support, personalized care, etc.).
 */
const WHY_CHOOSE_BANK: readonly string[] = [
  "Families across {city} choose PSW Direct because every caregiver is screened, credentialed, and covered by liability insurance before they ever accept a shift. Transparent hourly pricing means the number you see at booking is the number on your invoice — no phone quotes, no bundled fees, no long-term contracts to lock you in.",
  "In {city}, the reasons families come back to PSW Direct are consistent: same-day or next-day availability when a hospital discharge lands unexpectedly, flexible visit lengths from a short check-in to full overnight coverage, and PSWs who focus on the person, not just the task list.",
  "PSW Direct works throughout {city} on a straightforward model — vetted personal support workers, hourly billing you can pause or change anytime, and coordinators who understand hospital-to-home transitions. That combination is why so many {city} families keep our number saved after their first booking.",
  "What sets service in {city} apart is not marketing — it is process. Every PSW completes a police vetting, credential review, and reference check before their first shift. Every booking, whether one hour of companion care or a recurring weekly schedule, is priced the same transparent way.",
  "Home care in {city} works best when it fits real life. That is why PSW Direct offers flexible scheduling — mornings, evenings, weekends, overnights — with the same trusted caregiver whenever possible, so your loved one is not meeting a new face every visit.",
  "For {city} families managing a hospital discharge or a change in a parent's condition, speed and trust matter equally. PSW Direct dispatches vetted PSWs across Ontario, coordinates safe transitions home, and keeps everything on one transparent hourly rate you approve up front.",
];

/** Common care needs — 12 recognizable services with 2 phrasing variants each.
 * Selection & order is deterministic per page.
 */
const COMMON_NEEDS_BANK: readonly { key: string; variants: string[] }[] = [
  { key: "hospital-discharge", variants: [
    "Hospital discharge support to help someone leave the ward safely, get settled at home, and stay on track with post-discharge instructions.",
    "Hospital discharge care that bridges the gap between the ward and the front door — medication reminders, mobility support, and a calm first few days at home.",
  ]},
  { key: "post-surgery", variants: [
    "Post-surgery recovery care for the first days and weeks after an operation — hygiene help, meal prep, mobility support, and someone reliably present.",
    "Post-operative home support for {city} residents recovering from orthopedic, cardiac, or day-surgery procedures, matched to the level of help required.",
  ]},
  { key: "senior", variants: [
    "Senior care for parents who need daily help without moving into a facility — hygiene, cooking, light housekeeping, and companionship on their own schedule.",
    "In-home senior care in {city} that keeps routines familiar: same PSW where possible, the same living room, the same neighbourhood.",
  ]},
  { key: "dementia", variants: [
    "Dementia care with PSWs experienced in redirection, sundowning, and structured daily routines that reduce agitation.",
    "Dementia support at home — calm, structured visits from PSWs trained to work with memory loss rather than around it.",
  ]},
  { key: "alzheimers", variants: [
    "Alzheimer's care for {city} families who need consistent, patient PSWs who can hold a routine and adapt as the condition changes.",
    "Alzheimer's support delivered as short daily visits or longer shifts, always by PSWs comfortable with memory-care basics.",
  ]},
  { key: "companion", variants: [
    "Companion care — a caregiver who visits for conversation, a walk, an errand, or a meal shared at the kitchen table.",
    "Companionship visits in {city} for seniors who live alone and want a familiar person checking in a few times a week.",
  ]},
  { key: "overnight", variants: [
    "Overnight care so a family caregiver can sleep — a PSW stays awake or nearby through the night for safety and toileting.",
    "Overnight visits and awake-overnight shifts for {city} families where nighttime is when help is most needed.",
  ]},
  { key: "stroke", variants: [
    "Stroke recovery care that supports the exercises and daily routines a rehab team has prescribed, without medicalizing the home.",
    "Stroke rehab support at home for {city} residents — mobility, dressing, meal prep, and the encouragement that keeps recovery on track.",
  ]},
  { key: "parkinsons", variants: [
    "Parkinson's support with PSWs who understand freezing, tremor, and slow starts, and who pace visits accordingly.",
    "Parkinson's home care that adapts to good days and difficult days without changing PSWs on you.",
  ]},
  { key: "personal", variants: [
    "Personal care — bathing, dressing, toileting, grooming — handled with dignity by trained PSWs.",
    "Personal support with hygiene and daily living tasks, in your own bathroom, on your own schedule.",
  ]},
  { key: "palliative", variants: [
    "Palliative and end-of-life comfort care alongside a hospice or family doctor's care plan — presence, dignity, and gentle personal care.",
    "End-of-life home support in {city}, working with existing palliative and hospice teams to keep the person comfortable at home.",
  ]},
  { key: "respite", variants: [
    "Respite care so the family caregiver can rest, work, or attend to their own appointments while a PSW takes over the visit.",
    "Respite visits — a few hours or a full day — to give an exhausted family caregiver a real break.",
  ]},
];

/** Service-availability variants. Generalized language — no time guarantees. */
const AVAILABILITY_BANK: readonly string[] = [
  "Bookings in {city} can often start same-day when a PSW is available in the area, and next-day scheduling is generally straightforward. Recurring weekly visits, overnight support, and weekend care are all supported through the same online booking flow.",
  "Availability in {city} varies by neighbourhood and time of day, but same-day starts are common when a nearby PSW is free. Next-day, recurring weekly, overnight, and weekend visits can be arranged through the standard booking flow.",
  "Depending on caregiver availability in {city}, care can sometimes begin the same day it is booked. Otherwise, next-day starts are typical. Recurring schedules, overnight shifts, and weekend coverage are all available.",
  "PSW Direct supports same-day starts in {city} when a suitable PSW is nearby, next-day scheduling as the standard fallback, and recurring, overnight, and weekend visits on request through the online flow.",
];

/** Local authority signal variants. */
const AUTHORITY_BANK: readonly string[] = [
  "PSW Direct works exclusively with personal support workers trained in Ontario and screened against Ontario standards. Every caregiver serving {city} is police-vetted, credential-verified, and covered by liability insurance before their first shift.",
  "Every PSW serving {city} through this platform has completed a police vetting, credential check, and reference review. Care is delivered in the family's home, on the family's schedule, and coordinated by a real team based in Ontario.",
  "Care in {city} is delivered by experienced, screened personal support workers operating on Ontario standards. Visits are family-directed — you set the schedule, the tasks, and the pace — and priced hourly with no hidden fees.",
  "Personal support workers dispatched to {city} through PSW Direct are all screened, credentialed, and insured. The focus is safe hospital-to-home transitions, comfortable in-home recovery, and steady day-to-day help for seniors aging at home.",
];

/** Inline internal-link sentence variants. Two service names are woven in and
 *  wrapped as `[Label](/route)` markers for the renderer to convert to <Link>. */
const INLINE_LINKS_BANK: readonly string[] = [
  "Families in {city} who book [Post-Surgery Care](/post-surgery-care-{slug}) often also arrange [Companion Care](/companion-care-{slug}) and [Personal Care](/personal-care-assistance-{slug}) during the first weeks of recovery.",
  "In many {city} households, [Dementia Care](/memory-care-{slug}) works best alongside [Overnight Care](/overnight-home-care) and regular [Personal Care](/personal-care-assistance-{slug}) visits for hygiene and meals.",
  "For {city} residents leaving hospital, [Hospital Discharge Care](/hospital-discharge-care) is commonly paired with [Post-Surgery Care](/post-surgery-care-{slug}) and short daily [Home Care](/home-care-{slug}) check-ins.",
  "A [Stroke Recovery](/stroke-recovery-care-{slug}) plan in {city} typically combines [Mobility Assistance](/mobility-assistance-{slug}), [Personal Care](/personal-care-assistance-{slug}), and periodic [Respite Care](/family-caregiver-relief-{slug}) so the primary family caregiver can rest.",
  "Many {city} clients who start with [Companion Care](/companion-care-{slug}) later add [Overnight Care](/overnight-home-care) or [24-Hour Home Care](/24-hour-home-care) as needs change.",
  "For end-of-life comfort in {city}, [Palliative Home Care](/palliative-home-care-{slug}) is often combined with [Family Caregiver Relief](/family-caregiver-relief-{slug}) and steady [Personal Care](/personal-care-assistance-{slug}) visits.",
];

/** FAQ bank. 12 entries; each with 2 phrasings. Deterministic subset picked per page. */
const FAQ_BANK: readonly { q: string[]; a: string[] }[] = [
  {
    q: ["Can I book same-day care in {city}?", "Is same-day home care available in {city}?"],
    a: [
      "Same-day starts are often possible in {city} when a PSW is available nearby. Book online and you will see availability in real time. If nothing suitable comes up for the same day, next-day scheduling is generally straightforward.",
      "Yes, same-day care in {city} is possible when a nearby PSW is free. The booking flow shows current availability; when a same-day match is not possible, next-day starts are the norm.",
    ],
  },
  {
    q: ["Can a PSW travel to nearby rural communities around {city}?", "Do PSWs serve smaller communities near {city}?"],
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
];

/* -------------------- public generators -------------------- */

export interface WhyChooseParagraph { text: string; }
export interface CommonNeed { key: string; text: string; }
export interface LocalFAQ { question: string; answer: string; }

/** Substitute `{city}` and `{slug}` tokens deterministically. */
function fill(template: string, city: string, slug: string): string {
  return template.split("{city}").join(city).split("{slug}").join(slug);
}

/** 2 varied paragraphs for the "Why families choose" block. */
export function getWhyChooseParagraphs(city: string, service?: string): string[] {
  const { rng } = makeContext(city, service);
  const shuffled = seededShuffle(WHY_CHOOSE_BANK, rng);
  return shuffled.slice(0, 2).map((t) => fill(t, city, ""));
}

/** 5-7 rotated "Common care needs" items. */
export function getCommonNeeds(city: string, service?: string): CommonNeed[] {
  const { rng } = makeContext(city, service);
  const shuffled = seededShuffle(COMMON_NEEDS_BANK, rng);
  const count = 5 + Math.floor(rng() * 3); // 5-7
  return shuffled.slice(0, count).map((item) => {
    const variant = seededPick(item.variants, rng);
    return { key: item.key, text: fill(variant, city, "") };
  });
}

/** Availability paragraph — one variant deterministically. */
export function getAvailabilityCopy(city: string, service?: string): string {
  const { rng } = makeContext(city, service);
  return fill(seededPick(AVAILABILITY_BANK, rng), city, "");
}

/** Local-authority paragraph — one variant deterministically. */
export function getAuthorityCopy(city: string, service?: string): string {
  const { rng } = makeContext(city, service);
  return fill(seededPick(AUTHORITY_BANK, rng), city, "");
}

/** Inline internal-link paragraph. Contains 2-3 [Label](/route) markers. */
export function getInlineLinkParagraph(
  city: string,
  citySlug: string,
  service?: string,
): string {
  const { rng } = makeContext(city, service);
  const t = seededPick(INLINE_LINKS_BANK, rng);
  return fill(t, city, citySlug);
}

/** 5-8 rotated FAQs unique to (city, service). */
export function getLocalFAQs(city: string, service?: string): LocalFAQ[] {
  const { rng } = makeContext(city, service);
  const shuffled = seededShuffle(FAQ_BANK, rng);
  const count = 5 + Math.floor(rng() * 4); // 5-8
  return shuffled.slice(0, count).map((f) => ({
    question: fill(seededPick(f.q, rng), city, ""),
    answer: fill(seededPick(f.a, rng), city, ""),
  }));
}

/** Ordered list of nearby communities, deterministically rotated per page.
 *  Falls back to an empty array — caller decides whether to omit the section. */
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

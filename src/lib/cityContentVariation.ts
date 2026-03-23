/**
 * Deterministic content variation engine for city SEO pages.
 * Uses a simple hash of the city name to rotate wording, service order,
 * intro phrasing, trust signals, and FAQ answers so no two city pages
 * share identical copy.
 */

import { Heart, Users, Shield, Moon, Clock, Building2, Stethoscope, type LucideIcon } from "lucide-react";

/** Simple deterministic hash → 0-based index */
const cityHash = (city: string): number => {
  let h = 0;
  for (let i = 0; i < city.length; i++) h = ((h << 5) - h + city.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const pick = <T>(arr: T[], city: string, offset = 0): T =>
  arr[(cityHash(city) + offset) % arr.length];

// ─── Intro paragraph variants ────────────────────────────────────────────

const introTemplates: ((city: string, nearby: string) => string)[] = [
  (c, n) =>
    `PSW Direct connects families in ${c}${n} with experienced personal support workers — on demand. Book flexible hourly home care with no contracts, no agency markups, and same-day availability starting at $30/hr.`,
  (c, n) =>
    `Looking for reliable home care in ${c}? PSW Direct offers on-demand private caregivers${n} for personal care, companionship, and post-hospital recovery. Flexible scheduling, transparent pricing, and verified PSWs — book in under two minutes.`,
  (c, n) =>
    `Families across ${c}${n} trust PSW Direct for affordable, contract-free home care. Whether you need a few hours of companionship or round-the-clock support, our vetted caregivers are ready when you are.`,
  (c, n) =>
    `Need a personal support worker in ${c}? PSW Direct provides same-day home care${n} without long-term commitments. From meal preparation to overnight supervision, our caregivers deliver compassionate, professional support at $30/hr.`,
  (c, n) =>
    `${c} families choose PSW Direct for fast, flexible home care${n}. Book a verified caregiver in minutes — no contracts, no hidden fees. Personal care, mobility help, medication reminders, and more.`,
];

export const getIntro = (city: string, nearbyAreas: string[]): string => {
  const nearby = nearbyAreas.length > 0 ? ` and surrounding areas like ${nearbyAreas.slice(0, 2).join(" and ")}` : "";
  return pick(introTemplates, city)(city, nearby);
};

// ─── Service cards with multiple description variants ─────────────────────

interface ServiceDef {
  icon: LucideIcon;
  title: string;
  descs: ((city: string) => string)[];
}

const allServices: ServiceDef[] = [
  {
    icon: Heart,
    title: "Personal Care",
    descs: [
      (c) => `Bathing, grooming, dressing, and hygiene assistance from trained PSWs in ${c}.`,
      (c) => `Compassionate personal care support in ${c} — including bathing, oral care, and dressing help.`,
      (c) => `Dignified hygiene and grooming assistance delivered by experienced caregivers across ${c}.`,
    ],
  },
  {
    icon: Users,
    title: "Companionship",
    descs: [
      (c) => `Friendly companionship, social engagement, and emotional support for seniors in ${c}.`,
      (c) => `Reduce isolation with warm, reliable companionship care in ${c}. Conversation, activities, and company.`,
      (c) => `Caring companions in ${c} who provide genuine connection, light housekeeping, and daily engagement.`,
    ],
  },
  {
    icon: Stethoscope,
    title: "Medication Reminders",
    descs: [
      (c) => `Timely medication reminders and health monitoring support from caregivers in ${c}.`,
      (c) => `Ensure medications are taken on schedule with dedicated PSW support in ${c}.`,
      (c) => `Professional medication management assistance for ${c} residents — no missed doses.`,
    ],
  },
  {
    icon: Shield,
    title: "Mobility Assistance",
    descs: [
      (c) => `Safe transfers, walking support, fall prevention, and wheelchair assistance in ${c}.`,
      (c) => `Helping ${c} residents move safely at home — transfers, repositioning, and fall-risk reduction.`,
      (c) => `Trained mobility support in ${c}: sit-to-stand, walking assistance, and safe wheelchair transfers.`,
    ],
  },
  {
    icon: Building2,
    title: "Post-Hospital Care",
    descs: [
      (c) => `Recovery support after surgery or hospital discharge in ${c}. Wound care, medication help, and rest supervision.`,
      (c) => `Smooth transitions from hospital to home in ${c} with dedicated post-surgical caregivers.`,
      (c) => `${c} families rely on PSW Direct for post-discharge care — meal prep, mobility help, and recovery monitoring.`,
    ],
  },
  {
    icon: Moon,
    title: "Overnight Home Care",
    descs: [
      (c) => `Nighttime supervision, bathroom assistance, and emergency response for ${c} residents.`,
      (c) => `Peace of mind overnight in ${c} — our PSWs handle repositioning, bathroom trips, and nighttime needs.`,
      (c) => `Dedicated overnight caregivers in ${c} providing continuous nighttime monitoring and support.`,
    ],
  },
  {
    icon: Clock,
    title: "24-Hour Home Care",
    descs: [
      (c) => `Round-the-clock personal support worker coverage in ${c}. Flexible scheduling, no long-term contracts.`,
      (c) => `Full-day, continuous care in ${c} — multiple caregivers ensuring seamless 24-hour coverage.`,
      (c) => `Need constant care in ${c}? Our 24-hour home care plans provide uninterrupted support around the clock.`,
    ],
  },
  {
    icon: Heart,
    title: "Meal Preparation",
    descs: [
      (c) => `Nutritious meal planning and preparation tailored to dietary needs for clients in ${c}.`,
      (c) => `Healthy, home-cooked meals prepared by caregivers in ${c} — accommodating allergies and preferences.`,
      (c) => `Daily meal prep and light kitchen cleanup from trusted PSWs serving ${c} families.`,
    ],
  },
];

export interface ServiceCard {
  icon: LucideIcon;
  title: string;
  desc: string;
}

/** Returns 6 services in a city-unique order with varied descriptions */
export const getServices = (city: string): ServiceCard[] => {
  const h = cityHash(city);
  // Deterministic shuffle using hash
  const shuffled = [...allServices].sort((a, b) => {
    const ha = cityHash(city + a.title);
    const hb = cityHash(city + b.title);
    return ha - hb;
  });
  return shuffled.slice(0, 6).map((s, i) => ({
    icon: s.icon,
    title: s.title,
    desc: s.descs[(h + i) % s.descs.length](city),
  }));
};

// ─── "Why Choose" section variants ────────────────────────────────────────

interface WhyItem { title: string; desc: string; }

const whyVariants: ((city: string) => WhyItem[])[] = [
  (c) => [
    { title: "Book in Under 2 Minutes", desc: `Select your service, choose a time, and get matched with a verified caregiver in ${c} instantly.` },
    { title: "No Long-Term Contracts", desc: `Pay only for the hours you need. Cancel anytime with no penalties or commitments in ${c}.` },
    { title: "Verified Caregivers", desc: `Every PSW in ${c} is background-checked, certified, and vetted before they join our platform.` },
    { title: "Same-Day Availability", desc: `Need care today? Many of our ${c} caregivers offer same-day and next-day booking.` },
  ],
  (c) => [
    { title: "Transparent Pricing", desc: `Home care in ${c} starts at $30/hr — no hidden fees, no agency markups, no surprises.` },
    { title: "Fast Caregiver Matching", desc: `Our system matches you with available, qualified PSWs near ${c} within minutes.` },
    { title: "Flexible Hourly Care", desc: `Book 2 hours or 24 — flexible scheduling that fits your family's needs across ${c}.` },
    { title: "Background-Checked PSWs", desc: `Police checks, certification verification, and identity validation for every caregiver in ${c}.` },
  ],
  (c) => [
    { title: "No Agency Fees", desc: `Skip the middleman. PSW Direct connects ${c} families directly with caregivers at fair rates.` },
    { title: "Instant Online Booking", desc: `Book home care in ${c} from your phone or computer — 24/7 availability, no phone tag.` },
    { title: "Trusted by Ontario Families", desc: `Families across ${c} and the GTA rely on PSW Direct for compassionate, dependable care.` },
    { title: "Certified & Insured", desc: `All caregivers serving ${c} carry valid PSW certification and current police checks.` },
  ],
];

export const getWhyChoose = (city: string): WhyItem[] => pick(whyVariants, city)(city);

// ─── "Who This Is For" variants ───────────────────────────────────────────

const whoVariants: ((city: string) => string[])[] = [
  (c) => [
    `Seniors in ${c} who want to age safely at home`,
    `Families needing temporary or recurring care support`,
    `Patients recovering from surgery or hospital stays in ${c}`,
    `Busy professionals managing care for aging parents`,
  ],
  (c) => [
    `Elderly residents in ${c} requiring daily living assistance`,
    `${c} families seeking respite from full-time caregiving`,
    `Individuals discharged from ${c}-area hospitals needing recovery support`,
    `Adult children coordinating remote care for parents in ${c}`,
  ],
  (c) => [
    `${c} seniors who prefer in-home care over institutional facilities`,
    `Couples in ${c} where one partner needs mobility or personal care help`,
    `Post-operative patients in ${c} transitioning from hospital to home`,
    `Working families in ${c} who need flexible, reliable caregiver coverage`,
  ],
];

export const getWhoIsFor = (city: string): string[] => pick(whoVariants, city)(city);

// ─── "How It Works" step variations ───────────────────────────────────────

interface HowStep { step: string; title: string; desc: string; }

const howVariants: ((city: string) => HowStep[])[] = [
  (c) => [
    { step: "1", title: "Select Your Service", desc: `Choose from personal care, companionship, post-hospital support, or other services available in ${c}.` },
    { step: "2", title: "Pick Your Schedule", desc: `Select a date and time that works for you — same-day, next-day, or scheduled in advance.` },
    { step: "3", title: "Get Matched Instantly", desc: `We match you with a vetted, available PSW near ${c}. Confirm and you're all set.` },
  ],
  (c) => [
    { step: "1", title: "Tell Us What You Need", desc: `Describe the care required — meal prep, mobility help, overnight care, or full-day support in ${c}.` },
    { step: "2", title: "Choose Your Time", desc: `Flexible hourly booking lets you pick exactly when you need a caregiver in ${c}.` },
    { step: "3", title: "Your Caregiver Arrives", desc: `A verified personal support worker arrives at your ${c} home, ready to provide professional care.` },
  ],
  (c) => [
    { step: "1", title: "Browse Care Options", desc: `Explore home care services available in ${c} — from light companionship to 24-hour coverage.` },
    { step: "2", title: "Set Date & Duration", desc: `Book as little as two hours or as much as full-day care across ${c}. No minimums, no contracts.` },
    { step: "3", title: "Care Begins", desc: `Your matched caregiver checks in on time and provides compassionate, professional support.` },
  ],
];

export const getHowItWorks = (city: string): HowStep[] => pick(howVariants, city)(city);

// ─── CTA section variants ────────────────────────────────────────────────

interface CtaCopy { heading: string; body: string; }

const ctaVariants: ((city: string) => CtaCopy)[] = [
  (c) => ({
    heading: `Ready to Book Home Care in ${c}?`,
    body: `Get matched with a vetted personal support worker in ${c}. No contracts, no agency fees — just quality home care starting at $30/hr.`,
  }),
  (c) => ({
    heading: `Start Your Care Journey in ${c}`,
    body: `Thousands of Ontario families trust PSW Direct. Book flexible, affordable home care in ${c} today — online in under two minutes.`,
  }),
  (c) => ({
    heading: `${c} Home Care — Book Now`,
    body: `Same-day availability, verified caregivers, and transparent pricing. Experience the PSW Direct difference in ${c}.`,
  }),
];

export const getCtaCopy = (city: string): CtaCopy => pick(ctaVariants, city)(city);

// ─── FAQ variations ──────────────────────────────────────────────────────

interface FAQ { question: string; answer: string; }

const faqSets: ((city: string) => FAQ[])[] = [
  (c) => [
    { question: `How much does home care cost in ${c}?`, answer: `Home care through PSW Direct in ${c} starts at $30/hr — significantly less than traditional agencies that charge $55+. No contracts or hidden fees.` },
    { question: `What services are available in ${c}?`, answer: `We offer personal care, companionship, meal prep, medication reminders, mobility support, post-hospital care, overnight supervision, and 24-hour home care in ${c}.` },
    { question: `Can I book same-day care in ${c}?`, answer: `Yes — many of our caregivers in ${c} accept same-day and next-day bookings. Book online or call (249) 288-4787.` },
    { question: `Are your ${c} caregivers verified?`, answer: `Every PSW serving ${c} undergoes police background checks, certification verification, and identity validation before joining our platform.` },
    { question: `Do I need a contract for home care in ${c}?`, answer: `No. PSW Direct operates on a pay-as-you-go model. Book by the hour with no long-term commitments.` },
  ],
  (c) => [
    { question: `What does home care in ${c} include?`, answer: `Home care in ${c} covers personal hygiene, meal preparation, companionship, mobility assistance, medication reminders, overnight care, and post-surgery recovery support.` },
    { question: `How quickly can I get a caregiver in ${c}?`, answer: `Most ${c} bookings are matched within minutes. Same-day availability is common depending on demand.` },
    { question: `Is home care in ${c} covered by insurance?`, answer: `Some extended health plans cover PSW services. PSW Direct provides detailed receipts for all ${c} bookings to submit to your insurer.` },
    { question: `How do I book a PSW in ${c}?`, answer: `Visit pswdirect.ca, select your service and schedule, and get instantly matched with a verified caregiver near ${c}.` },
    { question: `What areas near ${c} do you serve?`, answer: `PSW Direct serves ${c} and surrounding communities across Ontario. Check our coverage map for full availability.` },
  ],
  (c) => [
    { question: `Why is PSW Direct cheaper than agencies in ${c}?`, answer: `We connect ${c} families directly with caregivers — no agency overhead, no middleman markup. Quality care from $30/hr.` },
    { question: `Can I book overnight care in ${c}?`, answer: `Absolutely. Overnight and 24-hour home care are available in ${c}. Our PSWs provide nighttime supervision, bathroom assistance, and emergency response.` },
    { question: `What qualifications do your ${c} PSWs have?`, answer: `All caregivers hold valid PSW certification, current police checks, and are verified through our multi-step vetting process.` },
    { question: `Is there a minimum booking in ${c}?`, answer: `We recommend a minimum of 2 hours per visit to ensure quality care, but there are no long-term minimums or contracts.` },
    { question: `How do I pay for home care in ${c}?`, answer: `Secure online payment at booking. No cash needed. You'll receive a detailed receipt for every ${c} booking.` },
  ],
];

export const getFaqs = (city: string): FAQ[] => pick(faqSets, city)(city);

// ─── Meta description variants ───────────────────────────────────────────

const metaDescVariants: ((city: string) => string)[] = [
  (c) => `Affordable private home care in ${c}. Book verified personal support workers for companionship, personal care, and post-hospital recovery. From $30/hr, no contracts.`,
  (c) => `Trusted home care services in ${c}, Ontario. On-demand PSWs for seniors, families, and post-surgery patients. Same-day booking, flexible hours.`,
  (c) => `Book home care in ${c} in under 2 minutes. Verified caregivers, transparent pricing, no agency fees. Personal care, companionship, and 24-hour support.`,
];

export const getMetaDescription = (city: string): string => pick(metaDescVariants, city)(city);

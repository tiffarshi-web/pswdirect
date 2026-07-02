import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

// Additive family-intent / near-me SEO pages. Each is a distinct single URL.
// Slugs are unique — verified against existing routes.

export const FAMILY_INTENT_CONFIGS: Record<string, HighConvertPageConfig> = {
  "private-caregiver-near-me": {
    slug: "private-caregiver-near-me",
    title: "Private Caregiver Near Me | Hire a Private PSW in Ontario | PSW Direct",
    description: "Find a private caregiver near you in Ontario. Hire a vetted PSW directly with no agency markup — from $35/hr, same-day availability, no contracts.",
    headline: "Find a Private Caregiver Near You",
    subheadline: "Skip the agency middleman. Hire a vetted personal support worker directly, from $35/hr. Same-day availability across Ontario.",
    breadcrumbTrail: [
      { name: "Home Care Ontario", url: "/home-care-ontario" },
      { name: "Private Caregiver Near Me", url: "/private-caregiver-near-me" },
    ],
    faqs: [
      { question: "What is a private caregiver?", answer: "A private caregiver is hired directly by the family rather than through a traditional agency. You pay less, the caregiver earns more, and you get better consistency of care." },
      { question: "How do I find a private caregiver near me?", answer: "PSW Direct matches you with a vetted private caregiver in your area within hours. Enter your address, choose a schedule, and book online in under 2 minutes." },
      { question: "How much does a private caregiver cost in Ontario?", answer: "Private caregivers on PSW Direct start at $35/hr — well below the $55+/hr typical of agencies. No hidden fees, no minimums." },
      { question: "Are private caregivers safe?", answer: "Yes — every PSW on PSW Direct is credential-verified with police background checks and government ID. Shifts are GPS-tracked for extra safety." },
    ],
  },
  "help-for-aging-parents": {
    slug: "help-for-aging-parents",
    title: "Help for Aging Parents | In-Home Care in Ontario | PSW Direct",
    description: "Practical help for aging parents at home. Vetted PSWs assist with personal care, meals, companionship and safety. Same-day availability, no contracts.",
    headline: "Real Help for Aging Parents — Delivered at Home",
    subheadline: "Vetted personal support workers help mom or dad stay independent, safe and connected. Book by the hour with no contracts.",
    breadcrumbTrail: [
      { name: "Home Care Ontario", url: "/home-care-ontario" },
      { name: "Help for Aging Parents", url: "/help-for-aging-parents" },
    ],
    faqs: [
      { question: "How do I get help for aging parents?", answer: "Book a vetted PSW online through PSW Direct. Start with a couple of hours a week — many families expand from there." },
      { question: "What kind of help can a PSW provide?", answer: "Personal care, companionship, meal preparation, medication reminders, mobility support, errands and escort to appointments." },
      { question: "How do I know when it's time to get help?", answer: "Common signs include difficulty with hygiene, weight loss, unexplained bruises, missed medications, and increasing social isolation." },
      { question: "How much does help for aging parents cost?", answer: "Starting at $35/hr with no minimums through PSW Direct — a fraction of what a retirement home costs." },
    ],
  },
  "care-for-elderly-parents": {
    slug: "care-for-elderly-parents",
    title: "Care for Elderly Parents | Vetted PSWs in Ontario | PSW Direct",
    description: "Compassionate care for elderly parents at home. Personal support workers help with daily routines, safety and companionship. From $35/hr, same-day.",
    headline: "Trusted Care for Your Elderly Parents",
    subheadline: "Give mom or dad the daily support they deserve — safely at home, with vetted caregivers who feel like family.",
    breadcrumbTrail: [
      { name: "Home Care Ontario", url: "/home-care-ontario" },
      { name: "Care for Elderly Parents", url: "/care-for-elderly-parents" },
    ],
    faqs: [
      { question: "What's the best way to arrange care for elderly parents?", answer: "Start with a few hours a week through a service like PSW Direct. That builds trust with your parent and lets you scale up as needs change." },
      { question: "Can I stay involved as the family caregiver?", answer: "Absolutely. PSWs complement family caregiving — they don't replace it. You stay in charge of decisions." },
      { question: "How do I choose a PSW my parent will accept?", answer: "Share preferences (language, gender, personality) at booking. The first visit is a soft trial — if it isn't a fit, we match a different PSW." },
      { question: "Is home care better than a retirement home?", answer: "For many seniors, yes — home is familiar, safer with one-on-one attention, and often less expensive than private retirement homes." },
    ],
  },
  "help-for-mom-at-home": {
    slug: "help-for-mom-at-home",
    title: "Help for Mom at Home | Home Care & PSW Support in Ontario | PSW Direct",
    description: "Get help for mom at home from vetted PSWs. Personal care, meals, companionship and safety support. Same-day availability from $35/hr.",
    headline: "Help for Mom, in the Home She Loves",
    subheadline: "Bathing, meals, companionship and safety supervision — from a vetted PSW you can trust. Book online in minutes.",
    breadcrumbTrail: [
      { name: "Home Care Ontario", url: "/home-care-ontario" },
      { name: "Help for Mom at Home", url: "/help-for-mom-at-home" },
    ],
    faqs: [
      { question: "What kind of help can I get for mom at home?", answer: "Personal care, companionship, meal preparation, medication reminders, transportation to appointments, and light housekeeping." },
      { question: "Can I request a female PSW for mom?", answer: "Yes — many families prefer a female caregiver for bathing and personal care. Note the preference at booking." },
      { question: "How many hours does mom need?", answer: "Every family is different. Many start with 2-4 hours daily or a few longer visits per week and adjust from there." },
      { question: "Can I be there for the first visit?", answer: "Yes — most families are. It's the best way to introduce mom to her PSW and share her routine." },
    ],
  },
  "help-for-dad-at-home": {
    slug: "help-for-dad-at-home",
    title: "Help for Dad at Home | Home Care & PSW Support in Ontario | PSW Direct",
    description: "Get help for dad at home from vetted PSWs. Personal care, meals, mobility support and companionship. Same-day availability from $35/hr.",
    headline: "Help for Dad, on His Own Terms",
    subheadline: "Practical support that respects independence — bathing, meals, mobility and companionship from a vetted PSW.",
    breadcrumbTrail: [
      { name: "Home Care Ontario", url: "/home-care-ontario" },
      { name: "Help for Dad at Home", url: "/help-for-dad-at-home" },
    ],
    faqs: [
      { question: "Dad refuses help — what should I do?", answer: "Start with something practical he'd accept — light housekeeping, transportation, or a companion who shares his hobbies. Personal care often follows once trust builds." },
      { question: "Can I request a male PSW for dad?", answer: "Yes — note the preference at booking and we'll match a male caregiver." },
      { question: "How is care documented?", answer: "Every shift ends with a care sheet you can view — meals, hygiene, medications and observations." },
      { question: "Can dad reject a PSW and try someone else?", answer: "Yes — if the first match isn't right, we match a different PSW at no cost." },
    ],
  },
  "care-for-seniors-living-alone": {
    slug: "care-for-seniors-living-alone",
    title: "Care for Seniors Living Alone | In-Home PSW Support | PSW Direct",
    description: "Support for seniors living alone in Ontario. Wellness checks, companionship, meals and safety supervision from vetted PSWs. From $35/hr.",
    headline: "Care for Seniors Living Alone",
    subheadline: "Regular check-ins, companionship and practical help so your loved one stays safe, connected and independent at home.",
    breadcrumbTrail: [
      { name: "Home Care Ontario", url: "/home-care-ontario" },
      { name: "Care for Seniors Living Alone", url: "/care-for-seniors-living-alone" },
    ],
    faqs: [
      { question: "How often should a senior living alone be checked on?", answer: "A minimum of daily contact is recommended. Regular in-person visits — even brief — dramatically improve safety and mood." },
      { question: "What does a PSW check-in visit include?", answer: "A safety and wellness check, a shared meal or snack, medication reminders, brief companionship, and a report to family." },
      { question: "Are wellness checks expensive?", answer: "No — even a one-hour daily visit is far less than a retirement home. Rates start at $35/hr with no minimums." },
      { question: "Can PSWs respond to emergencies?", answer: "Yes — if a PSW arrives and something is wrong, they call 911 immediately and stay until help arrives." },
    ],
  },
  "someone-to-check-on-my-mom": {
    slug: "someone-to-check-on-my-mom",
    title: "Someone to Check on My Mom | Wellness Visits in Ontario | PSW Direct",
    description: "Need someone to check on mom? Vetted PSWs provide wellness visits, companionship and safety checks across Ontario. Book online from $35/hr.",
    headline: "Someone Reliable to Check on Mom",
    subheadline: "Regular wellness visits from a vetted PSW — for peace of mind when you can't be there yourself.",
    breadcrumbTrail: [
      { name: "Home Care Ontario", url: "/home-care-ontario" },
      { name: "Someone to Check on My Mom", url: "/someone-to-check-on-my-mom" },
    ],
    faqs: [
      { question: "What happens during a wellness visit?", answer: "The PSW confirms mom is safe, shares a meal or snack, gives medication reminders, tidies up, and reports back to the family." },
      { question: "How often can I book wellness visits?", answer: "As often as you like — daily, several times a week, or just weekends. There are no minimums." },
      { question: "Can the PSW send me updates after every visit?", answer: "Yes — a care sheet with observations is available after every shift." },
      { question: "What if the PSW finds something wrong?", answer: "They contact the family immediately and, if needed, call 911. They stay with mom until help or family arrives." },
    ],
  },
  "someone-to-check-on-my-dad": {
    slug: "someone-to-check-on-my-dad",
    title: "Someone to Check on My Dad | Wellness Visits in Ontario | PSW Direct",
    description: "Need someone to check on dad? Vetted PSWs provide wellness visits, companionship and safety checks across Ontario. Book online from $35/hr.",
    headline: "Someone Reliable to Check on Dad",
    subheadline: "Regular wellness visits from a vetted PSW — practical support that respects his independence.",
    breadcrumbTrail: [
      { name: "Home Care Ontario", url: "/home-care-ontario" },
      { name: "Someone to Check on My Dad", url: "/someone-to-check-on-my-dad" },
    ],
    faqs: [
      { question: "What if dad won't accept a PSW?", answer: "Start with something practical — a driver for appointments, or someone to fix a meal. Wellness visits often grow from there once trust builds." },
      { question: "Can I request a male PSW for dad?", answer: "Yes — note the preference at booking and we'll match accordingly." },
      { question: "How long is a wellness visit?", answer: "As short as one hour or as long as you like. Many families book a one- to two-hour visit that includes a meal." },
      { question: "Can visits be increased later?", answer: "Absolutely — many families start with weekly wellness checks and expand as needs change." },
    ],
  },
};

export const FAMILY_INTENT_SLUGS = Object.keys(FAMILY_INTENT_CONFIGS);

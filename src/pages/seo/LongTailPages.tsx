import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const longTailPages: Record<string, HighConvertPageConfig> = {
  "help-for-my-elderly-mother-at-home": {
    slug: "help-for-my-elderly-mother-at-home",
    title: "Help for My Elderly Mother at Home | In-Home Care | PSW Direct",
    description: "Need help caring for your elderly mother at home? PSW Direct provides vetted personal support workers for bathing, meals, companionship, and daily care from $35/hr.",
    headline: "Help for Your Elderly Mother — Right at Home",
    subheadline: "Your mother deserves compassionate, professional care in the comfort of her own home. PSW Direct connects you with vetted caregivers who provide personal care, companionship, and daily support — so she can age with dignity.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Help for Elderly Mother", url: "/help-for-my-elderly-mother-at-home" }],
    faqs: [
      { question: "How can I get help for my elderly mother at home?", answer: "Book a personal support worker through PSW Direct. Our vetted PSWs visit your mother's home to assist with bathing, meals, medication reminders, companionship, and mobility." },
      { question: "How much does it cost to care for my mother at home?", answer: "Care starts at $35/hr with PSW Direct — 40-50% less than traditional agency rates. No contracts, no hidden fees." },
      { question: "Can my mother stay in her own home with a caregiver?", answer: "Yes. Many seniors prefer aging at home with professional support. PSW Direct provides as little or as much care as needed — from a few hours weekly to daily visits." },
    ],
  },
  "help-for-my-elderly-father-at-home": {
    slug: "help-for-my-elderly-father-at-home",
    title: "Help for My Elderly Father at Home | In-Home Care | PSW Direct",
    description: "Need help caring for your elderly father at home? PSW Direct provides vetted personal support workers for personal care, mobility help, and companionship from $35/hr.",
    headline: "Help for Your Elderly Father — Care at Home",
    subheadline: "Your father's independence matters. PSW Direct provides vetted caregivers who help with daily tasks, personal care, and companionship — so he can continue living comfortably at home.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Help for Elderly Father", url: "/help-for-my-elderly-father-at-home" }],
    faqs: [
      { question: "What kind of help can my elderly father get at home?", answer: "PSWs assist with bathing, dressing, grooming, meal preparation, medication reminders, mobility support, companionship, and transportation to appointments." },
      { question: "Can I request a male caregiver for my father?", answer: "Yes. PSW Direct allows you to specify a gender preference during booking to ensure your father's comfort." },
      { question: "How quickly can care start?", answer: "PSW Direct offers same-day availability. Book online and a vetted PSW can begin helping your father within hours." },
    ],
  },
  "someone-to-care-for-elderly-parent": {
    slug: "someone-to-care-for-elderly-parent",
    title: "Someone to Care for Elderly Parent | Home Caregiver | PSW Direct",
    description: "Looking for someone to care for your elderly parent? PSW Direct provides vetted in-home caregivers for personal care, meals, and companionship across Ontario from $35/hr.",
    headline: "Find Someone to Care for Your Elderly Parent",
    subheadline: "When you can't be there every day, PSW Direct is. We connect you with vetted, compassionate caregivers who treat your parent like family — providing personal care, companionship, and daily support at home.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Care for Elderly Parent", url: "/someone-to-care-for-elderly-parent" }],
    faqs: [
      { question: "How do I find someone reliable to care for my parent?", answer: "PSW Direct vets every caregiver with credential verification, government ID checks, and police background screening. You can trust that your parent is in safe hands." },
      { question: "Can the caregiver come every day?", answer: "Yes. PSW Direct offers fully flexible scheduling — from a few hours per week to daily or even 24-hour care. Adjust anytime." },
      { question: "What if my parent lives far from me?", answer: "PSW Direct serves 80+ Ontario communities. Book care remotely — our app lets you track visits and stay informed from anywhere." },
    ],
  },
  "home-care-after-surgery-at-home": {
    slug: "home-care-after-surgery-at-home",
    title: "Home Care After Surgery | Post-Surgery Recovery Care | PSW Direct",
    description: "Need home care after surgery? PSW Direct provides vetted personal support workers for post-surgery recovery at home — mobility help, meals, and daily care from $35/hr.",
    headline: "Home Care After Surgery — Recover at Home",
    subheadline: "Recovering from surgery at home is faster and more comfortable with professional support. PSW Direct provides vetted PSWs who assist with mobility, personal hygiene, meals, and daily tasks during your recovery.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "After Surgery Care", url: "/home-care-after-surgery-at-home" }],
    faqs: [
      { question: "What care is available after surgery at home?", answer: "PSWs help with mobility, personal hygiene, wound care support, meal preparation, medication reminders, light housekeeping, and transportation to follow-up appointments." },
      { question: "How soon can I book post-surgery care?", answer: "Book before your surgery so a PSW is ready when you come home. Same-day booking is also available for unexpected needs." },
      { question: "How long will I need post-surgery care?", answer: "Recovery varies. PSW Direct is contract-free — book a few days or several weeks of support and adjust as you heal." },
    ],
  },
  "caregiver-for-dementia-at-home": {
    slug: "caregiver-for-dementia-at-home",
    title: "Caregiver for Dementia at Home | Dementia Care Ontario | PSW Direct",
    description: "Find a dementia caregiver for home care in Ontario. PSW Direct provides experienced, vetted personal support workers for dementia and Alzheimer's care from $35/hr.",
    headline: "In-Home Dementia Care with a Trusted Caregiver",
    subheadline: "Dementia care requires patience, training, and compassion. PSW Direct connects you with experienced caregivers who provide safe, dignified care for your loved one at home — including supervision, routine maintenance, and personal support.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Dementia Care", url: "/caregiver-for-dementia-at-home" }],
    faqs: [
      { question: "Do your caregivers have dementia experience?", answer: "Many PSWs on our platform have experience with dementia and Alzheimer's care. You can specify dementia experience as a preference during booking." },
      { question: "What does a dementia caregiver do at home?", answer: "A dementia caregiver provides supervision, routine maintenance, personal care, meal preparation, medication reminders, companionship, and safety monitoring." },
      { question: "Can I book regular daily dementia care?", answer: "Yes. PSW Direct offers flexible scheduling — book daily visits, half-day care, or full-day supervision as needed." },
    ],
  },
  "help-with-daily-care-for-seniors": {
    slug: "help-with-daily-care-for-seniors",
    title: "Daily Care Help for Seniors | Senior Home Care | PSW Direct",
    description: "Need daily care help for a senior loved one? PSW Direct provides vetted personal support workers for daily bathing, meals, companionship, and mobility from $35/hr.",
    headline: "Daily Care Help for Seniors in Ontario",
    subheadline: "From morning routines to evening check-ins, PSW Direct provides reliable daily care for seniors. Our vetted personal support workers handle bathing, meals, medication reminders, and companionship — every day.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Daily Senior Care", url: "/help-with-daily-care-for-seniors" }],
    faqs: [
      { question: "What daily care services do you provide for seniors?", answer: "Daily care includes morning and evening routines, bathing, dressing, meal preparation, medication reminders, companionship, mobility support, and light housekeeping." },
      { question: "Can I schedule daily visits at the same time?", answer: "Yes. Our system allows recurring bookings so care happens consistently at the time that works best for your senior loved one." },
      { question: "How much does daily senior care cost?", answer: "Daily care starts at $35/hr with PSW Direct. A typical 3-hour daily visit costs $90/day — significantly less than agency rates." },
    ],
  },
  "someone-to-check-on-elderly-parent": {
    slug: "someone-to-check-on-elderly-parent",
    title: "Someone to Check on Elderly Parent | Wellness Checks | PSW Direct",
    description: "Need someone to check on your elderly parent? PSW Direct provides vetted caregivers for wellness checks, companionship, and safety monitoring in Ontario from $35/hr.",
    headline: "Someone to Check on Your Elderly Parent",
    subheadline: "Peace of mind starts with knowing your parent is safe. PSW Direct sends vetted caregivers for regular check-ins — ensuring medication is taken, meals are eaten, and your parent is comfortable and cared for.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Elderly Check-ins", url: "/someone-to-check-on-elderly-parent" }],
    faqs: [
      { question: "What does a wellness check visit include?", answer: "A caregiver visits your parent's home to check their wellbeing, assist with meals, medication reminders, light housekeeping, and provide companionship and conversation." },
      { question: "How often can I schedule check-in visits?", answer: "As often as needed — daily, every other day, or weekly. PSW Direct is fully flexible with no minimum commitment required." },
      { question: "Can the caregiver update me after each visit?", answer: "Yes. Our PSWs complete care sheets after each visit and you can track visit status through the PSW Direct platform." },
    ],
  },
  "affordable-home-care-services": {
    slug: "affordable-home-care-services",
    title: "Affordable Home Care Services Ontario | From $35/hr | PSW Direct",
    description: "Affordable home care services in Ontario from $35/hr. PSW Direct eliminates agency markup — vetted caregivers, no contracts, no hidden fees. Book same-day.",
    headline: "Affordable Home Care Services in Ontario",
    subheadline: "Quality home care shouldn't break the bank. PSW Direct connects you directly with vetted personal support workers from $35/hr — eliminating the agency middleman and saving families 40-50% on care costs.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Affordable Home Care", url: "/affordable-home-care-services" }],
    faqs: [
      { question: "Why is PSW Direct more affordable than agencies?", answer: "PSW Direct connects families directly with PSWs, eliminating agency overhead and middleman markups. Our PSWs earn more while families pay less — everyone wins." },
      { question: "Are there any hidden fees?", answer: "None. PSW Direct charges a flat hourly rate — $45/hr for personal care, $45/hr for doctor escorts. No signup fees, no cancellation penalties, no contracts." },
      { question: "Is affordable care lower quality?", answer: "Absolutely not. Every PSW on our platform is credential-verified, police-checked, and reviewed. You get the same quality of care — just without the agency markup." },
    ],
  },
  "help-for-elderly-near-me": {
    slug: "help-for-elderly-near-me",
    title: "Help for Elderly Near Me | Senior Care Services | PSW Direct",
    description: "Find help for elderly loved ones near you in Ontario. PSW Direct provides vetted caregivers for personal care, companionship, and daily support from $35/hr. Book same-day.",
    headline: "Help for Elderly Loved Ones Near You",
    subheadline: "Find trusted, professional help for your elderly family member near you in Ontario. PSW Direct provides vetted caregivers for personal care, companionship, and daily living support — available same-day.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Elderly Help Near Me", url: "/help-for-elderly-near-me" }],
    faqs: [
      { question: "How do I find help for elderly near me?", answer: "Book online at PSW Direct and enter your address. We'll match you with the closest available vetted caregiver, often within hours." },
      { question: "What services are available for elderly near me?", answer: "Services include personal care, companionship, meal preparation, medication reminders, mobility assistance, doctor escorts, and hospital discharge support." },
      { question: "Is help for elderly available same-day?", answer: "Yes. PSW Direct offers same-day availability across Ontario. Many requests are filled within hours of booking." },
    ],
  },
  "urgent-home-care-near-me": {
    slug: "urgent-home-care-near-me",
    title: "Urgent Home Care Near Me | Same-Day Care | PSW Direct",
    description: "Need urgent home care near you? PSW Direct provides same-day vetted personal support workers for emergency and urgent care needs across Ontario from $35/hr.",
    headline: "Urgent Home Care Near You — Same-Day Availability",
    subheadline: "When care can't wait, PSW Direct responds immediately. Our vetted personal support workers are available same-day across Ontario for urgent home care — no contracts, no wait lists, no delays.",
    breadcrumbTrail: [{ name: "Home Care Near Me", url: "/home-care-near-me" }, { name: "Urgent Home Care", url: "/urgent-home-care-near-me" }],
    faqs: [
      { question: "How fast can I get urgent home care near me?", answer: "PSW Direct offers same-day availability. Many urgent requests are filled within hours. Book online and a vetted PSW will be matched to your area immediately." },
      { question: "Is urgent home care more expensive?", answer: "No. Standard rates apply — from $35/hr for personal care. No surge pricing, no emergency fees." },
      { question: "What situations count as urgent?", answer: "Urgent care includes sudden illness, unexpected hospital discharge, caregiver burnout, fall recovery, family emergencies, and any situation requiring immediate professional support." },
    ],
  },
};

export const longTailPageSlugs = Object.keys(longTailPages);

const LongTailSEOPage = ({ slug }: { slug: string }) => {
  const config = longTailPages[slug];
  if (!config) return null;
  return <HighConvertLandingPage config={config} />;
};

export default LongTailSEOPage;
export { longTailPages };

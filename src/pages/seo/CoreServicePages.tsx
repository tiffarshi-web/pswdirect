import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const configs: Record<string, HighConvertPageConfig> = {
  "home-care": {
    slug: "home-care",
    title: "Home Care Services Ontario | Book In-Home Care Online | PSW Direct",
    description: "Professional home care services across Ontario. Vetted personal support workers for bathing, companionship, mobility support, and more. From $30/hr, no contracts.",
    headline: "Home Care Services in Ontario",
    subheadline: "Book a vetted personal support worker for in-home care — personal care, companionship, mobility support, and daily living assistance. Available same-day, no contracts.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }],
    faqs: [
      { question: "What home care services do you offer?", answer: "PSW Direct provides personal care (bathing, dressing, grooming), companionship, meal preparation, medication reminders, mobility assistance, doctor escorts, and hospital discharge support." },
      { question: "How quickly can I get home care?", answer: "Many requests are filled the same day. Book online in under 2 minutes and a vetted PSW can begin care within hours." },
      { question: "How much does home care cost?", answer: "Home care starts at $30/hr for personal care and companionship. Doctor escort starts at $35/hr. No agency fees, no contracts, no hidden charges." },
    ],
  },
  "personal-support-worker": {
    slug: "personal-support-worker",
    title: "Personal Support Worker Services | Hire a PSW Online | PSW Direct",
    description: "Hire a personal support worker in Ontario. Fully vetted PSWs for elderly care, post-surgery support, and daily living assistance. Book online from $30/hr.",
    headline: "Hire a Personal Support Worker in Ontario",
    subheadline: "PSW Direct connects you with credential-verified, police-checked personal support workers across Ontario. On-demand booking, no contracts, care from $30/hr.",
    breadcrumbTrail: [{ name: "Personal Support Worker", url: "/personal-support-worker" }],
    faqs: [
      { question: "What does a personal support worker do?", answer: "A PSW assists with activities of daily living including bathing, dressing, grooming, meal preparation, medication reminders, mobility support, companionship, and doctor escorts." },
      { question: "Are your PSWs certified?", answer: "Yes. Every PSW on our platform holds a valid PSW certificate, government-issued ID, and a recent police background check. We verify all credentials before activation." },
      { question: "Can I hire a PSW for just a few hours?", answer: "Absolutely. PSW Direct offers flexible hourly booking with no minimum commitment. Book as little or as much care as you need." },
    ],
  },
  "caregiver-services": {
    slug: "caregiver-services",
    title: "Caregiver Services Ontario | In-Home Caregiver | PSW Direct",
    description: "Professional caregiver services in Ontario. Trusted in-home caregivers for seniors, post-surgery recovery, and daily living support. Book online from $30/hr.",
    headline: "Professional Caregiver Services in Ontario",
    subheadline: "Find a trusted caregiver for your loved one. PSW Direct provides vetted caregivers for personal care, companionship, mobility support, and more — available same-day.",
    breadcrumbTrail: [{ name: "Caregiver Services", url: "/caregiver-services" }],
    faqs: [
      { question: "What caregiver services are available?", answer: "Our caregivers provide personal care, companionship, meal preparation, light housekeeping, medication reminders, mobility assistance, and transportation to medical appointments." },
      { question: "How do I find a caregiver near me?", answer: "Enter your address when booking on PSW Direct. We'll match you with the closest available vetted caregiver in your area, often within hours." },
      { question: "Do I need a long-term contract?", answer: "No. PSW Direct is 100% contract-free. Book care by the hour, when you need it. Cancel or adjust anytime with no penalties." },
    ],
  },
  "in-home-care": {
    slug: "in-home-care",
    title: "In-Home Care Services Ontario | Book Care at Home | PSW Direct",
    description: "In-home care services across Ontario. Personal support workers come to your home for bathing, companionship, mobility support, and senior care. From $30/hr.",
    headline: "In-Home Care Services Across Ontario",
    subheadline: "Receive professional care in the comfort of your own home. PSW Direct sends vetted personal support workers to assist with daily living, personal care, and companionship.",
    breadcrumbTrail: [{ name: "In-Home Care", url: "/in-home-care" }],
    faqs: [
      { question: "What is in-home care?", answer: "In-home care is professional support provided in your own home. A personal support worker assists with bathing, dressing, meals, medication reminders, companionship, and mobility." },
      { question: "Is in-home care better than a nursing home?", answer: "Many families prefer in-home care because it allows loved ones to stay in familiar surroundings while receiving personalized one-on-one attention from a dedicated caregiver." },
      { question: "How do I start in-home care?", answer: "Visit PSW Direct, select your service, choose a date and time, and book online. A vetted PSW will be matched to your location, often the same day." },
    ],
  },
};

export const HomeCareCorePage = () => <HighConvertLandingPage config={configs["home-care"]} />;
export const PersonalSupportWorkerPage = () => <HighConvertLandingPage config={configs["personal-support-worker"]} />;
export const CaregiverServicesPage = () => <HighConvertLandingPage config={configs["caregiver-services"]} />;
export const InHomeCarePageGeneric = () => <HighConvertLandingPage config={configs["in-home-care"]} />;

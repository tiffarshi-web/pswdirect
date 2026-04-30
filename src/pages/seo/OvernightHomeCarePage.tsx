import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "overnight-home-care",
  title: "Overnight Home Care in Ontario | Awake Overnight PSW | PSW Direct",
  description: "Overnight home care across Ontario. Awake or sleep-shift PSWs for seniors, dementia, and post-hospital recovery. From $30/hr — book a vetted overnight caregiver in minutes.",
  headline: "Overnight Home Care Across Ontario",
  subheadline: "Awake overnight personal support workers for fall prevention, dementia wandering, toileting, and peace of mind. Book a vetted overnight PSW in under 2 minutes.",
  breadcrumbTrail: [
    { name: "Home Care Services", url: "/home-care-services" },
    { name: "Overnight Home Care", url: "/overnight-home-care" },
  ],
  faqs: [
    { question: "What is overnight home care?", answer: "Overnight home care is in-home support delivered through the night by a personal support worker — usually 8–12 hour shifts. PSWs assist with toileting, repositioning, fall prevention, dementia supervision, and emergency response while families sleep." },
    { question: "How much does overnight home care cost in Ontario?", answer: "Overnight home care starts at $30/hr through PSW Direct. A typical 10-hour overnight shift is significantly less than agency rates, with no contracts or minimum nights." },
    { question: "Awake overnight vs sleep overnight — which do I need?", answer: "Choose awake overnight care if your loved one needs frequent toileting, has dementia and wanders, or is at high fall risk. Sleep overnight (with PSW available if needed) suits lower-acuity situations." },
    { question: "Can I get overnight home care same-day?", answer: "Yes. PSW Direct can typically match an overnight PSW the same day across the GTA and most Ontario cities." },
    { question: "Do you offer recurring overnight home care?", answer: "Yes. You can book the same PSW for recurring overnight shifts — nightly, weekly, or as a regular schedule — to keep continuity of care." },
  ],
};

const OvernightHomeCarePage = () => <HighConvertLandingPage config={config} />;
export default OvernightHomeCarePage;

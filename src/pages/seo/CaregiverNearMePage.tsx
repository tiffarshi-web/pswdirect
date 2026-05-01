import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "caregiver-near-me",
  title: "Caregiver Near Me | Find a Home Caregiver in Ontario | PSW Direct",
  description: "Find a trusted caregiver near you in Ontario. PSW Direct connects families with vetted home caregivers for personal care, companionship, and senior support from $35/hr.",
  headline: "Find a Caregiver Near You in Ontario",
  subheadline: "Vetted home caregivers available same-day. No contracts, no agency markup. Book online in under 2 minutes.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Caregiver Near Me", url: "/caregiver-near-me" },
  ],
  faqs: [
    { question: "How do I find a caregiver near me?", answer: "PSW Direct matches you with vetted caregivers in your area. Enter your address when booking and we'll connect you with the closest available personal support worker." },
    { question: "What does a home caregiver do?", answer: "Home caregivers assist with personal care (bathing, dressing, grooming), companionship, meal preparation, medication reminders, mobility assistance, and doctor escorts." },
    { question: "How much does a caregiver cost in Ontario?", answer: "Through PSW Direct, home caregivers start at $35/hr — significantly less than traditional agencies that charge $55+/hr. No contracts or hidden fees." },
    { question: "Are your caregivers background-checked?", answer: "Yes. Every caregiver on PSW Direct has a verified PSW certificate, government ID, and recent police background check on file." },
    { question: "Can I get a caregiver the same day?", answer: "Yes. PSW Direct offers same-day and next-day caregiver availability across Ontario. Many requests are filled within hours." },
  ],
};

const CaregiverNearMePage = () => <HighConvertLandingPage config={config} />;
export default CaregiverNearMePage;

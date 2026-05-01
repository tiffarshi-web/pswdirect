import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "senior-home-care-near-me",
  title: "Senior Home Care Near Me | Trusted Elderly Care | PSW Direct",
  description: "Find senior home care near you in Ontario. PSW Direct matches you with vetted personal support workers for elderly care, companionship, and daily living support from $35/hr.",
  headline: "Senior Home Care Near You — Book Trusted Elderly Care",
  subheadline: "Looking for senior home care in your area? PSW Direct connects you with vetted caregivers for personal care, companionship, and mobility support. No contracts. Available same-day across Ontario.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Senior Home Care Near Me", url: "/senior-home-care-near-me" },
  ],
  faqs: [
    { question: "How do I find senior home care near me?", answer: "PSW Direct automatically matches you with the closest available vetted caregiver in your area. Enter your address when booking and we handle the rest." },
    { question: "What senior care services are available near me?", answer: "Personal hygiene care, companionship, meal preparation, medication reminders, mobility assistance, overnight supervision, dementia care, and doctor escort — all delivered in your home." },
    { question: "How much does senior home care cost near me?", answer: "Senior home care through PSW Direct starts at $35/hr. Doctor escorts start at $45/hr. No contracts, no agency markups, no hidden fees." },
    { question: "Can I get same-day senior care?", answer: "Yes. PSW Direct offers same-day and next-day senior care across Ontario. Many requests are filled within hours of booking." },
    { question: "Are senior caregivers near me background-checked?", answer: "Every caregiver on PSW Direct is credential-verified, police-checked, and reviewed before being approved to provide care." },
    { question: "Can I book senior care for my parent?", answer: "Absolutely. Select 'Someone Else' during booking and provide your parent's details. You'll stay informed throughout the care process." },
  ],
};

const SeniorHomeCareNearMePage = () => <HighConvertLandingPage config={config} />;
export default SeniorHomeCareNearMePage;

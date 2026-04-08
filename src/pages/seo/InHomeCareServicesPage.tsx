import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "in-home-care-services",
  title: "In-Home Care Services Ontario — Book a Caregiver Online | PSW Direct",
  description: "Professional in-home care services across Ontario. Book vetted personal support workers for personal care, elderly care, companionship, and post-hospital support from $30/hr.",
  headline: "In-Home Care Services in Ontario — Book a Caregiver Instantly",
  subheadline: "Affordable in-home care services delivered by vetted personal support workers. Personal care, companionship, mobility assistance, and more — no contracts, available same-day.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "In-Home Care Services", url: "/in-home-care-services" },
  ],
  faqs: [
    {
      question: "What in-home care services are available through PSW Direct?",
      answer: "PSW Direct offers personal hygiene care, companionship, meal preparation, medication reminders, mobility support, post-hospital recovery care, overnight supervision, dementia care, and doctor escort services — all delivered in your home.",
    },
    {
      question: "How much do in-home care services cost?",
      answer: "In-home care through PSW Direct starts at $30/hr for personal care and companionship. Doctor escort starts at $35/hr. No contracts, no agency fees.",
    },
    {
      question: "Can I book in-home care for a family member?",
      answer: "Yes. You can book care for a parent, spouse, or loved one. Simply select 'Someone Else' during booking and provide their details.",
    },
    {
      question: "How quickly can in-home care begin?",
      answer: "PSW Direct offers same-day and next-day in-home care across Ontario. Many requests are filled within hours of booking.",
    },
    {
      question: "Are in-home caregivers background-checked?",
      answer: "Every caregiver on PSW Direct is credential-verified, police-checked, and reviewed before being approved to provide in-home care services.",
    },
  ],
};

const InHomeCareServicesPage = () => <HighConvertLandingPage config={config} />;
export default InHomeCareServicesPage;

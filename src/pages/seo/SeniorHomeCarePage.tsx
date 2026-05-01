import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "senior-home-care",
  title: "Senior Home Care in Ontario — Trusted Elderly Care | PSW Direct",
  description: "Find trusted senior home care across Ontario. PSW Direct connects families with vetted personal support workers for elderly care at home. From $35/hr. No contracts.",
  headline: "Senior Home Care in Ontario — Trusted Elderly Care at Home",
  subheadline: "Compassionate, affordable senior home care across Ontario. Vetted PSWs providing personal care, companionship, and daily living support for your loved ones.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Senior Home Care", url: "/senior-home-care" },
  ],
  faqs: [
    {
      question: "What senior home care services does PSW Direct offer?",
      answer: "PSW Direct provides comprehensive senior home care including personal hygiene assistance, meal preparation, medication reminders, companionship, mobility support, overnight supervision, and doctor escort services across Ontario.",
    },
    {
      question: "How much does senior home care cost in Ontario?",
      answer: "Senior home care through PSW Direct starts at $35/hr for personal care and companionship. Doctor escort starts at $35/hr. No contracts, no agency fees, no hidden charges.",
    },
    {
      question: "Can I book same-day senior care?",
      answer: "Yes. PSW Direct offers same-day and next-day senior care across Ontario. Many requests are filled within hours.",
    },
    {
      question: "Are your senior caregivers vetted?",
      answer: "Every PSW on our platform is credential-verified, police-checked, and reviewed before activation. We maintain Ontario's highest vetting standards for elderly care.",
    },
    {
      question: "Do you provide overnight senior care?",
      answer: "Yes. PSW Direct offers overnight supervision, 24-hour care, and live-in arrangements for seniors who need continuous support at home.",
    },
  ],
};

const SeniorHomeCarePage = () => <HighConvertLandingPage config={config} />;
export default SeniorHomeCarePage;

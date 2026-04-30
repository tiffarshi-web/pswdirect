import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "home-care-services",
  title: "Home Care Services in Ontario | Private PSW Care from $30/hr | PSW Direct",
  description: "Affordable home care services across Ontario. Vetted personal support workers for seniors, post-hospital care, companionship, and elderly care at home. From $30/hr — no contracts.",
  headline: "Home Care Services Across Ontario",
  subheadline: "Personal support workers near you for elderly care at home, overnight care, hospital discharge, and doctor escorts. Book a vetted PSW in under 2 minutes.",
  breadcrumbTrail: [
    { name: "Home Care Services", url: "/home-care-services" },
  ],
  faqs: [
    { question: "What home care services does PSW Direct offer?", answer: "We provide personal care, companionship, meal prep, medication reminders, mobility support, overnight care, 24-hour care, doctor escorts, hospital discharge support, and post-surgery recovery care across Ontario." },
    { question: "How much do home care services cost in Ontario?", answer: "Home care services through PSW Direct start at $30/hr for personal care and companionship, and $35/hr for medical escort. There are no contracts, agency markups, or hidden fees." },
    { question: "Do you offer same-day home care services?", answer: "Yes. Most same-day home care service requests are matched within hours across the GTA and Ontario. Just select 'ASAP' when booking." },
    { question: "Are your personal support workers vetted?", answer: "Every PSW on PSW Direct is credential-verified, ID-checked, and police-background-checked before being approved to deliver home care services." },
    { question: "Can I book private home care in Ontario without a contract?", answer: "Yes — PSW Direct is fully contract-free. Book by the hour, cancel anytime, and only pay for the care you actually use." },
  ],
};

const HomeCareServicesPage = () => <HighConvertLandingPage config={config} />;
export default HomeCareServicesPage;

import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "hospital-discharge-care",
  title: "Hospital Discharge Care in Ontario | Same-Day PSW Discharge Support | PSW Direct",
  description: "Hospital discharge care across Ontario. A vetted PSW handles pickup, transport home, settling in, and immediate post-discharge support. From $35/hr — no contracts.",
  headline: "Hospital Discharge Care in Ontario",
  subheadline: "A vetted PSW manages your loved one's hospital-to-home transition — pickup, transport, prescription pickup, home setup, and immediate care. Book same-day across Ontario.",
  breadcrumbTrail: [
    { name: "Home Care Services", url: "/home-care-services" },
    { name: "Hospital Discharge Care", url: "/hospital-discharge-care" },
  ],
  faqs: [
    { question: "What is hospital discharge care?", answer: "Hospital discharge care is hands-on support during the transition from hospital to home. A PSW handles pickup, safe transport, prescription pickup, helping the patient settle in, preparing a meal, and providing the first day of in-home recovery support." },
    { question: "How fast can I book hospital discharge care?", answer: "PSW Direct typically matches a hospital discharge PSW the same day across the GTA, and same-day or next-day in most Ontario cities. We recommend booking 24 hours ahead when possible." },
    { question: "How much does hospital discharge care cost in Ontario?", answer: "Hospital discharge care starts at $35/hr — covering transport, waiting time, prescription pickup, home setup, and immediate post-discharge care. No contracts, no hidden fees." },
    { question: "Can the PSW continue care after discharge day?", answer: "Yes. Many families extend hospital discharge care into ongoing post-hospital recovery — daily, overnight, or 24-hour shifts — without any contract obligation." },
    { question: "Do you cover Toronto, Mississauga, Brampton, and other GTA hospitals?", answer: "Yes. PSW Direct dispatches hospital discharge PSWs across the GTA — including Toronto, Mississauga, Brampton, Vaughan, Markham, Oshawa, Hamilton, and Barrie — plus most Ontario cities." },
  ],
};

const HospitalDischargeCarePage = () => <HighConvertLandingPage config={config} />;
export default HospitalDischargeCarePage;

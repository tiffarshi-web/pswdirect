import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "hospital-discharge-care",
  title: "Hospital Discharge Care in Ontario | PSW Discharge Support | PSW Direct",
  description: "Hospital discharge care across Ontario. A vetted PSW handles pickup, transport home, settling in and non-clinical support after discharge. $50/hour plus applicable HST — no contracts.",
  headline: "Hospital Discharge Care in Ontario",
  subheadline: "A vetted PSW manages your loved one's hospital-to-home transition — pickup, transport, prescription pickup, home setup, and settling in. Timing and caregiver acceptance are confirmed during booking.",
  breadcrumbTrail: [
    { name: "Home Care Services", url: "/home-care-services" },
    { name: "Hospital Discharge Care", url: "/hospital-discharge-care" },
  ],
  faqs: [
    { question: "What is hospital discharge care?", answer: "Hospital discharge care is hands-on support during the transition from hospital to home. A PSW handles pickup, safe transport, prescription pickup, helping the patient settle in, preparing a meal, and providing the first day of in-home recovery support." },
    { question: "How fast can I book hospital discharge care?", answer: "Same-day matching is not guaranteed. Request as early as possible with the discharge time; the visit is confirmed only when a suitable caregiver accepts it." },
    { question: "How much does hospital discharge care cost in Ontario?", answer: "Hospital discharge care is $50/hour plus applicable HST — covering transport, waiting time, prescription pickup, home setup, and immediate post-discharge care. No contracts, no hidden fees." },
    { question: "Can the PSW continue care after discharge day?", answer: "Yes. Many families extend hospital discharge care into ongoing post-hospital recovery — in 2-hour increments at $40/hour, subject to caregiver acceptance — without any contract obligation." },
    { question: "Do you cover Toronto, Mississauga, Brampton, and other GTA hospitals?", answer: "Yes. PSW Direct dispatches hospital discharge PSWs across the GTA — including Toronto, Mississauga, Brampton, Vaughan, Markham, Oshawa, Hamilton, and Barrie — plus most Ontario cities." },
  ],
};

const HospitalDischargeCarePage = () => <HighConvertLandingPage config={config} />;
export default HospitalDischargeCarePage;

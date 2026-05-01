import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "same-day-home-care",
  title: "Same-Day Home Care in Ontario | Book a PSW Today | PSW Direct",
  description: "Need home care today? PSW Direct provides same-day PSW services across Ontario. Vetted caregivers, no contracts, from $35/hr. Book online in minutes.",
  headline: "Same-Day Home Care — Book a PSW Today",
  subheadline: "Urgent care needs don't wait. PSW Direct connects you with a vetted personal support worker the same day — anywhere in Ontario.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Same-Day Home Care", url: "/same-day-home-care" },
  ],
  faqs: [
    { question: "Can I really get a PSW the same day?", answer: "Yes. Many PSW Direct requests are filled within hours. Our network of vetted PSWs across Ontario enables rapid same-day matching for urgent care needs." },
    { question: "What if I need care right now?", answer: "Select 'ASAP' when booking and we'll prioritize your request. PSWs in your area are immediately notified and the first available caregiver accepts your job." },
    { question: "Is same-day care more expensive?", answer: "No. Same-day home care starts at the same $35/hr rate. There are no rush fees, surge pricing, or hidden charges." },
    { question: "What areas do you cover for same-day service?", answer: "PSW Direct covers 25+ communities across Ontario including Toronto, Mississauga, Brampton, Hamilton, Barrie, Ottawa, and surrounding areas." },
    { question: "Do I need a contract for same-day care?", answer: "No. All PSW Direct services are contract-free. Book by the hour and only pay for the care you use." },
    { question: "Can I book same-day care for a family member?", answer: "Absolutely. Select 'Someone Else' during booking, enter their address and care needs, and a PSW will arrive at their location." },
  ],
};

const SameDayHomeCarePage = () => <HighConvertLandingPage config={config} />;
export default SameDayHomeCarePage;

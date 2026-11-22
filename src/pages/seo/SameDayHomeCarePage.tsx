import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "same-day-home-care",
  title: "Same-Day Home Care Requests in Ontario | PSW Direct",
  description: "Need home care soon in Ontario? Request a vetted PSW online at $40/hour in 2-hour increments. Same-day care is not guaranteed; visits are confirmed when a caregiver accepts.",
  headline: "Same-Day Home Care Requests in Ontario",
  subheadline: "Submit a short-notice request for a vetted personal support worker. Timing is not guaranteed: address coverage and caregiver acceptance are confirmed during booking.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Same-Day Home Care", url: "/same-day-home-care" },
  ],
  faqs: [
    { question: "Can I really get a PSW the same day?", answer: "You can request same-day care, but it is not guaranteed. A visit is confirmed only when a suitable caregiver accepts the request. Please keep a backup plan until you receive confirmation." },
    { question: "What if I need care right now?", answer: "Choose the earliest start time you need when booking. Nearby PSWs are notified, but nobody is assigned until a suitable caregiver accepts. For a medical emergency, call 911." },
    { question: "Is same-day care more expensive?", answer: "Home care is $40/hour, booked in 2-hour increments, whether requested in advance or on short notice. You see the total and taxes before submitting." },
    { question: "What areas do you cover for same-day service?", answer: "PSW Direct serves Ontario only. Coverage for your exact address and caregiver acceptance are confirmed during booking." },
    { question: "Do I need a contract for same-day care?", answer: "No. All PSW Direct services are contract-free. Book by the hour and only pay for the care you use." },
    { question: "Can I book same-day care for a family member?", answer: "Absolutely. Select 'Someone Else' during booking, enter their address and care needs, and we confirm once a caregiver accepts the visit." },
  ],
};

const SameDayHomeCarePage = () => <HighConvertLandingPage config={config} />;
export default SameDayHomeCarePage;

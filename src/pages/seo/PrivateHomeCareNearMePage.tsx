import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "private-home-care-near-me",
  title: "Private Home Care Near Me | On-Demand PSW | PSW Direct",
  description: "Find private home care near you in Ontario. PSW Direct matches you with vetted personal support workers for personal care, companionship, and more from $30/hr.",
  headline: "Private Home Care Near You — Book Instantly",
  subheadline: "On-demand home care. No contracts. Vetted PSWs available same-day across Ontario. Book online in under 2 minutes.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Private Home Care Near Me", url: "/private-home-care-near-me" },
  ],
  faqs: [
    { question: "How do I find private home care near me?", answer: "PSW Direct matches you with vetted PSWs in your area automatically. Simply enter your address when booking and we'll connect you with the closest available caregiver." },
    { question: "Is private home care better than agency care?", answer: "Private home care through PSW Direct costs $30/hr vs $55+/hr at traditional agencies. You get the same vetted, qualified PSWs without the agency markup, contracts, or wait times." },
    { question: "What services does private home care include?", answer: "Personal care (bathing, dressing, grooming), companionship, meal preparation, medication reminders, mobility assistance, doctor escorts, and hospital discharge support." },
    { question: "Do I need a referral for private home care?", answer: "No referral needed. Book directly through PSW Direct online. There are no waitlists, no intake assessments, and no mandatory contracts." },
    { question: "Can I choose my PSW?", answer: "Once a PSW accepts your booking, you can see their profile, credentials, and experience. For repeat visits, you can request the same caregiver." },
    { question: "Is private home care covered by insurance?", answer: "Many extended health plans and Veterans Affairs Canada (VAC) cover private home care. PSW Direct supports insurance and VAC billing directly through the booking flow." },
  ],
};

const PrivateHomeCareNearMePage = () => <HighConvertLandingPage config={config} />;
export default PrivateHomeCareNearMePage;

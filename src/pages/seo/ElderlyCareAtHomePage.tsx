import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "elderly-care-at-home",
  title: "Elderly Care at Home in Ontario | Private PSW from $30/hr | PSW Direct",
  description: "Compassionate elderly care at home across Ontario. Vetted personal support workers help seniors with bathing, meals, mobility, and companionship. From $30/hr — no contracts.",
  headline: "Elderly Care at Home in Ontario",
  subheadline: "Help your loved one age in place with dignity. Vetted PSWs for personal care, companionship, and daily living support — book online in under 2 minutes.",
  breadcrumbTrail: [
    { name: "Home Care Services", url: "/home-care-services" },
    { name: "Elderly Care at Home", url: "/elderly-care-at-home" },
  ],
  faqs: [
    { question: "What is elderly care at home?", answer: "Elderly care at home is in-home support for seniors who want to age in place. A personal support worker assists with bathing, dressing, meal prep, medication reminders, mobility, companionship, and light housekeeping in the senior's own home." },
    { question: "How much does elderly care at home cost in Ontario?", answer: "Elderly care at home through PSW Direct starts at $30/hr — significantly less than agency rates of $50–$60/hr. No contracts, no minimum hours after the first booking." },
    { question: "Is elderly care at home better than a nursing home?", answer: "Many families prefer elderly care at home because seniors stay in familiar surroundings, receive 1-on-1 attention, and avoid long-term care waitlists. It is also typically more affordable for part-time needs." },
    { question: "Can I book elderly care at home for just a few hours a week?", answer: "Yes. PSW Direct supports flexible scheduling — from a few hours a week of companionship to overnight or 24-hour care. Pay only for the hours you book." },
    { question: "Do your PSWs have dementia training?", answer: "Many of our PSWs have specialized experience with dementia and Alzheimer's care, including redirection techniques, fall prevention, and safety supervision in the home." },
  ],
};

const ElderlyCareAtHomePage = () => <HighConvertLandingPage config={config} />;
export default ElderlyCareAtHomePage;

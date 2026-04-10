import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "elderly-care-near-me",
  title: "Elderly Care Near Me | Senior Home Care in Ontario | PSW Direct",
  description: "Find elderly care near you in Ontario. PSW Direct provides vetted personal support workers for senior home care, companionship, and daily living assistance from $30/hr.",
  headline: "Elderly Care Near You — Compassionate Senior Support",
  subheadline: "Trusted elderly care from vetted PSWs. Personal care, companionship, mobility support, and more. No contracts — book by the hour.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Senior Home Care", url: "/senior-home-care" },
    { name: "Elderly Care Near Me", url: "/elderly-care-near-me" },
  ],
  faqs: [
    { question: "What is elderly care at home?", answer: "Elderly care at home includes personal care (bathing, dressing), meal preparation, medication reminders, companionship, mobility assistance, and supervision for seniors who want to age in place safely." },
    { question: "How much does elderly home care cost in Ontario?", answer: "PSW Direct offers elderly care starting at $30/hr. Traditional agencies charge $55+/hr for the same services. No contracts, no hidden fees." },
    { question: "Can I get elderly care for my parent same-day?", answer: "Yes. PSW Direct offers same-day elderly care across Ontario. Book online and a vetted PSW can begin care the same day." },
    { question: "Do your PSWs have experience with dementia?", answer: "Yes. Many PSWs on our platform have specialized training in dementia and Alzheimer's care, including redirection techniques and safety supervision." },
    { question: "Is elderly home care better than a nursing home?", answer: "Many families prefer in-home elderly care because it's more affordable, allows seniors to stay in familiar surroundings, and provides one-on-one attention without waitlists." },
  ],
};

const ElderlyNearMePage = () => <HighConvertLandingPage config={config} />;
export default ElderlyNearMePage;

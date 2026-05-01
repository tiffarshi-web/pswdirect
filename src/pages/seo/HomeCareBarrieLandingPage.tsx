import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  city: "Barrie",
  slug: "home-care-barrie",
  title: "Home Care in Barrie — Book a PSW Instantly | PSW Direct",
  description: "Book vetted home care in Barrie. PSW Direct connects families with personal support workers for senior care, companionship, and doctor escorts from $45/hr. Same-day available.",
  headline: "Home Care in Barrie — Book a PSW Instantly",
  subheadline: "On-demand home care in Barrie and Simcoe County. No contracts. Vetted PSWs available same-day for personal care, companionship, and medical escorts.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Home Care Barrie", url: "/home-care-barrie" },
  ],
  faqs: [
    { question: "How fast can I get home care in Barrie?", answer: "PSW Direct offers same-day home care in Barrie and surrounding Simcoe County communities. Many requests are filled within hours." },
    { question: "How much does home care cost in Barrie?", answer: "Home care through PSW Direct in Barrie starts at $45/hr for personal care and companionship. Doctor escort starts at $45/hr. No agency fees." },
    { question: "Do you serve areas around Barrie?", answer: "Yes. PSW Direct covers Barrie, Orillia, Innisfil, Angus, Wasaga Beach, Collingwood, and surrounding Simcoe County communities." },
    { question: "Can I book overnight care in Barrie?", answer: "Yes. PSW Direct provides overnight care, 24-hour care, and flexible scheduling in Barrie. Book the exact hours you need." },
    { question: "Do I need a contract?", answer: "No. All PSW Direct services are contract-free. Pay by the hour and cancel anytime." },
    { question: "Are Barrie PSWs vetted?", answer: "Every PSW serving Barrie is credential-verified, police-checked, and reviewed before being activated on the platform." },
  ],
};

const HomeCareBarrieLandingPage = () => <HighConvertLandingPage config={config} />;
export default HomeCareBarrieLandingPage;

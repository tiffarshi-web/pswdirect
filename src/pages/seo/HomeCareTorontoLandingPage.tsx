import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  city: "Toronto",
  slug: "home-care-toronto",
  title: "Home Care in Toronto — Book a PSW Instantly | PSW Direct",
  description: "Book vetted home care in Toronto. PSW Direct connects families with personal support workers for senior care, companionship, doctor escorts & more from $30/hr. Same-day available.",
  headline: "Home Care in Toronto — Book a PSW Instantly",
  subheadline: "On-demand home care across Toronto and the GTA. No contracts. Vetted PSWs available same-day for personal care, companionship, and medical escorts.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Home Care Toronto", url: "/home-care-toronto" },
  ],
  faqs: [
    { question: "How fast can I get home care in Toronto?", answer: "PSW Direct offers same-day home care across Toronto and the GTA. Many requests are filled within hours. Book online and a vetted PSW can begin care the same day." },
    { question: "How much does home care cost in Toronto?", answer: "Home care through PSW Direct in Toronto starts at $30/hr for personal care and companionship. Doctor escort starts at $35/hr. No agency fees or hidden charges." },
    { question: "Do I need a contract for home care in Toronto?", answer: "No. PSW Direct is completely contract-free. Pay by the hour, book when you need care, and cancel anytime." },
    { question: "Can I book home care for my parent in Toronto?", answer: "Yes. Select 'Someone Else' during booking, enter their Toronto address, and a vetted PSW will arrive at their location." },
    { question: "What areas in Toronto do you serve?", answer: "PSW Direct covers all of Toronto including North York, Scarborough, Etobicoke, East York, and the surrounding GTA communities." },
    { question: "Are Toronto PSWs vetted?", answer: "Every PSW serving Toronto is credential-verified, police-checked, and reviewed before activation." },
  ],
};

const HomeCareTorontoLandingPage = () => <HighConvertLandingPage config={config} />;
export default HomeCareTorontoLandingPage;

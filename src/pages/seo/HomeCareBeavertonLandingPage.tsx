import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  city: "Beaverton",
  slug: "home-care-beaverton",
  title: "Home Care in Beaverton — Book a PSW Instantly | PSW Direct",
  description: "Book vetted home care in Beaverton, Ontario. PSW Direct connects families with personal support workers for senior care, companionship, and doctor escorts from $30/hr.",
  headline: "Home Care in Beaverton — Book a PSW Instantly",
  subheadline: "On-demand home care in Beaverton and Durham Region. No contracts. Vetted PSWs available for personal care, companionship, and medical escorts.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
    { name: "Home Care Beaverton", url: "/home-care-beaverton" },
  ],
  faqs: [
    { question: "Can I get home care in Beaverton?", answer: "Yes. PSW Direct has vetted PSWs serving Beaverton and surrounding communities in the Durham and Simcoe regions. Book online for same-day or scheduled care." },
    { question: "How much does home care cost in Beaverton?", answer: "Home care through PSW Direct in Beaverton starts at $30/hr for personal care. Doctor escort starts at $35/hr. No hidden fees." },
    { question: "Do you serve rural areas near Beaverton?", answer: "Yes. PSW Direct covers Beaverton, Cannington, Sunderland, Orillia, and surrounding rural communities across Durham and Simcoe County." },
    { question: "Can I book care for a family member in Beaverton?", answer: "Absolutely. Select 'Someone Else' during booking, enter their Beaverton address, and a vetted PSW will be matched to their location." },
    { question: "Do I need a contract?", answer: "No. PSW Direct is completely contract-free. Book by the hour and cancel anytime with no penalties." },
    { question: "Are your PSWs police-checked?", answer: "Yes. Every PSW on our platform is credential-verified and police-checked before activation." },
  ],
};

const HomeCareBeavertonLandingPage = () => <HighConvertLandingPage config={config} />;
export default HomeCareBeavertonLandingPage;

import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "home-care-ontario",
  title: "Home Care in Ontario — Book a PSW Instantly | PSW Direct",
  description: "Find affordable home care across Ontario. PSW Direct connects families with vetted personal support workers for senior care, personal care, and companionship from $30/hr. No contracts.",
  headline: "Home Care in Ontario — Book a PSW Instantly",
  subheadline: "On-demand home care. No contracts. Available same-day across Ontario. From personal care to doctor escorts — vetted PSWs ready when you need them.",
  breadcrumbTrail: [
    { name: "Home Care Ontario", url: "/home-care-ontario" },
  ],
};

const HomeCareOntarioLandingPage = () => <HighConvertLandingPage config={config} />;
export default HomeCareOntarioLandingPage;

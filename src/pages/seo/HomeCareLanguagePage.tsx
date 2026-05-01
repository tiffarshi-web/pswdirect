import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

interface Props {
  language: string;
  slug: string;
}

const HomeCareLanguagePage = ({ language, slug }: Props) => {
  const config: HighConvertPageConfig = {
    slug,
    title: `${language}-Speaking Home Care | Book a ${language} PSW | PSW Direct`,
    description: `Find ${language}-speaking home care and personal support workers in Ontario. Book a ${language}-speaking PSW online from $35/hr — no contracts.`,
    headline: `${language}-Speaking Home Care in Ontario`,
    subheadline: `Book a ${language}-speaking personal support worker for in-home care. Vetted caregivers, transparent pricing, no contracts.`,
    breadcrumbTrail: [
      { name: "Home Care Ontario", url: "/home-care-ontario" },
      { name: "Languages", url: "/languages" },
      { name: `${language} Home Care`, url: `/${slug}` },
    ],
    faqs: [
      { question: `Can I book a ${language}-speaking PSW?`, answer: `Yes. PSW Direct has ${language}-speaking personal support workers available across Ontario. Select your language preference when booking and we'll match you accordingly.` },
      { question: `How much does ${language}-speaking home care cost?`, answer: `The same transparent rate as all PSW Direct services — starting at $35/hr. There is no premium for language-specific matching.` },
      { question: `What services do ${language}-speaking PSWs provide?`, answer: `All standard home care services: personal care, companionship, meal preparation, medication reminders, mobility assistance, doctor escorts, and specialized care for dementia and post-surgery recovery.` },
      { question: "Do I need a contract?", answer: "No. PSW Direct is completely contract-free. Book by the hour and cancel anytime." },
    ],
  };

  return <HighConvertLandingPage config={config} />;
};

export default HomeCareLanguagePage;

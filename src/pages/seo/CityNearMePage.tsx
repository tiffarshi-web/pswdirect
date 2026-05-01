import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

interface Props {
  city: string;
  slug: string;
  variant: "home-care" | "caregiver" | "psw";
}

const variantConfig: Record<string, (city: string, slug: string) => HighConvertPageConfig> = {
  "home-care": (city, slug) => ({
    slug,
    city,
    title: `Home Care Near Me in ${city} | Same-Day PSW | PSW Direct`,
    description: `Looking for home care near you in ${city}, Ontario? PSW Direct provides same-day, vetted personal support workers for in-home care from $35/hr. No contracts.`,
    headline: `Home Care Near You in ${city}`,
    subheadline: `Need home care near you in ${city}? PSW Direct provides vetted personal support workers for same-day in-home care — personal care, companionship, and mobility support from $35/hr.`,
    breadcrumbTrail: [
      { name: "Home Care Near Me", url: "/home-care-near-me" },
      { name: `Home Care ${city}`, url: `/${slug}` },
    ],
    faqs: [
      { question: `How fast can I get home care near me in ${city}?`, answer: `PSW Direct offers same-day home care in ${city}. Many requests are filled within hours. Book online and a vetted PSW near you can begin care the same day.` },
      { question: `What home care services are available near me in ${city}?`, answer: `Services in ${city} include personal care, companionship, meal preparation, medication reminders, mobility assistance, doctor escorts, and hospital discharge support.` },
      { question: `How much does home care cost near ${city}?`, answer: `Home care through PSW Direct in ${city} starts at $35/hr. No agency fees, no contracts, no hidden charges.` },
    ],
  }),
  "caregiver": (city, slug) => ({
    slug,
    city,
    title: `Caregiver Near Me in ${city} | Find a Caregiver | PSW Direct`,
    description: `Find a trusted caregiver near you in ${city}, Ontario. Vetted home caregivers for personal care, companionship, and senior support from $35/hr. Book same-day.`,
    headline: `Find a Caregiver Near You in ${city}`,
    subheadline: `Looking for a caregiver near you in ${city}? PSW Direct connects you with vetted caregivers for same-day in-home care — no contracts, no agency fees.`,
    breadcrumbTrail: [
      { name: "Caregiver Near Me", url: "/caregiver-near-me" },
      { name: `Caregiver ${city}`, url: `/${slug}` },
    ],
    faqs: [
      { question: `How do I find a caregiver near me in ${city}?`, answer: `Book online at PSW Direct and enter your ${city} address. We'll match you with the closest vetted caregiver, often within hours.` },
      { question: `Are caregivers in ${city} background-checked?`, answer: `Yes. Every caregiver on PSW Direct has a verified PSW certificate, government ID, and recent police background check.` },
      { question: `Can I get a same-day caregiver in ${city}?`, answer: `Yes. PSW Direct offers same-day caregiver availability across ${city} and surrounding areas.` },
    ],
  }),
  "psw": (city, slug) => ({
    slug,
    city,
    title: `PSW Near Me in ${city} | Personal Support Worker | PSW Direct`,
    description: `Find a PSW near you in ${city}, Ontario. Vetted personal support workers for home care, senior care, and daily living assistance from $35/hr. Book same-day.`,
    headline: `Find a PSW Near You in ${city}`,
    subheadline: `Need a personal support worker near you in ${city}? PSW Direct provides vetted PSWs for same-day home care — personal care, companionship, and mobility support.`,
    breadcrumbTrail: [
      { name: "PSW Near Me", url: "/psw-near-me" },
      { name: `PSW ${city}`, url: `/${slug}` },
    ],
    faqs: [
      { question: `How do I find a PSW near me in ${city}?`, answer: `PSW Direct matches you with vetted PSWs in ${city}. Book online in under 2 minutes and a personal support worker near you can begin care the same day.` },
      { question: `What does a PSW do in ${city}?`, answer: `A PSW in ${city} assists with bathing, dressing, grooming, meal preparation, medication reminders, mobility support, companionship, and doctor escorts.` },
      { question: `How much does a PSW cost in ${city}?`, answer: `PSWs through PSW Direct in ${city} start at $45/hr for personal care and $45/hr for doctor escorts. No contracts or agency fees.` },
    ],
  }),
};

const CityNearMePage = ({ city, slug, variant }: Props) => {
  const config = variantConfig[variant](city, slug);
  return <HighConvertLandingPage config={config} />;
};

export default CityNearMePage;

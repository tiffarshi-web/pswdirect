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
    title: `Home Care Near Me in ${city} | Vetted PSW | PSW Direct`,
    description: `Looking for home care near you in ${city}, Ontario? PSW Direct provides vetted personal support workers for in-home care from $40/hr. No contracts.`,
    headline: `Home Care Near You in ${city}`,
    subheadline: `Need home care near you in ${city}? PSW Direct accepts requests for vetted personal support workers for in-home care — personal care, companionship, and mobility support from $40/hr.`,
    breadcrumbTrail: [
      { name: "Home Care Near Me", url: "/home-care-near-me" },
      { name: `Home Care ${city}`, url: `/${slug}` },
    ],
    faqs: [
      { question: `How fast can I get home care near me in ${city}?`, answer: `You can request a preferred time, including same day, but it is not guaranteed. Coverage, timing and a suitable caregiver are confirmed only after a caregiver accepts.` },
      { question: `What home care services are available near me in ${city}?`, answer: `Services in ${city} include personal care, companionship, meal preparation, medication reminders, mobility assistance, doctor escorts, and hospital discharge support.` },
      { question: `How much does home care cost near ${city}?`, answer: `Home care through PSW Direct in ${city} starts at $40/hr. No agency fees, no contracts, no hidden charges.` },
    ],
  }),
  "caregiver": (city, slug) => ({
    slug,
    city,
    title: `Caregiver Near Me in ${city} | Find a Caregiver | PSW Direct`,
    description: `Find a trusted caregiver near you in ${city}, Ontario. Vetted home caregivers for personal care, companionship, and senior support from $40/hr. Timing confirmed when a caregiver accepts.`,
    headline: `Find a Caregiver Near You in ${city}`,
    subheadline: `Looking for a caregiver near you in ${city}? PSW Direct accepts requests for vetted caregivers for in-home care — no contracts, no agency fees.`,
    breadcrumbTrail: [
      { name: "Caregiver Near Me", url: "/caregiver-near-me" },
      { name: `Caregiver ${city}`, url: `/${slug}` },
    ],
    faqs: [
      { question: `How do I find a caregiver near me in ${city}?`, answer: `Book online at PSW Direct and enter your ${city} address. Address coverage and caregiver acceptance are confirmed during booking. Timing is not guaranteed; a visit is confirmed only when a suitable caregiver accepts.` },
      { question: `Are caregivers in ${city} background-checked?`, answer: `Yes. Every caregiver on PSW Direct has a verified PSW certificate, government ID, and recent police background check.` },
      { question: `Can I get a same-day caregiver in ${city}?`, answer: `Same-day care is not guaranteed; a visit is confirmed only when a suitable caregiver accepts the request.` },
    ],
  }),
  "psw": (city, slug) => ({
    slug,
    city,
    title: `PSW Near Me in ${city} | Personal Support Worker | PSW Direct`,
    description: `Find a PSW near you in ${city}, Ontario. Vetted personal support workers for home care, senior care, and daily living assistance from $40/hr. Timing confirmed when a caregiver accepts.`,
    headline: `Find a PSW Near You in ${city}`,
    subheadline: `Need a personal support worker near you in ${city}? PSW Direct accepts requests for vetted PSWs for home care — personal care, companionship, and mobility support.`,
    breadcrumbTrail: [
      { name: "PSW Near Me", url: "/psw-near-me" },
      { name: `PSW ${city}`, url: `/${slug}` },
    ],
    faqs: [
      { question: `How do I find a PSW near me in ${city}?`, answer: `PSW Direct matches you with vetted PSWs in ${city}. Request your preferred time online; coverage, timing and a suitable caregiver are confirmed only after a caregiver accepts.` },
      { question: `What does a PSW do in ${city}?`, answer: `A PSW in ${city} assists with bathing, dressing, grooming, meal preparation, medication reminders, mobility support, companionship, and doctor escorts.` },
      { question: `How much does a PSW cost in ${city}?`, answer: `PSWs through PSW Direct in ${city} start at $40/hr for personal care and $50/hr for doctor escorts. No contracts or agency fees.` },
    ],
  }),
};

const CityNearMePage = ({ city, slug, variant }: Props) => {
  const config = variantConfig[variant](city, slug);
  return <HighConvertLandingPage config={config} />;
};

export default CityNearMePage;

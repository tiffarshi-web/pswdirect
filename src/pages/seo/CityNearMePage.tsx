import PublicPswCityCards from "@/components/seo/PublicPswCityCards";
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
    title: `Home Care Near Me in ${city}, Ontario | PSW Direct`,
    description: `Planning home care near you in ${city}? Request a personal support worker for non-clinical daily help at $40/hour, booked in two-hour increments. 24/7 customer support.`,
    headline: `Home Care Near You in ${city}`,
    subheadline: `Request non-clinical home care at your ${city} address — personal care, companionship, mobility help and household tasks at $40/hour in two-hour increments. Exact-address availability and caregiver acceptance are confirmed during booking.`,
    breadcrumbTrail: [
      { name: "Home Care Near Me", url: "/home-care-near-me" },
      { name: `Home Care Near Me in ${city}`, url: `/${slug}` },
    ],
    faqs: [
      { question: `Is home care available near me in ${city}?`, answer: `Enter your exact ${city} address when you book. Coverage for that address and a suitable caregiver are confirmed only after a caregiver accepts the request; PSW Direct does not guarantee availability for every address or time.` },
      { question: `How fast can I get home care near me in ${city}?`, answer: `You can request a preferred time, including same day, but timing is not guaranteed. A visit is confirmed only when a caregiver accepts.` },
      { question: `What home care can I request in ${city}?`, answer: `Non-clinical daily support: bathing, dressing and toileting help, companionship, light housekeeping, meal preparation, medication reminders, mobility help, and caregiver relief. PSWs do not provide nursing or medical treatment.` },
      { question: `How much does home care near ${city} cost?`, answer: `Ontario home care through PSW Direct is $40/hour, booked in two-hour increments. Your total and any applicable taxes are shown before you submit.` },
      { question: `Can I talk to someone before booking in ${city}?`, answer: `Yes. Customer support is available 24 hours a day, 7 days a week at (249) 288-4787. Support availability is not a guarantee of caregiver availability.` },
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
  const cityKey = slug.replace(/^(home-care|caregiver|psw)-/, "").replace(/-near-me$/, "");
  const links = variant === "home-care" ? (
    <nav aria-label={`More home care planning for ${city}`} className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold mb-3">Plan care in {city}</h2>
      <ul className="grid gap-2 sm:grid-cols-2 list-disc pl-5">
        <li><a className="underline" href={`/home-care-${cityKey}`}>Home care in {city}</a></li>
        <li><a className="underline" href={`/personal-support-worker-${cityKey}`}>Personal support worker in {city}</a></li>
        <li><a className="underline" href="/home-care-ontario">Home care across Ontario</a></li>
        <li><a className="underline" href="/home-care-near-me">Find home care near me</a></li>
      </ul>
    </nav>
  ) : null;
  return <HighConvertLandingPage config={{ ...config, extraContent: <><PublicPswCityCards city={city} />{links}</> }} />;
};

export default CityNearMePage;

import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "24-hour-home-care",
  title: "24-Hour Home Care in Ontario | Round-the-Clock PSW Support | PSW Direct",
  description: "24-hour home care across Ontario. Rotating shifts of vetted personal support workers provide continuous in-home care for seniors and post-hospital patients. From $35/hr.",
  headline: "24-Hour Home Care in Ontario",
  subheadline: "Round-the-clock support from rotating vetted PSWs. Continuous in-home care for dementia, post-surgery recovery, and high-acuity senior support — book online today.",
  breadcrumbTrail: [
    { name: "Home Care Services", url: "/home-care-services" },
    { name: "24-Hour Home Care", url: "/24-hour-home-care" },
  ],
  faqs: [
    { question: "What is 24-hour home care?", answer: "24-hour home care provides continuous in-home support through rotating PSW shifts — typically two to three caregivers covering a 24-hour cycle. It is ideal for seniors needing constant supervision, post-hospital recovery, or end-of-life care." },
    { question: "How much does 24-hour home care cost in Ontario?", answer: "24-hour home care through PSW Direct starts at $35/hr for personal care. Daily totals are significantly lower than long-term care or live-in agencies — and there are no contracts." },
    { question: "How is 24-hour care different from live-in care?", answer: "24-hour care uses awake, rotating PSWs so your loved one is supervised at all times, including overnight. Live-in care typically includes a sleep period and is best for lower-acuity needs." },
    { question: "Can I get 24-hour home care started today?", answer: "Yes. PSW Direct can usually launch 24-hour care within hours across the GTA, and same-day or next-day in most Ontario cities." },
    { question: "Do you provide 24-hour care for dementia?", answer: "Yes — many of our PSWs are experienced with dementia and Alzheimer's care including wandering supervision, redirection, and fall prevention across all 24-hour shifts." },
  ],
};

const TwentyFourHourHomeCarePage = () => <HighConvertLandingPage config={config} />;
export default TwentyFourHourHomeCarePage;

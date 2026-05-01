import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "post-hospital-care",
  title: "Post-Hospital Care in Ontario | Recovery PSW at Home | PSW Direct",
  description: "Post-hospital care at home across Ontario. Vetted PSWs help with discharge, mobility, meals, medication reminders, and recovery. From $35/hr — no contracts.",
  headline: "Post-Hospital Care at Home",
  subheadline: "A vetted personal support worker helps your loved one recover safely at home after a hospital stay. Same-day discharge support across Ontario from $35/hr.",
  breadcrumbTrail: [
    { name: "Home Care Services", url: "/home-care-services" },
    { name: "Post-Hospital Care", url: "/post-hospital-care" },
  ],
  faqs: [
    { question: "What is post-hospital care?", answer: "Post-hospital care is short-term in-home support after a hospital stay or surgery. A PSW helps with mobility, bathing, meal prep, medication reminders, light housekeeping, and watching for warning signs that could lead to readmission." },
    { question: "When should I book post-hospital care?", answer: "Book post-hospital care as soon as a discharge date is known — ideally 24–48 hours in advance — so a vetted PSW can be at the home when your loved one arrives. Same-day bookings are usually possible across Ontario." },
    { question: "How long does post-hospital care typically last?", answer: "Most families book post-hospital care for 1–4 weeks of recovery. PSW Direct supports flexible scheduling so you can scale care up or down as recovery progresses — no contracts." },
    { question: "How much does post-hospital care cost in Ontario?", answer: "Post-hospital care starts at $35/hr through PSW Direct. Doctor escort and medical transport for follow-up appointments start at $35/hr." },
    { question: "Can a PSW pick my loved one up from the hospital?", answer: "Yes. Our doctor escort and hospital discharge service includes pickup, transport home, settling in, and immediate post-discharge care." },
  ],
};

const PostHospitalCarePage = () => <HighConvertLandingPage config={config} />;
export default PostHospitalCarePage;

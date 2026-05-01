import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const configs: Record<string, HighConvertPageConfig> = {
  "home-care-cost-ontario": {
    slug: "home-care-cost-ontario",
    title: "Home Care Cost Ontario | How Much Does Home Care Cost? | PSW Direct",
    description: "How much does home care cost in Ontario? PSW Direct offers transparent pricing from $35/hr for personal care. No agency fees, no contracts. Get an instant price estimate.",
    headline: "How Much Does Home Care Cost in Ontario?",
    subheadline: "PSW Direct offers Ontario's most transparent home care pricing. Personal care starts at $45/hr, doctor escorts at $45/hr. No agency markup, no contracts, no hidden fees — just honest pricing.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Home Care Cost Ontario", url: "/home-care-cost-ontario" },
    ],
    faqs: [
      { question: "How much does home care cost per hour in Ontario?", answer: "Through PSW Direct, home care starts at $35/hr for personal care and companionship, and $45/hr for doctor escorts and hospital discharge. Traditional agencies charge $55-$75/hr." },
      { question: "Are there any hidden fees?", answer: "No. PSW Direct charges a flat hourly rate with no agency fees, no signup fees, no cancellation penalties, and no long-term contracts. The price you see is the price you pay." },
      { question: "Is home care cheaper than a nursing home?", answer: "Yes, in most cases. A nursing home in Ontario costs $2,000-$4,000+/month. Home care through PSW Direct at 20 hours/week costs approximately $2,400-$2,800/month with personalized one-on-one care." },
      { question: "Does OHIP cover home care?", answer: "OHIP covers some home care through CCACs/Home and Community Care, but wait lists can be months long. PSW Direct is a private-pay option that provides immediate access without wait lists." },
    ],
  },
  "psw-hourly-rate": {
    slug: "psw-hourly-rate",
    title: "PSW Hourly Rate Ontario | Personal Support Worker Cost | PSW Direct",
    description: "What is the PSW hourly rate in Ontario? PSW Direct offers personal support workers from $35/hr — 40% less than agency rates. No contracts, transparent pricing.",
    headline: "PSW Hourly Rate in Ontario — Transparent Pricing",
    subheadline: "Know exactly what you'll pay before you book. PSW Direct offers vetted personal support workers starting at $35/hr — significantly less than traditional agency rates of $55-$75/hr.",
    breadcrumbTrail: [
      { name: "PSW Cost", url: "/psw-cost" },
      { name: "PSW Hourly Rate", url: "/psw-hourly-rate" },
    ],
    faqs: [
      { question: "What is the average PSW hourly rate in Ontario?", answer: "Traditional agencies charge $55-$75/hr. Through PSW Direct, the rate is $35/hr for personal care and $45/hr for doctor escorts — saving families 40-50% on care costs." },
      { question: "Why is PSW Direct cheaper than agencies?", answer: "PSW Direct connects families directly with PSWs, eliminating agency overhead and middleman markups. Our PSWs earn more per hour while families pay less." },
      { question: "Is there a minimum number of hours?", answer: "PSW Direct has a 3-hour minimum per booking. This ensures PSWs can provide meaningful care and makes travel to your location worthwhile." },
      { question: "Do rates change on weekends or holidays?", answer: "Standard rates apply 7 days a week. There are no weekend premiums or holiday surcharges with PSW Direct." },
    ],
  },
  "caregiver-cost-canada": {
    slug: "caregiver-cost-canada",
    title: "Caregiver Cost Canada | How Much Does a Caregiver Cost? | PSW Direct",
    description: "How much does a caregiver cost in Canada? Compare caregiver rates across Ontario. PSW Direct offers vetted caregivers from $35/hr — no agency fees, no contracts.",
    headline: "How Much Does a Caregiver Cost in Canada?",
    subheadline: "Caregiver costs in Canada vary widely. PSW Direct provides a transparent alternative — vetted personal support workers from $35/hr in Ontario, with no agency markup, no contracts, and no hidden fees.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Caregiver Cost Canada", url: "/caregiver-cost-canada" },
    ],
    faqs: [
      { question: "How much does a caregiver cost in Ontario?", answer: "Agency caregiver rates in Ontario range from $55-$75/hr. PSW Direct offers vetted caregivers from $35/hr — saving families thousands of dollars per month." },
      { question: "What factors affect caregiver cost?", answer: "Factors include the type of care needed (personal care vs. medical escort), duration of visits, and location. PSW Direct keeps pricing simple: $35/hr personal care, $45/hr doctor escort." },
      { question: "Can I get government funding for a caregiver?", answer: "Some programs exist through Home and Community Care and Veterans Affairs Canada. PSW Direct supports VAC claims and third-party billing for eligible families." },
    ],
  },
  "is-home-care-covered-by-insurance": {
    slug: "is-home-care-covered-by-insurance",
    title: "Is Home Care Covered by Insurance in Ontario? | PSW Direct",
    description: "Is home care covered by insurance in Ontario? Learn about OHIP, private insurance, and Veterans Affairs coverage for home care services. PSW Direct accepts insurance claims.",
    headline: "Is Home Care Covered by Insurance in Ontario?",
    subheadline: "Many Ontario families wonder if home care is covered by insurance. The answer depends on your coverage. PSW Direct supports private insurance claims, Veterans Affairs Canada benefits, and third-party payers.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Insurance Coverage", url: "/is-home-care-covered-by-insurance" },
    ],
    faqs: [
      { question: "Does OHIP cover home care?", answer: "OHIP provides limited home care through Home and Community Care (formerly CCAC), but wait lists are often months long. PSW Direct is a private-pay option for immediate access to care." },
      { question: "Does private insurance cover home care?", answer: "Many extended health benefit plans cover personal support worker services. Check with your insurance provider. PSW Direct provides detailed receipts and documentation for insurance claims." },
      { question: "Does Veterans Affairs cover home care?", answer: "Yes. Veterans Affairs Canada (VAC) covers home care services for eligible veterans. PSW Direct supports VAC claims — enter your K-number and authorization details during booking." },
      { question: "How do I submit insurance claims?", answer: "PSW Direct provides itemized receipts after each visit. You can submit these to your insurance provider for reimbursement. We also support direct third-party billing for select payers." },
    ],
  },
};

export const HomeCareOntarioCostPage = () => <HighConvertLandingPage config={configs["home-care-cost-ontario"]} />;
export const PSWHourlyRatePage = () => <HighConvertLandingPage config={configs["psw-hourly-rate"]} />;
export const CaregiverCostCanadaPage = () => <HighConvertLandingPage config={configs["caregiver-cost-canada"]} />;
export const InsuranceCoveragePage = () => <HighConvertLandingPage config={configs["is-home-care-covered-by-insurance"]} />;

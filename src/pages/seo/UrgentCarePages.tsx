import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const configs: Record<string, HighConvertPageConfig> = {
  "home-care-after-hospital-discharge": {
    slug: "home-care-after-hospital-discharge",
    title: "Home Care After Hospital Discharge | Vetted PSW | PSW Direct",
    description: "Need home care after hospital discharge in Ontario? PSW Direct accepts requests for vetted personal support workers for post-discharge recovery care from $50/hr.",
    headline: "Home Care After Hospital Discharge",
    subheadline: "Your loved one is being discharged and needs care at home. PSW Direct provides vetted personal support workers for post-hospital recovery — transport home, medication management, and daily care.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "After Hospital Discharge", url: "/home-care-after-hospital-discharge" },
    ],
    faqs: [
      { question: "Can I arrange home care before hospital discharge?", answer: "Yes. Many families book PSW Direct before discharge so a vetted caregiver is ready on arrival. " },
      { question: "What does post-discharge home care include?", answer: "Services include transport home, medication reminders, wound care support, meal preparation, mobility assistance, personal hygiene help, and companionship during recovery." },
      { question: "How long does post-discharge care last?", answer: "As long as needed. PSW Direct is contract-free — book a few days of recovery support or ongoing daily care. Adjust anytime." },
    ],
  },
  "urgent-caregiver-services": {
    slug: "urgent-caregiver-services",
    title: "Urgent Caregiver Services Ontario | Short-Notice Requests | PSW Direct",
    description: "Need a caregiver urgently in Ontario? PSW Direct accepts requests for vetted personal support workers for emergency and urgent home care needs. From $40/hr.",
    headline: "Urgent Caregiver Services — Request-Based Scheduling",
    subheadline: "Submit an urgent home care request with your preferred time. Timing is not guaranteed; coverage, timing and a suitable caregiver are confirmed only after a caregiver accepts. No contracts.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Urgent Caregiver Services", url: "/urgent-caregiver-services" },
    ],
    faqs: [
      { question: "How fast can I get an urgent caregiver?", answer: "Same-day care is not guaranteed; a visit is confirmed only when a suitable caregiver accepts the request. Book online with your address and timing, and wait for confirmation before relying on the visit." },
      { question: "What counts as urgent care?", answer: "Urgent care includes sudden illness, caregiver burnout, unexpected hospital discharge, fall recovery, family emergencies, and other situations where a family needs non-clinical help at short notice. For a medical emergency, call 911." },
      { question: "Is urgent care more expensive?", answer: "Home care is $40/hour in 2-hour increments. Requests marked ASAP may include a rush surcharge; the full total and taxes are shown before you submit." },
    ],
  },
  "psw-after-surgery": {
    slug: "psw-after-surgery",
    title: "PSW After Surgery | Post-Surgery Home Care Ontario | PSW Direct",
    description: "Need a PSW after surgery in Ontario? Vetted personal support workers provide post-surgery home care — mobility help, wound care support, meals, and daily assistance from $40/hr.",
    headline: "Post-Surgery Home Care with a Personal Support Worker",
    subheadline: "Recovering from surgery requires professional support. PSW Direct provides vetted personal support workers who assist with mobility, personal care, medication reminders, and daily living during your recovery.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "PSW After Surgery", url: "/psw-after-surgery" },
    ],
    faqs: [
      { question: "What can a PSW help with after surgery?", answer: "A PSW assists with mobility (getting in/out of bed, walking), personal hygiene, meal preparation, medication reminders, light housekeeping, and companionship during recovery." },
      { question: "How soon after surgery can I book a PSW?", answer: "You can book before surgery so care is ready when you return home. Short-notice post-surgery requests can be submitted but are not guaranteed." },
      { question: "Do I need a doctor's referral?", answer: "No referral needed. PSW Direct is a private-pay service. Book directly online — select your surgery recovery needs and a vetted PSW will be matched to you." },
    ],
  },
  "hospital-discharge-care-ontario": {
    slug: "hospital-discharge-care-ontario",
    title: "Hospital Discharge Care Ontario | Post-Hospital PSW | PSW Direct",
    description: "Hospital discharge care across Ontario. Vetted PSWs help with pickup from hospital and daily non-clinical support at home. $50/hour plus applicable HST; timing confirmed when a caregiver accepts.",
    headline: "Hospital Discharge Care Across Ontario",
    subheadline: "Transitioning from hospital to home safely requires professional support. PSW Direct provides vetted personal support workers across Ontario for hospital pickup and non-clinical daily support at home. Same-day timing is not guaranteed.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Hospital Discharge Care", url: "/hospital-discharge-care-ontario" },
    ],
    faqs: [
      { question: "What is hospital discharge care?", answer: "Hospital discharge care includes transport home from hospital, help following discharge instructions, medication management, personal care, meal preparation, and ongoing recovery support at home." },
      { question: "Is hospital discharge care available across Ontario?", answer: "PSW Direct serves Ontario only. Coverage for your exact address and caregiver acceptance are confirmed during booking." },
      { question: "Can I book discharge care for the same day?", answer: "Same-day care is not guaranteed; a visit is confirmed only when a suitable caregiver accepts the request." },
    ],
  },
};

export const HomeCareAfterDischargePage = () => <HighConvertLandingPage config={configs["home-care-after-hospital-discharge"]} />;
export const UrgentCaregiverPage = () => <HighConvertLandingPage config={configs["urgent-caregiver-services"]} />;
export const PSWAfterSurgeryPage = () => <HighConvertLandingPage config={configs["psw-after-surgery"]} />;
export const HospitalDischargeCareOntarioPage = () => <HighConvertLandingPage config={configs["hospital-discharge-care-ontario"]} />;

import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const configs: Record<string, HighConvertPageConfig> = {
  "help-for-elderly-parents-at-home": {
    slug: "help-for-elderly-parents-at-home",
    title: "Help for Elderly Parents at Home | In-Home Senior Care | PSW Direct",
    description: "Get help for your elderly parents at home in Ontario. Vetted personal support workers provide bathing, meals, companionship, and daily living assistance from $35/hr.",
    headline: "Help for Your Elderly Parents — Right at Home",
    subheadline: "You shouldn't have to choose between your life and your parents' safety. PSW Direct connects you with vetted caregivers who provide compassionate, professional support so your parents can age comfortably at home.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Help for Elderly Parents", url: "/help-for-elderly-parents-at-home" },
    ],
    faqs: [
      { question: "How can I get help for my elderly parent at home?", answer: "Book a personal support worker through PSW Direct. Our vetted PSWs assist with bathing, meals, medication reminders, companionship, and mobility — all in your parent's home." },
      { question: "Is it safe to have a caregiver come to my parent's home?", answer: "Yes. Every PSW on our platform is credential-verified, police background-checked, and reviewed before activation. Your parent's safety is our top priority." },
      { question: "How much does elderly home care cost?", answer: "Care starts at $35/hr with PSW Direct — significantly less than agency rates of $55+/hr. No contracts, no hidden fees. Pay only for the hours you need." },
    ],
  },
  "care-for-aging-parents": {
    slug: "care-for-aging-parents",
    title: "Care for Aging Parents | Senior Home Care Ontario | PSW Direct",
    description: "Professional care for aging parents in Ontario. Vetted PSWs provide personal care, companionship, and daily living support in your parent's home. From $35/hr.",
    headline: "Compassionate Care for Your Aging Parents",
    subheadline: "When your parents need more support than you can give alone, PSW Direct is here. Our vetted personal support workers provide dignified, professional care — so your family can focus on being family.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Care for Aging Parents", url: "/care-for-aging-parents" },
    ],
    faqs: [
      { question: "What kind of care can a PSW provide for my aging parent?", answer: "PSWs assist with bathing, dressing, grooming, meal preparation, medication reminders, companionship, light housekeeping, mobility support, and transportation to appointments." },
      { question: "Can I book care for just a few hours a week?", answer: "Yes. PSW Direct offers fully flexible scheduling. Book as little as a few hours per week or arrange daily care — no minimum commitment required." },
      { question: "How do I know the caregiver is trustworthy?", answer: "Every PSW is credential-verified with a valid PSW certificate, government ID, and recent police background check. We maintain Ontario's highest vetting standards." },
    ],
  },
  "help-with-elderly-parent-daily-care": {
    slug: "help-with-elderly-parent-daily-care",
    title: "Daily Care Help for Elderly Parents | PSW Direct Ontario",
    description: "Get daily care help for your elderly parent in Ontario. Personal support workers assist with bathing, meals, medication, and companionship. Book same-day from $35/hr.",
    headline: "Daily Care Help for Your Elderly Parent",
    subheadline: "From morning routines to evening companionship, PSW Direct provides reliable daily care for your parent. Vetted PSWs handle bathing, meals, medication reminders, and everything in between.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Daily Care for Elderly", url: "/help-with-elderly-parent-daily-care" },
    ],
    faqs: [
      { question: "What does daily care for an elderly parent include?", answer: "Daily care includes assistance with morning and evening routines, bathing, dressing, meal preparation, medication reminders, companionship, and mobility support." },
      { question: "Can the same PSW come every day?", answer: "While we can't guarantee the same PSW every visit, many clients are matched with consistent caregivers. Our system prioritizes continuity of care whenever possible." },
      { question: "How quickly can daily care start?", answer: "PSW Direct offers same-day availability. Book online and a vetted PSW can begin care within hours in most Ontario communities." },
    ],
  },
  "support-for-seniors-at-home": {
    slug: "support-for-seniors-at-home",
    title: "Support for Seniors at Home | In-Home Senior Care | PSW Direct",
    description: "In-home support for seniors across Ontario. Vetted personal support workers provide companionship, personal care, and daily living assistance. From $35/hr, no contracts.",
    headline: "In-Home Support for Seniors Across Ontario",
    subheadline: "Help your loved one live independently at home with professional support. PSW Direct provides vetted caregivers for companionship, personal care, meals, and mobility assistance.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Support for Seniors", url: "/support-for-seniors-at-home" },
    ],
    faqs: [
      { question: "What support services are available for seniors at home?", answer: "PSW Direct offers personal care, companionship, meal preparation, medication reminders, mobility assistance, doctor escorts, and post-hospital discharge support." },
      { question: "Is home support covered by insurance?", answer: "Many private insurance plans and Veterans Affairs Canada (VAC) cover home care services. PSW Direct supports insurance claims and third-party billing during booking." },
      { question: "How is this different from a retirement home?", answer: "Home support allows seniors to remain in their own home with personalized one-on-one care. It's often more affordable and preferred by families who want their loved ones in familiar surroundings." },
    ],
  },
  "care-for-elderly-after-hospital": {
    slug: "care-for-elderly-after-hospital",
    title: "Care for Elderly After Hospital | Post-Discharge Care | PSW Direct",
    description: "Post-hospital care for elderly parents in Ontario. Vetted PSWs provide discharge support, recovery assistance, and daily care at home. Book same-day from $35/hr.",
    headline: "Care for Your Elderly Parent After Hospital",
    subheadline: "Hospital discharge can be overwhelming. PSW Direct provides immediate post-hospital care — helping your parent recover safely at home with a vetted personal support worker by their side.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Post-Hospital Care", url: "/care-for-elderly-after-hospital" },
    ],
    faqs: [
      { question: "What care is available after hospital discharge?", answer: "PSW Direct provides transport home from hospital, assistance with discharge instructions, medication management, wound care support, mobility assistance, meal preparation, and ongoing recovery support." },
      { question: "How soon after discharge can care begin?", answer: "Immediately. PSW Direct offers same-day booking. Many families arrange care before discharge so a PSW is ready when their parent leaves the hospital." },
      { question: "How long will my parent need post-hospital care?", answer: "Recovery timelines vary. PSW Direct is contract-free, so you can book care for as long as needed — from a few days to ongoing support — and adjust anytime." },
    ],
  },
};

export const HelpForElderlyParentsPage = () => <HighConvertLandingPage config={configs["help-for-elderly-parents-at-home"]} />;
export const CareForAgingParentsPage = () => <HighConvertLandingPage config={configs["care-for-aging-parents"]} />;
export const DailyCareElderlyPage = () => <HighConvertLandingPage config={configs["help-with-elderly-parent-daily-care"]} />;
export const SupportForSeniorsPage = () => <HighConvertLandingPage config={configs["support-for-seniors-at-home"]} />;
export const CareAfterHospitalPage = () => <HighConvertLandingPage config={configs["care-for-elderly-after-hospital"]} />;

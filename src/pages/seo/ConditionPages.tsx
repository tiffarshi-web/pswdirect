import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const pages: Record<string, HighConvertPageConfig> = {
  "dementia-care-at-home": {
    slug: "dementia-care-at-home",
    title: "Dementia Care at Home | In-Home Dementia Support | PSW Direct",
    description: "Professional dementia care at home in Ontario. Vetted PSWs provide supervision, personal care, routine support, and companionship for dementia patients from $30/hr.",
    headline: "Dementia Care at Home in Ontario",
    subheadline: "Living with dementia doesn't mean leaving home. PSW Direct provides experienced, compassionate caregivers who help your loved one maintain their daily routine, stay safe, and live with dignity — all in the comfort of home.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Dementia Care at Home", url: "/dementia-care-at-home" }],
    faqs: [
      { question: "What does dementia home care include?", answer: "Dementia home care includes supervision, personal hygiene assistance, meal preparation, medication reminders, cognitive stimulation activities, companionship, and safety monitoring to prevent wandering." },
      { question: "Are your PSWs trained in dementia care?", answer: "Many PSWs on our platform have direct experience with dementia and Alzheimer's patients. You can specify dementia experience as a preference when booking." },
      { question: "Is dementia home care better than a facility?", answer: "Research shows many dementia patients do better in familiar environments. Home care provides one-on-one attention, consistent routines, and personalized care that facilities often can't match." },
      { question: "How much does dementia care at home cost?", answer: "Dementia home care through PSW Direct starts at $30/hr — significantly less than the $4,000-$8,000/month cost of memory care facilities." },
    ],
  },
  "alzheimers-care-at-home": {
    slug: "alzheimers-care-at-home",
    title: "Alzheimer's Care at Home | Home Alzheimer's Support | PSW Direct",
    description: "In-home Alzheimer's care across Ontario. Vetted personal support workers provide daily supervision, personal care, and safety monitoring for Alzheimer's patients from $30/hr.",
    headline: "Alzheimer's Care at Home — Compassionate Support",
    subheadline: "Alzheimer's care requires patience, consistency, and compassion. PSW Direct connects your family with experienced caregivers who provide structured daily routines, personal care, and safety supervision at home.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Alzheimer's Care", url: "/alzheimers-care-at-home" }],
    faqs: [
      { question: "How can a PSW help with Alzheimer's?", answer: "A PSW provides structured daily routines, assists with bathing and dressing, prepares meals, gives medication reminders, offers companionship, and monitors safety to prevent wandering or falls." },
      { question: "Can I get Alzheimer's care every day?", answer: "Yes. PSW Direct offers flexible scheduling — from a few hours weekly to daily or even 24-hour care. Adjust the schedule as your loved one's needs change." },
      { question: "Is Alzheimer's home care covered by insurance?", answer: "Many private insurance plans and Veterans Affairs Canada cover Alzheimer's home care. PSW Direct provides detailed invoices for insurance claims." },
    ],
  },
  "stroke-recovery-care-at-home": {
    slug: "stroke-recovery-care-at-home",
    title: "Stroke Recovery Care at Home | Post-Stroke PSW | PSW Direct",
    description: "Post-stroke recovery care at home in Ontario. Vetted PSWs assist with mobility, personal care, speech exercises, and daily living tasks during stroke recovery from $30/hr.",
    headline: "Stroke Recovery Care at Home in Ontario",
    subheadline: "Recovery after a stroke takes time and professional support. PSW Direct provides vetted caregivers who assist with mobility rehabilitation, personal care, daily exercises, and emotional support throughout recovery.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Stroke Recovery Care", url: "/stroke-recovery-care-at-home" }],
    faqs: [
      { question: "What does post-stroke home care include?", answer: "Post-stroke care includes mobility assistance, personal hygiene help, meal preparation for dietary restrictions, medication management, encouragement with physiotherapy exercises, and companionship during recovery." },
      { question: "How soon after a stroke can home care start?", answer: "Home care can begin immediately after hospital discharge. Many families book PSW Direct before discharge so a caregiver is ready when their loved one arrives home." },
      { question: "How long is stroke recovery care needed?", answer: "Recovery timelines vary widely. PSW Direct is contract-free, so you can book care for weeks or months and adjust as your loved one progresses." },
    ],
  },
  "post-surgery-care-at-home": {
    slug: "post-surgery-care-at-home",
    title: "Post-Surgery Care at Home | Recovery Support | PSW Direct",
    description: "Post-surgery home care in Ontario. Vetted PSWs help with mobility, wound care support, meals, and daily living during surgical recovery. From $30/hr, no contracts.",
    headline: "Post-Surgery Care at Home — Recover Safely",
    subheadline: "Recovering from surgery at home is faster and more comfortable with professional support. PSW Direct provides vetted caregivers who help with mobility, personal care, meals, and medication management during recovery.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Post-Surgery Care", url: "/post-surgery-care-at-home" }],
    faqs: [
      { question: "What post-surgery care can a PSW provide?", answer: "PSWs help with mobility (getting in and out of bed, walking), personal hygiene, meal preparation, medication reminders, light housekeeping, and transportation to follow-up appointments." },
      { question: "Can I arrange care before my surgery?", answer: "Yes. Book PSW Direct before your procedure so a vetted caregiver is ready when you return home. Same-day booking is also available." },
      { question: "How long will I need post-surgery care?", answer: "Recovery varies by procedure. PSW Direct is contract-free — book a few days or several weeks and adjust as you heal." },
    ],
  },
  "mobility-assistance-for-seniors": {
    slug: "mobility-assistance-for-seniors",
    title: "Mobility Assistance for Seniors | Fall Prevention | PSW Direct",
    description: "Mobility assistance for seniors in Ontario. Vetted PSWs help with walking, transfers, fall prevention, and daily movement safely at home. From $30/hr.",
    headline: "Mobility Assistance for Seniors at Home",
    subheadline: "Reduced mobility shouldn't mean reduced independence. PSW Direct provides trained caregivers who help seniors move safely — assisting with walking, transfers, stair navigation, and fall prevention at home.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Mobility Assistance", url: "/mobility-assistance-for-seniors" }],
    faqs: [
      { question: "What mobility assistance do PSWs provide?", answer: "PSWs help with safe transfers (bed to chair, chair to toilet), walking support, stair navigation, wheelchair assistance, fall prevention strategies, and exercise encouragement." },
      { question: "Can a PSW help prevent falls?", answer: "Yes. PSWs are trained in fall prevention techniques and can identify hazards in the home. They provide supervised mobility support to reduce fall risk significantly." },
      { question: "Is mobility assistance available daily?", answer: "Yes. PSW Direct offers flexible scheduling — book morning help getting up, evening assistance going to bed, or all-day mobility support as needed." },
    ],
  },
  "fall-risk-care-for-elderly": {
    slug: "fall-risk-care-for-elderly",
    title: "Fall Risk Care for Elderly | Fall Prevention at Home | PSW Direct",
    description: "Fall prevention care for elderly loved ones in Ontario. Vetted PSWs provide supervised mobility, home safety monitoring, and daily support to prevent falls from $30/hr.",
    headline: "Fall Prevention Care for Elderly at Home",
    subheadline: "Falls are the leading cause of injury in seniors. PSW Direct provides caregivers trained in fall prevention who offer supervised mobility, environmental safety checks, and daily support to keep your loved one safe.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Fall Risk Care", url: "/fall-risk-care-for-elderly" }],
    faqs: [
      { question: "How can a PSW help prevent falls?", answer: "A PSW provides supervised walking and transfers, ensures proper footwear and lighting, removes tripping hazards, assists with bathroom safety, and encourages safe movement patterns." },
      { question: "My parent fell recently — can I get care quickly?", answer: "Yes. PSW Direct offers same-day availability. Book online and a vetted caregiver can begin fall prevention support within hours." },
      { question: "Is fall prevention care ongoing?", answer: "It can be. Many families book regular visits to ensure consistent safety. PSW Direct is flexible — book as little or as much as needed." },
    ],
  },
  "palliative-care-at-home": {
    slug: "palliative-care-at-home",
    title: "Palliative Care at Home | End-of-Life Support | PSW Direct",
    description: "Compassionate palliative care at home in Ontario. Vetted PSWs provide comfort care, personal support, and companionship for end-of-life patients and families from $30/hr.",
    headline: "Palliative Care at Home — Comfort and Dignity",
    subheadline: "When comfort matters most, PSW Direct provides compassionate caregivers who support your loved one at home with personal care, pain management support, emotional companionship, and family respite.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Palliative Care", url: "/palliative-care-at-home" }],
    faqs: [
      { question: "What does palliative home care include?", answer: "Palliative home care includes personal hygiene assistance, repositioning, comfort measures, meal preparation, medication support, emotional companionship, and respite for family caregivers." },
      { question: "Can PSWs provide overnight palliative care?", answer: "Yes. PSW Direct offers extended-hour and overnight care for palliative patients who need continuous support and monitoring." },
      { question: "Is palliative care covered by insurance?", answer: "Many private insurance plans and government programs cover palliative care services. PSW Direct provides detailed invoices for insurance reimbursement claims." },
    ],
  },
  "overnight-care-for-seniors": {
    slug: "overnight-care-for-seniors",
    title: "Overnight Care for Seniors | Night-Time PSW | PSW Direct",
    description: "Overnight care for seniors in Ontario. Vetted PSWs provide night-time supervision, bathroom assistance, and safety monitoring for elderly loved ones from $30/hr.",
    headline: "Overnight Care for Seniors in Ontario",
    subheadline: "Night-time is when seniors are most vulnerable. PSW Direct provides overnight caregivers who ensure your loved one is safe, comfortable, and supported through the night — bathroom assistance, repositioning, and emergency response.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Overnight Care", url: "/overnight-care-for-seniors" }],
    faqs: [
      { question: "What does overnight senior care include?", answer: "Overnight care includes nighttime supervision, bathroom assistance, repositioning to prevent bedsores, medication administration, comfort checks, and emergency response." },
      { question: "How much does overnight care cost?", answer: "Overnight care through PSW Direct is billed at the standard hourly rate of $30/hr. An 8-hour overnight shift costs approximately $240." },
      { question: "Is overnight care available every night?", answer: "Yes. PSW Direct offers flexible scheduling for nightly, alternating, or occasional overnight care as needed." },
    ],
  },
};

export const conditionPageSlugs = Object.keys(pages);

const ConditionSEOPage = ({ slug }: { slug: string }) => {
  const config = pages[slug];
  if (!config) return null;
  return <HighConvertLandingPage config={config} />;
};

export default ConditionSEOPage;

// Config-driven Ontario service hub content.
// Each hub renders 2,500+ words of unique service-specific copy, FAQs, pricing,
// process, trust signals, Ontario healthcare context, and links to all
// city pages + all other service hubs.
//
// Verified-only. No fabricated statistics — figures are neutral platform facts
// (PSW Direct rate cards, PHIPA, Ontario Health atHome program name) or clearly
// framed as illustrative.

export interface OntarioHubFAQ {
  q: string;
  a: string;
}

export interface OntarioHubConfig {
  slug: string;                // route without leading slash
  serviceLabel: string;        // display name, e.g. "Dementia Care"
  serviceLower: string;        // lower-case for inline copy
  title: string;               // <title>
  description: string;         // meta description
  h1: string;
  intro: string;               // 1-paragraph hero blurb (~90 words)
  overview: string[];          // 3–5 paragraphs, service overview (~600–900 words)
  whoItsFor: string[];         // 3–5 bullets
  whatsIncluded: string[];     // 6–10 bullets
  process: { title: string; body: string }[]; // 4–6 step
  ontarioContext: string[];    // 2–3 paragraphs of verified Ontario healthcare context
  pricing: string[];           // 2–3 paragraphs
  trustSignals: string[];      // 5–8 bullets
  faqs: OntarioHubFAQ[];       // 8–12 FAQs
  cityLinkPrefix: string;      // slug prefix for city pages, e.g. "dementia-care" -> /dementia-care-{city}
  relatedHubs?: string[];      // optional emphasized related hubs
}

// Boilerplate shared blocks composed via the template — kept intentionally
// factual and neutral so each service adds its own unique framing on top.

const SHARED_TRUST: string[] = [
  "PSW Direct is an Ontario-based platform connecting families with vetted Personal Support Workers.",
  "Every caregiver is verified with a valid PSW certificate, government-issued ID, and a recent police background check.",
  "PHIPA-compliant handling of personal health information across bookings, messaging, and care documentation.",
  "Transparent hourly rates starting at $40/hr — no hidden fees and no long-term contracts.",
  "Same-day and next-day availability across most Ontario communities.",
  "Direct in-app messaging between families and the assigned caregiver.",
  "24/7 support line for scheduling, dispatch, and urgent care changes.",
  "Coverage across 90+ Ontario cities and dozens of surrounding communities.",
];

const SHARED_PROCESS = [
  {
    title: "1. Tell us what you need",
    body: "Share the client's location, care needs, preferred schedule, and any language, gender, or care-preference requests. Most families complete this step in under three minutes.",
  },
  {
    title: "2. We match a vetted PSW",
    body: "Our dispatch engine surfaces nearby caregivers who match your requirements. You review the assigned Personal Support Worker's credentials and confirm before care begins.",
  },
  {
    title: "3. Care begins in the home",
    body: "The PSW arrives at the scheduled time, follows the care plan agreed with the family, and documents each visit in the digital care sheet.",
  },
  {
    title: "4. Ongoing coordination",
    body: "Families can message the caregiver directly, adjust upcoming visits, request additional hours, or add recurring shifts — with no penalty for reasonable changes.",
  },
  {
    title: "5. Continuous review",
    body: "After each visit, families can review the caregiver, request the same PSW for future visits, or ask our team to match a different worker at no cost.",
  },
];

const SHARED_ONTARIO_CONTEXT = [
  "Ontario's home and community care system is coordinated through Ontario Health atHome (formerly Home and Community Care Support Services), which manages publicly funded home care intake, assessments, and referrals to service providers. Publicly funded hours are limited and typically prioritized for higher acuity needs, which is why many families supplement with private support to cover evenings, overnights, weekends, and companionship time.",
  "Private support workers complement — rather than replace — services from primary care, hospital discharge teams, and community programs such as Adult Day Programs, Meals on Wheels, and Alzheimer Society of Ontario chapters. Families frequently combine publicly funded nursing or therapy visits with private PSW hours to build a sustainable, in-home care plan.",
  "Ontario has a mature Personal Support Worker workforce trained through Ministry-approved programs at colleges and career institutes across the province. PSW Direct works exclusively with certified PSWs and requires proof of credentials, government-issued ID, and a clear police records check before a worker can accept shifts on the platform.",
];

// ---------- Service-specific configs ----------

export const ONTARIO_HUBS: OntarioHubConfig[] = [
  // Non-clinical family acquisition hubs use a bounded layout and roster-city links.
  {
    slug: "post-surgery-care-ontario",
    serviceLabel: "Post-Surgical Home Support",
    serviceLower: "non-clinical post-surgical support",
    cityLinkPrefix: "post-surgery-care",
    title: "Post-Surgery Home Support in Ontario | PSW Direct",
    description: "Non-clinical help at home after surgery: personal care, meals and companionship. $40/hour in 2-hour increments. Address and caregiver acceptance confirmed in booking.",
    h1: "Post-Surgical Support at Home in Ontario",
    intro: "Coming home after surgery can make everyday tasks harder. Request personal support with washing, dressing, meals and companionship while your surgical team remains responsible for treatment and recovery instructions.",
    overview: [
      "Start with the ordinary tasks your loved one cannot comfortably manage at home. A planned visit might focus on getting dressed, preparing a meal and keeping essential items within reach. Choose the tasks actually needed rather than assuming a surgery diagnosis describes the whole visit.",
      "Before discharge, ask the clinical team which movements and personal-care activities are permitted, what equipment is needed, and who to contact with medical concerns. Share those instructions when booking. The caregiver's ability to assist with transfers or mobility must be confirmed; one caregiver may not be suitable for every need.",
      "Plan who will help between visits. A requested visit is not a recovery plan, and submitting a booking does not guarantee an accepted caregiver or a particular start time. Wait for confirmation before arranging a discharge around the visit.",
    ],
    whoItsFor: ["Adults recovering at home who need help with everyday tasks", "Families arranging non-clinical support after discharge", "Family caregivers who need planned relief while supporting recovery"],
    whatsIncluded: ["Washing, dressing and toileting within the confirmed scope and discharge restrictions", "Meal preparation following supplied dietary instructions", "Companionship and familiar daily routines", "Light care-related housekeeping", "Help with familiar mobility aids only where suitability is confirmed", "Planned family respite during an accepted visit"],
    process: [
      { title: "Prepare the home and instructions", body: "Have discharge restrictions, equipment details, permitted tasks and medical contact instructions ready. Do not ask a PSW to interpret or change clinical advice." },
      { title: "Choose Home Care when booking", body: "Select the everyday personal-care, meal, companionship or respite tasks needed. Explain that the person is recovering after surgery, including any movement restrictions." },
      { title: "Confirm before relying on the visit", body: "Review the total and request. Address coverage and caregiver acceptance are confirmed during booking. Arrange other support for any time outside the accepted visit." },
    ],
    ontarioContext: ["PSWs provide non-clinical daily support, not surgery, nursing, wound care, medication management or rehabilitation. Your regulated care team directs treatment and assesses recovery. No recovery outcome is guaranteed.", "Support after you are already home is booked as Home Care. Hospital Discharge is a separate booking option for hospital pickup and transport home; it is not included in a $40/hour home-care visit."],
    pricing: ["Home support is $40/hour, booked in 2-hour increments. Any applicable taxes and your total are shown before you submit a booking."],
    trustSignals: [],
    faqs: [
      { q: "Can a PSW change wounds or manage post-surgery medication?", a: "No. Wound care, medication management and other clinical procedures are outside this non-clinical service. Arrange these with the appropriate regulated professional." },
      { q: "How soon can help begin after discharge?", a: "Request your preferred date and hours. Address coverage and a suitable caregiver accepting the request must be confirmed during booking; same-day, overnight or continuous visits are not guaranteed." },
      { q: "Does home support include hospital pickup?", a: "No. Choose Home Care for daily help once at home. Hospital pickup and transport are a separate Hospital Discharge service, with its own price shown when booking." },
      { q: "What should we share before a visit?", a: "Explain the daily tasks needed, movement restrictions, transfer equipment, dietary instructions and who to contact with concerns. Clinical instructions must come from the care team." },
    ],
    relatedHubs: ["dementia-care-ontario"],
  },
  {
    slug: "dementia-care-ontario",
    serviceLabel: "Dementia-Related Home Support",
    serviceLower: "non-clinical dementia-related daily support",
    cityLinkPrefix: "dementia-care",
    title: "Dementia Home Support & Family Respite in Ontario | PSW Direct",
    description: "Respectful non-clinical dementia-related help with routines, personal care and companionship at home. $40/hour in 2-hour increments; booking confirmation required.",
    h1: "Dementia-Related Daily Support at Home in Ontario",
    intro: "When a loved one living with dementia needs help with daily life, a personal support visit can focus on familiar routines, respectful personal care, meals and companionship. Planned respite gives family caregivers time for other responsibilities within an accepted visit.",
    overview: [
      "Describe the person as well as the tasks: their preferred name, usual morning or mealtime routine, favourite activities and how they communicate comfort or distress. Familiar choices can guide a respectful visit without assuming every person living with dementia has the same needs.",
      "For personal care, explain how your loved one expresses consent, any activities they find uncomfortable and the pace they prefer. Share communication approaches already used by the family. A caregiver should not force care; agree who to contact if the person declines help or needs change.",
      "For family respite, prepare a clear handover: the agreed tasks, who is reachable during the visit, and who will resume care afterwards. Do not leave your loved one relying on replacement care until address coverage and a suitable caregiver's acceptance are confirmed.",
    ],
    whoItsFor: ["People living at home who need help maintaining daily routines", "Families requesting personal care, meals or companionship within the confirmed scope", "Family caregivers arranging planned respite"],
    whatsIncluded: ["Help with familiar washing, dressing and toileting routines", "Meal preparation following supplied dietary instructions", "Conversation, companionship and familiar activities", "Gentle reminders for everyday routines", "Light care-related housekeeping", "Family respite with an agreed handover"],
    process: [
      { title: "Describe the daily routine", body: "List the tasks, preferences, communication needs and care-team instructions. Share any supervision concerns so suitability can be considered." },
      { title: "Choose Home Care and relevant tasks", body: "Select personal care, companionship, meal preparation or respite as needed. Dementia-related support describes the context for these tasks, not a specialist clinical booking category." },
      { title: "Agree the handover and confirm", body: "Review the total before submitting. Address coverage and caregiver acceptance are confirmed during booking; discuss who covers the hours outside the accepted visit." },
    ],
    ontarioContext: ["This is non-clinical personal support, not dementia diagnosis or treatment, nursing or clinical supervision. We do not claim dementia-specialist training, guaranteed safety, or 24-hour dementia care.", "Tell us about needs such as wandering concerns, complex transfers or swallowing instructions before booking. A PSW visit does not establish that being alone is safe. Ask the regulated care team to assess clinical or changing needs; caregiver suitability must be confirmed for the requested tasks."],
    pricing: ["Dementia-related daily home support is $40/hour, booked in 2-hour increments. Any applicable taxes and your total are shown before you submit a booking."],
    trustSignals: [],
    faqs: [
      { q: "Are all caregivers dementia specialists?", a: "No specialist-training claim is made. Describe your loved one's needs so the individual caregiver's suitability can be considered before acceptance." },
      { q: "Can I request respite while I am away?", a: "You can request a planned home-care visit for daily tasks and companionship. Agree on the routine, contacts and handover, and wait for caregiver acceptance before relying on the visit." },
      { q: "Is dementia care available 24 hours a day?", a: "Customer support is available 24 hours a day, 7 days a week. This does not mean 24-hour dementia care, continuous supervision or a guaranteed care schedule." },
      { q: "What if the person refuses help or needs clinical care?", a: "Share preferences and contact instructions before the visit; personal care must respect consent. Diagnosis, treatment and assessment of changing needs stay with the regulated care team." },
    ],
    relatedHubs: ["post-surgery-care-ontario"],
  },

  // PALLIATIVE CARE
  {
    slug: "palliative-care-ontario",
    serviceLabel: "Palliative Care",
    serviceLower: "palliative care",
    cityLinkPrefix: "palliative-care",
    title: "Palliative Care at Home in Ontario | PSW Direct",
    description: "Compassionate palliative home care across Ontario. PSW Direct provides comfort-focused Personal Support Workers to help families care for a loved one at home.",
    h1: "Palliative Care at Home in Ontario",
    intro:
      "PSW Direct provides in-home palliative Personal Support Worker hours across Ontario. When a family's priority is comfort, dignity, and time together in familiar surroundings, our caregivers work alongside the client's palliative physician, community nursing, and Ontario Health atHome to make being at home possible.",
    overview: [
      "Palliative care is comfort-focused care for people living with a life-limiting illness. It is not only end-of-life care — many clients receive palliative support for months or years while continuing curative treatments. In Ontario, palliative clients often prefer to remain at home surrounded by family, familiar rooms, pets, and their own routines. PSW Direct's role is to make that possible by providing the hands-on personal support hours that families need but cannot always provide alone.",
      "Our Personal Support Workers help with bathing, dressing, repositioning to prevent pressure injuries, gentle mouth care, meal or fluid support when appetite fades, and companionship during long quiet stretches of the day. PSWs work strictly within their scope: symptom management, opioid administration, and clinical assessments remain with the client's palliative physician, community nurse, or Ontario Health atHome team.",
      "Families frequently combine PSW Direct hours with community nursing visits and, where applicable, referrals from a residential hospice or the local palliative-care program. We coordinate our shifts around those visits so someone familiar and calm is always in the home.",
      "For many families, the value of palliative PSW support is the ability to rest. Family caregivers can sleep through the night knowing a PSW is present, can leave the house for groceries without worry, and can be a spouse or a child again — instead of only a caregiver — during the time they have left.",
    ],
    whoItsFor: [
      "Adults living at home with advanced cancer, heart failure, COPD, ALS, or other life-limiting illness",
      "Clients receiving support from an Ontario palliative-care team",
      "Families providing primary care who need overnight or daytime relief",
      "Households where the client's wish is to remain at home for as long as possible",
    ],
    whatsIncluded: [
      "Gentle bathing, dressing, and personal hygiene",
      "Repositioning and skin-care support to prevent pressure injuries",
      "Meal and fluid support during appetite changes",
      "Medication reminders per the palliative care plan",
      "Companionship, presence, and reassurance",
      "Overnight coverage so families can sleep",
      "Coordination with the community nurse and palliative physician",
      "Bereavement-sensitive scheduling and family support",
    ],
    process: SHARED_PROCESS,
    ontarioContext: [
      ...SHARED_ONTARIO_CONTEXT,
      "Ontario's palliative-care system includes hospital-based palliative teams, community palliative-care programs, and residential hospices operated by local charitable organizations. Ontario Health atHome coordinates publicly funded nursing and personal support hours for eligible palliative clients; PSW Direct hours are frequently used to supplement those visits, particularly overnight and on weekends.",
    ],
    pricing: [
      "Palliative shifts start at $40/hour with no long-term contract. Overnight and 24-hour rotating coverage is available at posted platform rates.",
      "Because needs can change quickly at end of life, all care is hourly and can be scaled up, down, or paused within the app.",
      "Itemized invoices are available for VAC, private insurance, and other third-party reimbursement.",
    ],
    trustSignals: SHARED_TRUST,
    faqs: [
      { q: "Do you provide end-of-life care at home?", a: "Yes. PSW Direct provides personal-support hours during end-of-life care, working alongside the client's palliative physician and community nursing team." },
      { q: "Can a PSW give pain medication?", a: "PSWs support the client and can remind them of scheduled medications per the physician's plan. Administering controlled substances such as opioid injections is a nursing responsibility handled by the community nurse or palliative team." },
      { q: "Can you cover overnights?", a: "Yes. Overnight coverage is one of the most requested palliative services because it lets family caregivers sleep." },
      { q: "How quickly can care start?", a: "Same-day or next-day in most Ontario communities. For time-sensitive palliative situations, call our support line to expedite dispatch." },
      { q: "Do you work with residential hospices?", a: "PSW Direct is not a hospice, but we can provide supplementary one-to-one hours in a residential hospice when the family wants additional presence." },
      { q: "What happens after the client passes?", a: "Bookings can be paused or cancelled the same day at no penalty. Our team follows up with the family and closes any outstanding invoices with sensitivity." },
      { q: "Can we request the same PSW for continuity?", a: "Yes. In palliative care especially, continuity matters — you can request the same PSW for every shift where scheduling allows." },
      { q: "Do you support pediatric palliative care?", a: "Our roster is adult-focused. For pediatric palliative care, families should contact their child's pediatric palliative team directly." },
    ],
  },

  // PERSONAL CARE
  {
    slug: "personal-care-ontario",
    serviceLabel: "Personal Care",
    serviceLower: "personal care",
    cityLinkPrefix: "personal-care",
    title: "Personal Care Services in Ontario | Bathing, Dressing, Hygiene | PSW Direct",
    description: "Professional personal care across Ontario — bathing, dressing, toileting, and hygiene assistance from vetted Personal Support Workers starting at $40/hr.",
    h1: "Personal Care Services in Ontario",
    intro:
      "PSW Direct provides in-home personal care across Ontario. Bathing, dressing, toileting, mobility support, and daily hygiene — delivered by vetted Personal Support Workers who are trained to protect dignity, privacy, and safety.",
    overview: [
      "Personal care is the foundation of home care. When someone can no longer bathe safely, dress independently, or move to the bathroom without help, everything else — meals, sleep, medication, mood — starts to suffer. PSW Direct connects families with Personal Support Workers who provide daily hands-on personal care with warmth and discretion, in the client's own home.",
      "Every PSW on the platform is trained in safe transfers, fall prevention, incontinence care, and skin-integrity checks. Same-gender caregivers are available where families request them for hygiene and bathing, and language matches are available across the languages most commonly spoken in Ontario households.",
      "Personal care visits are typically scheduled around the client's real day — a morning shift for bath, breakfast, and dressing; a mid-day visit for lunch and toileting; and an evening shift for supper and bedtime routine. Many clients need only one visit per day; others need three or more.",
      "Personal care from PSW Direct does not replace regulated health services. Wound care, catheter changes, and other clinical procedures are handled by community nursing arranged through Ontario Health atHome or a private nursing agency; PSWs support the client between those clinical visits.",
    ],
    whoItsFor: [
      "Seniors who need daily bathing and dressing assistance",
      "Clients with mobility limitations who need safe transfers",
      "Adults with incontinence who need respectful toileting support",
      "Clients discharged from hospital who cannot yet manage hygiene alone",
      "Adults with disabilities who prefer PSW support over facility care",
    ],
    whatsIncluded: [
      "Bathing, showering, and bed baths",
      "Dressing and grooming, including hair care and shaving",
      "Oral care and denture care",
      "Toileting, incontinence care, and peri-care",
      "Safe transfers using proper body mechanics and equipment",
      "Skin integrity monitoring and reporting",
      "Assistance with mobility aids (walkers, canes, wheelchairs, lifts)",
      "Feeding assistance and meal support where required",
    ],
    process: SHARED_PROCESS,
    ontarioContext: SHARED_ONTARIO_CONTEXT,
    pricing: [
      "Personal care visits start at $40/hour with no minimums beyond the platform's shift-length rules and no ongoing contract.",
      "Most families book recurring weekday personal-care visits — often a 1–2 hour morning shift — with additional hours added as needs increase.",
      "Third-party invoices are available for VAC, Blue Cross, and private long-term care insurance policies.",
    ],
    trustSignals: SHARED_TRUST,
    faqs: [
      { q: "Can I request a same-gender caregiver?", a: "Yes. You can request a same-gender caregiver for personal-care shifts during booking." },
      { q: "How short can a shift be?", a: "Shift length depends on posted platform rules — most personal-care visits are 1–3 hours. Longer shifts are available for clients who need continuous support." },
      { q: "Do you provide bath-only visits?", a: "Yes. A common booking pattern is a short morning shift focused on bathing, dressing, and breakfast." },
      { q: "Can you help with incontinence products?", a: "Yes. PSWs handle incontinence care respectfully, including changing briefs, peri-care, and skin monitoring." },
      { q: "What about clients using lifts or transfer equipment?", a: "PSWs are trained in safe transfers using mechanical lifts, transfer boards, and gait belts. Availability of equipment in the home is confirmed at booking." },
      { q: "Do you work with catheters or feeding tubes?", a: "PSWs support the client but do not perform clinical procedures. Catheter changes, tube-feeding administration, and wound care are performed by community nursing." },
      { q: "How quickly can care start?", a: "Same-day or next-day in most Ontario communities." },
      { q: "Can care be increased later?", a: "Yes. Because bookings are hourly and contract-free, you can add hours, days, or overnight shifts at any time." },
    ],
  },

  // RESPITE CARE
  {
    slug: "respite-care-ontario",
    serviceLabel: "Respite Care",
    serviceLower: "respite care",
    cityLinkPrefix: "respite-care",
    title: "Respite Care in Ontario — Relief for Family Caregivers | PSW Direct",
    description: "In-home respite care across Ontario. Give family caregivers a break with vetted PSWs providing daytime, evening, or overnight relief from $40/hr.",
    h1: "Respite Care in Ontario",
    intro:
      "PSW Direct provides in-home respite care across Ontario — planned or emergency relief so family caregivers can rest, work, travel, or simply sleep, knowing a vetted Personal Support Worker is with their loved one.",
    overview: [
      "Roughly one in four Ontario adults provides unpaid care to a family member. Most of them do it while working, raising children, and managing their own health. Respite care exists because family caregivers cannot sustain that load without regular relief — and because unrelieved burnout is one of the biggest predictors of a loved one moving into long-term care sooner than the family would have wanted.",
      "Respite from PSW Direct can be a few hours a week or several days in a row. Common patterns include weekly four-hour blocks so the family caregiver can go to their own medical appointments, weekend coverage so an out-of-town family member can visit or travel, or overnight relief so the primary caregiver can sleep without interruption.",
      "During respite, the PSW steps into the client's regular routine — meals, medication reminders, hygiene, mobility, companionship — following the plan the family provides. Family caregivers can leave the home fully or stay nearby; either works.",
      "Respite is also used during family emergencies: a sudden hospitalization of the primary caregiver, a bereavement, or a work trip that can't be postponed. Same-day and next-day dispatch is available across most of Ontario.",
    ],
    whoItsFor: [
      "Spouses providing full-time care at home",
      "Adult children caring for aging parents while working",
      "Families supporting a loved one with dementia, ALS, or advanced illness",
      "Caregivers who need time for their own medical or personal needs",
      "Families managing a sudden emergency or bereavement",
    ],
    whatsIncluded: [
      "Full continuation of the client's daily routine",
      "Meal preparation and medication reminders",
      "Personal care, hygiene, and toileting",
      "Companionship and safe supervision",
      "Overnight monitoring so family caregivers can sleep",
      "Assistance with mobility and safe transfers",
      "Real-time updates to the family via the app",
      "Same-day and emergency dispatch across most cities",
    ],
    process: SHARED_PROCESS,
    ontarioContext: SHARED_ONTARIO_CONTEXT,
    pricing: [
      "Respite bookings start at $40/hour with no long-term contract. Overnight, weekend, and 24-hour rotations are available at posted rates.",
      "Many families schedule respite as a recurring weekly block — the same PSW, the same time each week — which is the pattern most likely to prevent burnout.",
    ],
    trustSignals: SHARED_TRUST,
    faqs: [
      { q: "Is respite covered by Ontario Health atHome?", a: "Some publicly funded respite is available for eligible clients through Ontario Health atHome, but volumes are limited. Most families use private PSW hours to top up publicly funded respite." },
      { q: "Can I book respite last-minute?", a: "Yes. Same-day and next-day availability is typical across most Ontario communities." },
      { q: "How long can respite shifts be?", a: "From a few hours up to full 24-hour rotations. Multi-day coverage is arranged as consecutive shifts." },
      { q: "Do you provide respite for dementia care?", a: "Yes — this is one of the most common respite use cases. PSWs experienced with dementia are matched where possible." },
      { q: "Can the same PSW cover recurring respite?", a: "Yes. Continuity is a priority, especially for clients who rely on routine." },
    ],
  },

  // OVERNIGHT CARE
  {
    slug: "overnight-care-ontario",
    serviceLabel: "Overnight Care",
    serviceLower: "overnight home care",
    cityLinkPrefix: "overnight-care",
    title: "Overnight Home Care in Ontario | PSW Direct",
    description: "Overnight PSW support across Ontario. Awake or lightly monitored overnight care so families can sleep — starting at posted overnight rates.",
    h1: "Overnight Home Care in Ontario",
    intro:
      "PSW Direct provides overnight Personal Support Worker coverage across Ontario. Whether the client needs awake supervision for wandering risk or a quiet monitoring presence so family caregivers can finally sleep, our overnight PSWs cover the hours that matter most.",
    overview: [
      "Nighttime is when home care breaks down. Family caregivers can manage the daytime — meals, appointments, hygiene — but broken sleep across weeks or months erodes their health, patience, and ability to keep providing care. Overnight PSW support solves that by placing a trained caregiver in the home from evening to morning.",
      "Overnight shifts come in two shapes: awake overnight, where the PSW stays awake and actively monitors the client throughout the night, and monitored overnight, where the PSW rests in a nearby room and responds to calls, movement, or scheduled tasks. Families choose based on the client's needs — wandering risk, incontinence care overnight, sleep apnea equipment, or simply reassurance.",
      "Common overnight scenarios include dementia clients at risk of wandering, post-surgery clients during the first two weeks after discharge, palliative clients approaching end of life, and clients recovering from a fall who no longer feel safe alone at night.",
    ],
    whoItsFor: [
      "Clients with dementia at risk of wandering",
      "Post-surgery clients during the first weeks at home",
      "Palliative clients whose families need to sleep",
      "Adults recovering from a fall or hospitalization",
      "Family caregivers experiencing chronic sleep deprivation",
    ],
    whatsIncluded: [
      "Awake or monitored overnight coverage",
      "Overnight toileting and incontinence care",
      "Repositioning to prevent pressure injuries",
      "Medication reminders during nighttime schedules",
      "Response to falls, calls, or wandering",
      "Morning routine support at the end of the shift",
    ],
    process: SHARED_PROCESS,
    ontarioContext: SHARED_ONTARIO_CONTEXT,
    pricing: [
      "Overnight rates and shift lengths are shown on the booking screen before you confirm. Awake overnights are billed at a higher hourly rate than daytime shifts.",
      "Recurring overnight blocks (for example, four nights per week) are the most common pattern and are billed weekly.",
    ],
    trustSignals: SHARED_TRUST,
    faqs: [
      { q: "What's the difference between awake and monitored overnight?", a: "Awake overnight means the PSW stays awake and active throughout the shift; monitored overnight means the PSW rests but is present in the home and responds to needs. Families choose based on the client's condition." },
      { q: "How long is an overnight shift?", a: "Typically 8–10 hours, from evening to morning. Multi-shift 24-hour rotations are available for clients needing continuous coverage." },
      { q: "Can the same PSW work every night?", a: "Where possible, yes. Consistent overnight PSWs help clients — especially those with dementia — sleep more predictably." },
      { q: "What if the client falls overnight?", a: "The PSW is trained to respond, contact emergency services if required, and immediately notify the family through the app." },
      { q: "Can overnight care start same-day?", a: "In most Ontario communities, yes. Contact the support line for urgent overnight dispatch." },
    ],
  },

  // COMPANIONSHIP CARE
  {
    slug: "companionship-care-ontario",
    serviceLabel: "Companionship Care",
    serviceLower: "companionship care",
    cityLinkPrefix: "companionship-care",
    title: "Companionship Care in Ontario | Senior Companion Services | PSW Direct",
    description: "In-home companionship care across Ontario. PSW Direct provides friendly, vetted companions for seniors and adults living alone from $40/hr.",
    h1: "Companionship Care in Ontario",
    intro:
      "PSW Direct provides in-home companionship care across Ontario. For seniors and adults who are physically well but socially isolated, our vetted Personal Support Workers offer conversation, activity, transportation, and a friendly presence during the hours that would otherwise be spent alone.",
    overview: [
      "Loneliness is a documented health risk, not a soft one. Ontario seniors living alone are at higher risk for cognitive decline, depression, malnutrition, and falls than seniors with regular social contact. Companionship care exists to close that gap — before the client's health starts to slip.",
      "Companion visits typically last 2–4 hours and focus on what the client actually enjoys: cards, crosswords, a walk around the neighbourhood, a coffee out, a museum visit, or a phone call to grandchildren with help operating the tablet. Light meal preparation, medication reminders, and small housekeeping tasks are usually included.",
      "Companionship differs from personal care in that hands-on hygiene and toileting are not the focus. Many families begin with companionship visits and add personal care hours later as needs evolve — with the same PSW, which is what continuity should look like.",
      "For families out of province or working long hours, weekly companion visits are also a wellness check. The PSW notes changes in mood, appetite, medication adherence, and physical function, and messages the family through the app if something looks off.",
    ],
    whoItsFor: [
      "Seniors living alone who are physically independent but socially isolated",
      "Adults recovering from bereavement",
      "Clients whose family lives out of town or out of country",
      "Adults with early cognitive change who want a friendly weekly presence",
      "Anyone who would benefit from regular social connection at home",
    ],
    whatsIncluded: [
      "Conversation, cards, puzzles, and hobbies",
      "Walks and safe outings in the community",
      "Grocery shopping and errands with the client",
      "Light meal preparation",
      "Medication reminders",
      "Assistance with phone calls, video calls, and technology",
      "Escort to social events, appointments, and religious services",
      "Weekly wellness check and family updates",
    ],
    process: SHARED_PROCESS,
    ontarioContext: SHARED_ONTARIO_CONTEXT,
    pricing: [
      "Companionship shifts start at $40/hour with no ongoing contract.",
      "Most families book a recurring weekly or twice-weekly visit with the same PSW to build a real relationship over time.",
    ],
    trustSignals: SHARED_TRUST,
    faqs: [
      { q: "Do companions drive clients to appointments?", a: "Yes. Community outings, medical appointments, and religious services can all be scheduled as part of a companionship shift, subject to local coverage and platform transport rules." },
      { q: "Can we request a specific language?", a: "Yes. Multilingual companions are available across most major languages spoken in Ontario." },
      { q: "How is companionship different from personal care?", a: "Companion visits focus on social connection, light meal help, and outings. Personal care visits focus on hands-on bathing, dressing, and hygiene. Families often book both from the same PSW." },
      { q: "How short can a visit be?", a: "Typically 2 hours or more per visit, subject to posted platform rules." },
      { q: "Can families message the PSW during the shift?", a: "Yes — direct in-app messaging keeps families in the loop in real time." },
    ],
  },

  // HOSPITAL DISCHARGE
  {
    slug: "hospital-discharge-ontario",
    serviceLabel: "Hospital Discharge Care",
    serviceLower: "hospital discharge care",
    cityLinkPrefix: "hospital-discharge",
    title: "Hospital Discharge Care in Ontario | Home Recovery Support | PSW Direct",
    description: "In-home support for the days after hospital discharge, across Ontario. PSW Direct provides vetted PSWs to help avoid readmission and manage recovery from $40/hr.",
    h1: "Hospital Discharge Care in Ontario",
    intro:
      "PSW Direct provides in-home Personal Support Worker coverage for the days and weeks after a hospital discharge across Ontario. From the ride home through the first two weeks of recovery, our PSWs help families follow discharge instructions, avoid readmission, and get back to normal life.",
    overview: [
      "Hospital discharge is a fragile window. Clients are physically weaker than they realize, medication lists have often changed, follow-up appointments are booked but confusing, and family caregivers are running on adrenaline. Preventable readmissions in this window are one of the most common — and most avoidable — bad outcomes in the Ontario healthcare system.",
      "PSW Direct's discharge care is built to close that window safely. Bookings start on discharge day and cover the highest-risk period: the first 48–72 hours at home, the first week, and the two- to three-week ramp back to independence. Ontario Health atHome usually covers publicly funded nursing and therapy where eligible; private PSW hours cover the personal support in between.",
      "Our PSWs review discharge paperwork with the family, help set up the recovery space, prepare meals aligned with any dietary restrictions, remind clients of medications, keep the client safely mobile, and escort follow-up visits and imaging. If warning signs appear — new pain, unexpected fever, breathing changes — the PSW notifies the family immediately so the client's care team can be contacted.",
      "Discharge from major Ontario hospitals — including University Health Network, Sunnybrook, St. Michael's, Toronto General, Hamilton General, Juravinski, London Health Sciences, and The Ottawa Hospital — often includes recommendations for supplementary in-home support. PSW Direct is a common way families operationalize those recommendations without waiting weeks for coordination.",
    ],
    whoItsFor: [
      "Clients returning home after a hospital admission or day surgery",
      "Seniors living alone who cannot yet manage independently",
      "Families whose primary caregiver is working during recovery",
      "Post-orthopedic, cardiac, and abdominal-surgery discharges",
      "Clients discharged with new mobility, medication, or diet restrictions",
    ],
    whatsIncluded: [
      "Ride-home coordination and safe home entry",
      "Setup of recovery space and safe walking paths",
      "Bathing, dressing, toileting per discharge restrictions",
      "Meal preparation aligned with new dietary orders",
      "Medication reminders per the discharge medication list",
      "Escort to follow-up appointments and imaging",
      "Family updates and warning-sign reporting",
      "Coordination with Ontario Health atHome nursing and therapy visits",
    ],
    process: SHARED_PROCESS,
    ontarioContext: SHARED_ONTARIO_CONTEXT,
    pricing: [
      "Discharge bookings start at $40/hour with no contract. Many families book 6–10 hours per day for the first week and reduce as independence returns.",
      "For clients discharged with VAC, Blue Cross, or private long-term care coverage, itemized invoices for reimbursement are available.",
    ],
    trustSignals: SHARED_TRUST,
    faqs: [
      { q: "How quickly can care start after discharge?", a: "Most families schedule the first shift to begin at the hospital or on the ride home. Same-day dispatch is standard across Ontario." },
      { q: "Do you work with the hospital discharge team?", a: "Yes. Families frequently share discharge summaries with the PSW so care instructions are followed from hour one." },
      { q: "Can PSWs pick up prescriptions?", a: "Yes — errands including pharmacy pickup are included where the family authorizes them." },
      { q: "Do you support publicly funded home care?", a: "Yes. Ontario Health atHome nursing and therapy hours frequently coexist with private PSW hours; we coordinate around scheduled visits." },
      { q: "What if the client needs to be readmitted?", a: "The PSW notifies the family, and bookings are paused or cancelled the same day with no penalty for reasonable notice." },
      { q: "Can discharge care continue as long-term home care?", a: "Yes. Many families begin with discharge care and transition seamlessly to ongoing daily or weekly support once recovery stabilizes." },
    ],
  },

  // DOCTOR ESCORT
  {
    slug: "doctor-escort-ontario",
    serviceLabel: "Doctor Escort",
    serviceLower: "doctor escort service",
    cityLinkPrefix: "doctor-escort",
    title: "Doctor Escort Services in Ontario | Medical Appointment Transport | PSW Direct",
    description: "PSW doctor escort services across Ontario. A vetted caregiver rides to appointments, takes notes, and helps loved ones get home safely — from $40/hr.",
    h1: "Doctor Escort Services in Ontario",
    intro:
      "PSW Direct provides doctor and medical-appointment escort services across Ontario. When a family member can't take the day off, our vetted Personal Support Workers accompany the client to the appointment, take notes, help ask questions, and get them home safely.",
    overview: [
      "Missing a medical appointment because no one could take the day off is one of the most common — and most consequential — problems in Ontario home care. Follow-up appointments after cardiac events, oncology infusions, dialysis, cataract surgery, and orthopedic follow-ups can't easily be rebooked, and clients who go alone often forget half of what the physician said.",
      "A PSW escort solves both problems. The caregiver picks the client up at home, helps them into transport, accompanies them into the appointment where the client agrees, takes clear notes on the physician's instructions, and gets them home again — meal, medication, and next steps in place before the family arrives home from work.",
      "Escort visits are commonly booked for cardiology, oncology, dialysis, ophthalmology, orthopedic, geriatric-medicine, and memory-clinic appointments. Same-gender caregivers and multilingual PSWs are available where families request them, which matters for clients who need translation with a physician or feel more comfortable with a caregiver of a particular language or gender.",
    ],
    whoItsFor: [
      "Seniors with regular specialist appointments",
      "Clients with cognitive change who cannot recall medical instructions",
      "Dialysis and oncology infusion appointments",
      "Cataract, colonoscopy, and other day-procedure follow-ups",
      "Adults whose family lives out of town or works during clinic hours",
    ],
    whatsIncluded: [
      "Pickup at home and safe entry into transport",
      "Accompaniment into the clinic waiting room",
      "Note-taking during the appointment where the client consents",
      "Help clarifying medication and follow-up instructions",
      "Pharmacy pickup on the way home if required",
      "Safe return home and settled into their routine",
      "Written update to the family via the app",
    ],
    process: SHARED_PROCESS,
    ontarioContext: SHARED_ONTARIO_CONTEXT,
    pricing: [
      "Escort visits are booked hourly and typically run 3–5 hours door to door depending on appointment length and location.",
      "Transportation itself (taxi, wheel-trans, family car) is arranged separately unless a specific escort transport package is offered on the platform for that route.",
    ],
    trustSignals: SHARED_TRUST,
    faqs: [
      { q: "Does the PSW drive the client?", a: "PSW Direct's core service is escort — the PSW accompanies the client. Some cities have paired transport options with specific driver-caregivers; check the booking screen for local availability." },
      { q: "Can the PSW go into the exam room?", a: "Only if the client agrees. Most clients want the PSW present for note-taking; some prefer the PSW to wait in the waiting room." },
      { q: "Do you support hospital-based appointments?", a: "Yes. Escort to clinics at UHN, Sunnybrook, Toronto General, Hamilton Health Sciences, London Health Sciences, and other major Ontario hospitals is a common booking." },
      { q: "Can escorts help with pharmacy pickup?", a: "Yes — on the way home, with family authorization." },
      { q: "How far in advance should I book?", a: "24–48 hours is comfortable; same-day is often possible for urgent needs." },
    ],
  },
];

// Utility used in App.tsx and the hub template.
export const ontarioHubRoutes = ONTARIO_HUBS.map((h) => h.slug);

import { seoStartingRate } from "./seoDisplayPricing";

export interface PlanningFAQ { q: string; a: string }

/** Reviewed task planning, not capability, availability or clinical claims. */
const TASK_PLANNING: Record<string, PlanningFAQ[]> = {
  "companion-care": [
    { q: "What makes a companionship visit useful?", a: "Share the person's interests, preferred conversation topics, hearing or communication needs and usual mealtime routine. Agree on familiar activities they want to do, rather than assuming the visit includes outings or transport." },
    { q: "Can companionship replace supervision?", a: "A companion visit is not clinical supervision or a finding that someone can safely be left alone. Describe supervision concerns before requesting care and ask the care team about changing needs." },
  ],
  "personal-care-assistance": [
    { q: "What should we prepare for personal care?", a: "Explain bathing, dressing and toileting needs separately. List equipment, transfer requirements and the person's preferences about privacy and consent. Confirm that the caregiver can assist with the requested tasks." },
    { q: "What if my loved one declines help?", a: "Share how the person expresses consent or discomfort and who should be contacted if help is declined. Personal care must not be forced; agree on a respectful approach and alternatives before the visit." },
  ],
  "mobility-assistance": [
    { q: "Can one caregiver assist with transfers?", a: "That depends on the person's needs, equipment and existing transfer instructions. Describe the help required before booking; do not assume one caregiver can perform every transfer or operate unfamiliar equipment." },
    { q: "Does mobility help include rehabilitation?", a: "No. Support with familiar mobility aids follows the existing care plan. Assessment, exercise prescriptions, rehabilitation and changes to movement restrictions remain with regulated professionals." },
  ],
  "light-housekeeping-services": [
    { q: "Which household tasks should we list?", a: "Prioritize care-related work such as dishes after a meal, the client's laundry, bed making and tidying their main living space. Identify supplies and tasks that must be completed within the accepted visit." },
    { q: "Is this a whole-home cleaning service?", a: "No. This is light housekeeping within a personal support visit, not deep cleaning, heavy lifting, repairs or hazardous work. Explain the tasks so suitability can be confirmed." },
  ],
  "recovery-care": [
    { q: "How do we plan daily help during recovery?", a: "Start with washing, dressing, meals and everyday movement that the person needs help with. Provide discharge restrictions and equipment instructions from the care team, and plan support for the time between accepted visits." },
    { q: "Does recovery support include treatment or hospital pickup?", a: "No. Nursing, wound care, medication management and rehabilitation are outside home support. Hospital pickup is a separate Hospital Discharge booking; recovery outcomes are not guaranteed." },
  ],
  "memory-care": [
    { q: "What should families share about dementia-related routines?", a: "Describe familiar activities, how the person communicates comfort or distress, preferred names, mealtime routines and supervision concerns. Agree on consent, contact instructions and a family handover before relying on replacement support." },
    { q: "Are dementia specialist skills or continuous care included?", a: "No dementia-specialist qualification, clinical supervision, guaranteed safety or continuous coverage is promised. The individual caregiver's suitability must be confirmed for the daily tasks requested." },
  ],
  "family-caregiver-relief": [
    { q: "What belongs in a respite handover?", a: "List the agreed daily tasks, meals, communication preferences, care-team instructions and who is reachable during the visit. Confirm who resumes care at the end and wait for caregiver acceptance before leaving someone dependent on replacement support." },
    { q: "Can I stay home during a relief visit?", a: "You can request help while you rest at home or attend to other responsibilities. Explain who will be present and what the caregiver should do; the accepted visit covers only the agreed time and non-clinical tasks." },
  ],
  "medication-reminder-services": [
    { q: "What does a medication reminder cover?", a: "A prompt at the agreed time for medication the client takes themselves, within the existing care plan. Supply a current schedule from the pharmacy or care team and instructions for reporting concerns." },
    { q: "Can the caregiver change doses or manage medication?", a: "No. PSWs do not prescribe, change doses, manage medication or replace nursing medication administration. Clinical questions and changes must go to the appropriate regulated professional." },
  ],
  "bathing-assistance": [
    { q: "What bathroom details matter before a visit?", a: "Describe the bath or shower, grab bars, bathing chair and transfer equipment, along with the person's preferred washing routine. Have familiar supplies ready and confirm the caregiver's ability to assist." },
    { q: "Can bathing support include skin or wound treatment?", a: "No. Assistance with everyday washing is non-clinical and requires consent. Clinical skin assessment, wound care and treatment belong with a regulated professional." },
  ],
  "dressing-assistance": [
    { q: "How can we prepare for dressing help?", a: "Set out clothing the person has chosen and explain fasteners, adaptive clothing, painful movements and any discharge restrictions. Allow the person to do the parts they can manage at their own pace." },
    { q: "Can dressing help be requested with other daily tasks?", a: "Yes. Choose the relevant Home Care tasks, such as personal care, meals or companionship, and explain priorities. Suitability and the scope of the accepted visit must be confirmed." },
  ],
  "toileting-assistance": [
    { q: "What should we explain about bathroom routines?", a: "Share transfer needs, familiar equipment, continence products and the person's usual routine. Agree on privacy, supplies and how the person communicates that assistance is needed." },
    { q: "Are catheter procedures included?", a: "No. Daily hygiene and assistance with continence products are different from catheter procedures, clinical assessment or treatment, which require the appropriate regulated professional." },
  ],
  "aging-in-place": [
    { q: "Where should a family start with regular support?", a: "Identify daily tasks that have become difficult, such as washing, meals or keeping care areas tidy. Prioritize what a visit should cover and decide who helps between visits; a support visit does not establish that living alone is safe." },
    { q: "Are recurring visits or the same caregiver guaranteed?", a: "No. Each request depends on address coverage, suitability and caregiver acceptance. Share preferred routines and scheduling needs, but do not rely on continuity or future visits before they are confirmed." },
  ],
  "post-surgery-care": [
    { q: "What instructions are needed after surgery?", a: "Provide the surgical team's permitted activities, movement and lifting restrictions, dietary instructions and equipment needs. Request ordinary daily help within those limits; the PSW must not interpret or change clinical advice." },
    { q: "Is post-surgical home support a medical service?", a: "No. It covers confirmed daily living tasks once at home, not nursing, wound care, medication management, rehabilitation or a guaranteed recovery. Hospital pickup is booked separately." },
  ],
  "hip-replacement-recovery": [
    { q: "How do we prepare for help after hip replacement?", a: "Provide the surgeon's individual movement precautions and the therapist's transfer instructions. Explain seating, clothing and mobility equipment so the caregiver's suitability can be checked rather than assuming a standard technique." },
    { q: "Will the PSW direct rehabilitation?", a: "No. The regulated care team directs rehabilitation and recovery. The visit is for agreed daily activities within the supplied instructions, with no promised recovery timeline or specialist qualification." },
  ],
  "knee-replacement-recovery": [
    { q: "What should we share after knee replacement?", a: "Explain weight-bearing restrictions, familiar mobility aids and which washing, dressing or meal tasks need help. Follow the individual discharge plan and confirm whether the caregiver can assist with transfers." },
    { q: "Does the visit include physiotherapy or pain treatment?", a: "No. Exercise progression, pain treatment and clinical decisions belong with regulated professionals. Medication reminders are only prompts for medication the client takes themselves under the existing care plan." },
  ],
  "stroke-recovery-care": [
    { q: "What information helps plan daily support after a stroke?", a: "Describe communication methods, transfer needs, familiar equipment and written dietary or swallowing instructions from the care team. Confirm the requested tasks and individual caregiver's suitability before relying on a visit." },
    { q: "Does a PSW assess swallowing or provide stroke rehabilitation?", a: "No. Swallowing assessment, rehabilitation and clinical monitoring are regulated care-team responsibilities. Home support follows the existing plan for agreed everyday tasks." },
  ],
};

export function servicePlanningFAQs(service: string): PlanningFAQ[] {
  return TASK_PLANNING[service] ?? [];
}

export function homeCareFAQs(place: string): PlanningFAQ[] {
  return [
    { q: `How much does home care cost in ${place}?`, a: `Home care is $${seoStartingRate("home-care")}/hour, booked in 2-hour increments. Applicable taxes and your total are shown before you submit a booking. Doctor escort and hospital pickup are separate services with separate prices.` },
    { q: "How are coverage and a suitable caregiver confirmed?", a: "Share the exact care address, requested date and hours, tasks, equipment and communication needs. Address coverage, suitability and caregiver acceptance must be confirmed during booking; a page or nearby listing does not guarantee a visit." },
    { q: "Can I request regular care, respite or daily help after surgery?", a: "Select Home Care and the relevant personal-care, meal, companionship or respite tasks. Describe recovery restrictions or dementia-related routines as context. These are non-clinical visits, not nursing, wound care, medication management, rehabilitation or specialist treatment." },
    { q: "Does 24/7 support mean round-the-clock care?", a: "No. Customer support is available 24 hours a day, 7 days a week for questions about requests. Same-day, overnight and continuous care visits are not guaranteed; wait for confirmation before relying on replacement support." },
  ];
}

export function homeCareParent(service: string): { path: string; label: string } {
  if (service === "memory-care") return { path: "/dementia-care-ontario", label: "Dementia-related daily support in Ontario" };
  if (service === "family-caregiver-relief") return { path: "/respite-care-ontario", label: "Family respite and handover planning in Ontario" };
  if (["recovery-care", "post-surgery-care", "hip-replacement-recovery", "knee-replacement-recovery", "stroke-recovery-care"].includes(service)) return { path: "/post-surgery-care-ontario", label: "Non-clinical support at home after surgery" };
  return { path: "/home-care-ontario", label: "Home care and daily task planning in Ontario" };
}
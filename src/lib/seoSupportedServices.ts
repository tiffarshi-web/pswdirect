/** Reviewed public care topics. Describes non-clinical tasks, never a guaranteed shift. */
export const SEO_SUPPORTED_SERVICES: Record<string, {
  serviceId: string; label: string; summary: string; tasks: string[]; preparation: string;
}> = {
  "companion-care": { serviceId: "standard", label: "Companion Care", summary: "Company and practical support for an older adult spending time at home.", tasks: ["Conversation and familiar hobbies", "Company during meals", "Support with a daily routine"], preparation: "Tell us about favourite activities, communication preferences and any safety concerns. Companionship does not replace clinical supervision." },
  "personal-care-assistance": { serviceId: "standard", label: "Personal Care Assistance", summary: "Respectful help with everyday hygiene and dressing in the person's own home.", tasks: ["Bathing and grooming assistance", "Dressing and toileting support", "Safe transfers within the caregiver's training"], preparation: "Describe the bathroom layout, transfer needs and equipment. Consent, privacy and the person's preferred routine matter at every visit." },
  "mobility-assistance": { serviceId: "standard", label: "Mobility Assistance", summary: "Practical help moving around the home, guided by the person's existing care instructions.", tasks: ["Walking and transfer assistance", "Keeping everyday pathways clear", "Help using familiar mobility aids"], preparation: "Share weight-bearing restrictions and equipment requirements. A PSW is not a physiotherapist; clinical assessment and exercise prescriptions stay with the regulated care team." },
  "light-housekeeping-services": { serviceId: "standard", label: "Light Housekeeping Services", summary: "Light household tasks as part of a personal support visit, not a deep-cleaning service.", tasks: ["Dishes and meal-area cleanup", "Client laundry and bed making", "Tidying the client's main living spaces"], preparation: "List the care-related household tasks and any access concerns. Heavy cleaning, repairs and hazardous work are outside this service." },
  "recovery-care": { serviceId: "standard", label: "Recovery Care", summary: "Non-clinical daily living support at home after illness or surgery.", tasks: ["Hygiene and dressing assistance", "Meal preparation and medication reminders", "Mobility support following discharge instructions"], preparation: "Share discharge instructions, restrictions and emergency contacts. Wound treatment, injections and medical decisions require the appropriate regulated professional." },
  "memory-care": { serviceId: "standard", label: "Memory Care", summary: "Personal support for daily routines when memory loss makes everyday activities harder.", tasks: ["Gentle reminders and familiar routines", "Companionship and daily living assistance", "Observations recorded in the visit care sheet"], preparation: "Describe communication needs, triggers and supervision requirements. Suitability depends on the individual caregiver's experience; do not assume specialist training or continuous coverage." },
  "family-caregiver-relief": { serviceId: "standard", label: "Family Caregiver Relief", summary: "A personal support visit that gives a family caregiver time for rest or other responsibilities.", tasks: ["Following the family's daily care routine", "Companionship and personal care", "A documented handover after the visit"], preparation: "Provide the routine, contact details and tasks needed while you are away. Confirm a suitable caregiver and schedule before relying on replacement care." },
  "medication-reminder-services": { serviceId: "standard", label: "Medication Reminder Services", summary: "Reminders for medication the client takes themselves, as part of a support visit.", tasks: ["Prompts at the agreed times", "Hydration reminders", "Reporting concerns to the family"], preparation: "Provide a current schedule from the pharmacy or care team. PSWs do not prescribe, change doses or replace nursing medication administration." },
  "doctor-escort": { serviceId: "doctor-appointment", label: "Doctor Escort", summary: "Personal support for getting to a medical appointment and returning home.", tasks: ["Assistance with pickup and mobility", "Company while waiting at the appointment", "Return-trip support as agreed in the booking"], preparation: "Include the appointment time, pickup and destination addresses, accessibility needs and transport requirements. Confirm vehicle arrangements; an escort is not an ambulance or emergency medical transport." },
  "hospital-discharge": { serviceId: "hospital-discharge", label: "Hospital Discharge Care", summary: "Personal support for the transition from hospital to home.", tasks: ["Assistance with the hospital pickup", "Mobility and settling-in support", "Following the non-clinical discharge plan"], preparation: "Share the confirmed discharge time, pickup instructions and home access details. Discharge approval and clinical follow-up remain with the hospital and regulated care team." },
};

export interface SeoProvinceEvidence {
  code: string; is_active: boolean; launch_status: string;
  bookings_enabled: boolean; payments_enabled: boolean; recruitment_enabled: boolean;
}

export function provinceSupportsSeo(province: SeoProvinceEvidence | undefined, purpose: "care" | "recruitment"): boolean {
  if (!province || province.is_active !== true || province.launch_status !== "live") return false;
  return purpose === "recruitment" ? province.recruitment_enabled === true
    : province.bookings_enabled === true && province.payments_enabled === true;
}

export function localServiceEligible(input: {
  province?: SeoProvinceEvidence; service: string; offeredServiceIds: string[];
  hasLocalContent: boolean; hasNearbyInventory: boolean; canonical: boolean;
}): boolean {
  const topic = SEO_SUPPORTED_SERVICES[input.service];
  return Boolean(topic && input.canonical && input.hasLocalContent && input.hasNearbyInventory
    && provinceSupportsSeo(input.province, "care") && input.offeredServiceIds.includes(topic.serviceId));
}
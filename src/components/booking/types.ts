import type { GenderPreference } from "@/lib/shiftStore";
import type { ServiceCategory } from "@/lib/taskConfig";
import { Users, Stethoscope, Hospital, User, Calendar, MapPin, Check, CreditCard, Clock, DoorOpen, Shield } from "lucide-react";

// ── Step Definitions ──
export const BOOKING_STEPS = [
  { id: 1, title: "Who", icon: Users },
  { id: 2, title: "Service", icon: Stethoscope },
  { id: 3, title: "Tasks", icon: Calendar },
  { id: 4, title: "Schedule", icon: Clock },
  { id: 5, title: "Location", icon: MapPin },
  { id: 6, title: "Details", icon: User },
  { id: 7, title: "Review", icon: Check },
] as const;

export type BookingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ServiceForType = "myself" | "someone-else" | null;

// ── Service Type Labels ──
export const SERVICE_TYPE_OPTIONS: {
  value: ServiceCategory;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    value: "standard",
    label: "Home Care",
    description: "Personal care, companionship, meal prep, and more",
    icon: User,
  },
  {
    value: "doctor-appointment",
    label: "Doctor Escort",
    description: "Accompaniment to doctor appointments",
    icon: Stethoscope,
  },
  {
    value: "hospital-discharge",
    label: "Hospital Discharge",
    description: "Hospital pickup and safe transport home",
    icon: Hospital,
  },
];

// ── Form Data Shape ──
export interface BookingFormData {
  // Step 1
  serviceFor: ServiceForType;

  // Step 2
  selectedCategory: ServiceCategory | null;

  // Step 3
  selectedServices: string[];
  selectedDuration: number;

  // Step 4
  serviceDate: string;
  startTime: string;
  isAsap: boolean;

  // Step 5
  streetNumber: string;
  streetName: string;
  unitNumber: string;
  city: string;
  province: string;
  postalCode: string;
  buzzerCode: string;
  entryPoint: string;
  // Transport fields
  pickupAddress: string;
  pickupPostalCode: string;
  pickupSameAsHome: boolean;
  dropoffAddress: string;
  dropoffPostalCode: string;
  dropoffSameAsHome: boolean;
  doctorOfficeName: string;
  doctorSuiteNumber: string;

  // Step 6
  patientFirstName: string;
  patientLastName: string;
  patientRelationship: string;
  preferredGender: GenderPreference;
  preferredLanguages: string[];
  careConditions: string[];
  careConditionsOther: string;
  specialNotes: string;

  // Step 7
  agreedToPolicy: boolean;
}

export const INITIAL_FORM_DATA: BookingFormData = {
  serviceFor: null,
  selectedCategory: null,
  selectedServices: [],
  selectedDuration: 1,
  serviceDate: "",
  startTime: "",
  isAsap: false,
  streetNumber: "",
  streetName: "",
  unitNumber: "",
  city: "",
  province: "ON",
  postalCode: "",
  buzzerCode: "",
  entryPoint: "",
  pickupAddress: "",
  pickupPostalCode: "",
  pickupSameAsHome: false,
  dropoffAddress: "",
  dropoffPostalCode: "",
  dropoffSameAsHome: false,
  doctorOfficeName: "",
  doctorSuiteNumber: "",
  patientFirstName: "",
  patientLastName: "",
  patientRelationship: "",
  preferredGender: "no-preference",
  preferredLanguages: [],
  careConditions: [],
  careConditionsOther: "",
  specialNotes: "",
  agreedToPolicy: false,
};

// Duration options: 1h to 8h in 0.5h increments + 12h
export const DURATION_OPTIONS = [
  ...Array.from({ length: 15 }, (_, i) => {
    const hours = 1 + i * 0.5;
    return { value: hours, label: `${hours}h` };
  }),
  { value: 12, label: "12h" },
];

// ── Icon Helpers ──
export const getIconForTask = (taskName: string) => {
  const l = taskName.toLowerCase();
  if (l.includes("doctor") || l.includes("escort")) return Stethoscope;
  if (l.includes("hospital") || l.includes("discharge")) return Hospital;
  if (l.includes("personal") || l.includes("care") || l.includes("bath") || l.includes("hygiene")) return User;
  if (l.includes("respite")) return Shield;
  if (l.includes("companion") || l.includes("supervision")) return Users;
  if (l.includes("meal") || l.includes("prep")) return Calendar;
  if (l.includes("medication")) return Clock;
  if (l.includes("housekeeping") || l.includes("light")) return DoorOpen;
  if (l.includes("transport") || l.includes("mobility")) return MapPin;
  return Calendar;
};

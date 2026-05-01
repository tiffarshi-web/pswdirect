import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const configs: Record<string, HighConvertPageConfig> = {
  "help-with-bathing-elderly": {
    slug: "help-with-bathing-elderly",
    title: "Help with Bathing Elderly | Bathing Assistance Ontario | PSW Direct",
    description: "Professional bathing assistance for elderly loved ones in Ontario. Vetted PSWs provide dignified personal hygiene support at home. Book same-day from $35/hr.",
    headline: "Bathing Assistance for Your Elderly Loved One",
    subheadline: "Bathing can become difficult and dangerous as we age. PSW Direct provides compassionate, trained personal support workers who assist with bathing, grooming, and personal hygiene — safely and with dignity.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Bathing Assistance", url: "/help-with-bathing-elderly" },
    ],
    faqs: [
      { question: "What does bathing assistance include?", answer: "A PSW assists with sponge baths, shower supervision, hair washing, skin care, oral hygiene, dressing, and grooming — all tailored to your loved one's comfort and needs." },
      { question: "Can I request a female or male PSW?", answer: "Yes. PSW Direct allows you to specify a gender preference during booking to ensure your loved one's comfort and dignity." },
      { question: "Is bathing assistance covered by insurance?", answer: "Many private insurance plans and Veterans Affairs Canada (VAC) cover personal care services including bathing assistance. PSW Direct supports insurance billing during booking." },
    ],
  },
  "senior-transportation-services": {
    slug: "senior-transportation-services",
    title: "Senior Transportation Services Ontario | Medical Escorts | PSW Direct",
    description: "Senior transportation and medical escort services in Ontario. Vetted PSWs drive and accompany seniors to doctor appointments, hospitals, and errands. From $35/hr.",
    headline: "Senior Transportation & Medical Escort Services",
    subheadline: "Getting to appointments shouldn't be a barrier to health care. PSW Direct provides vetted personal support workers who drive, accompany, and assist seniors with medical appointments, hospital visits, and essential errands.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Senior Transportation", url: "/senior-transportation-services" },
    ],
    faqs: [
      { question: "What does senior transportation include?", answer: "A PSW drives your loved one to appointments, waits during the visit, assists with mobility, takes notes from the doctor, and ensures safe return home." },
      { question: "Does the PSW stay during the appointment?", answer: "Yes. Your PSW stays throughout the appointment to provide mobility assistance, help communicate with medical staff, and take notes on care instructions." },
      { question: "What areas do you serve for transportation?", answer: "PSW Direct provides senior transportation across 60+ Ontario communities including Toronto, Mississauga, Brampton, Hamilton, Barrie, Ottawa, and surrounding areas." },
    ],
  },
  "doctor-appointment-assistance": {
    slug: "doctor-appointment-assistance",
    title: "Doctor Appointment Assistance | Medical Escort Ontario | PSW Direct",
    description: "Doctor appointment assistance and medical escort services in Ontario. A vetted PSW accompanies your loved one to appointments and provides door-to-door support. From $35/hr.",
    headline: "Doctor Appointment Assistance in Ontario",
    subheadline: "Never miss an appointment again. PSW Direct provides door-to-door medical escort — a vetted PSW drives your loved one, stays during the visit, and ensures they get home safely.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Doctor Appointment Assistance", url: "/doctor-appointment-assistance" },
    ],
    faqs: [
      { question: "What does doctor appointment assistance include?", answer: "A PSW picks up your loved one, drives them to the appointment, assists with check-in and mobility, stays during the visit, takes notes, and provides safe transport home." },
      { question: "How far in advance should I book?", answer: "We recommend booking at least 24 hours in advance for medical escorts, though same-day booking is available when PSWs are available in your area." },
      { question: "Can the PSW communicate with the doctor?", answer: "Yes. With your consent, the PSW can relay information to medical staff, take notes on instructions, and report back to family members after the appointment." },
    ],
  },
  "companionship-for-seniors": {
    slug: "companionship-for-seniors",
    title: "Companionship for Seniors | Senior Companion Care | PSW Direct",
    description: "Companionship services for seniors in Ontario. Vetted PSWs provide conversation, activities, walks, and social engagement to combat isolation. From $35/hr.",
    headline: "Companionship Care for Seniors in Ontario",
    subheadline: "Loneliness affects health as much as smoking 15 cigarettes a day. PSW Direct provides warm, engaging companionship for your elderly loved one — conversation, activities, walks, and genuine human connection.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Companionship for Seniors", url: "/companionship-for-seniors" },
    ],
    faqs: [
      { question: "What does a companionship visit include?", answer: "Companionship visits include conversation, board games, card games, walks, reading, watching shows together, meal sharing, light outings, and general social engagement." },
      { question: "Can companionship visits include personal care?", answer: "Yes. PSWs can combine companionship with personal care tasks like meal preparation, medication reminders, and light housekeeping during the same visit." },
      { question: "How often should I book companionship visits?", answer: "Most families book 2-3 visits per week. However, PSW Direct is fully flexible — book daily visits or weekly check-ins based on your loved one's needs." },
    ],
  },
  "meal-preparation-for-seniors": {
    slug: "meal-preparation-for-seniors",
    title: "Meal Preparation for Seniors | Senior Nutrition Help | PSW Direct",
    description: "Meal preparation services for seniors in Ontario. Vetted PSWs prepare nutritious meals, assist with feeding, and ensure proper nutrition. From $35/hr.",
    headline: "Meal Preparation Services for Seniors",
    subheadline: "Proper nutrition is essential for senior health. PSW Direct provides personal support workers who prepare fresh, nutritious meals tailored to your loved one's dietary needs and preferences.",
    breadcrumbTrail: [
      { name: "Home Care", url: "/home-care" },
      { name: "Meal Preparation", url: "/meal-preparation-for-seniors" },
    ],
    faqs: [
      { question: "What meal preparation services do you offer?", answer: "PSWs prepare fresh meals based on dietary requirements, assist with feeding if needed, ensure adequate hydration, help with grocery lists, and clean up after meals." },
      { question: "Can the PSW accommodate special diets?", answer: "Yes. PSWs can prepare meals for diabetic, low-sodium, soft food, and other dietary requirements. Inform us during booking and we'll match you with an appropriate caregiver." },
      { question: "Does meal prep include grocery shopping?", answer: "Meal preparation during visits uses ingredients available in the home. For grocery assistance, you can book a longer visit that includes light errands and shopping support." },
    ],
  },
};

export const BathingAssistancePage = () => <HighConvertLandingPage config={configs["help-with-bathing-elderly"]} />;
export const SeniorTransportPage = () => <HighConvertLandingPage config={configs["senior-transportation-services"]} />;
export const DoctorAppointmentPage = () => <HighConvertLandingPage config={configs["doctor-appointment-assistance"]} />;
export const CompanionshipPage = () => <HighConvertLandingPage config={configs["companionship-for-seniors"]} />;
export const MealPrepPage = () => <HighConvertLandingPage config={configs["meal-preparation-for-seniors"]} />;

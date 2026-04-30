import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const config: HighConvertPageConfig = {
  slug: "doctor-escort-service",
  title: "Doctor Escort Service in Ontario | PSW Medical Escort from $35/hr | PSW Direct",
  description: "Doctor escort service across Ontario. A vetted PSW transports your loved one to medical appointments, waits, and brings them home safely. From $35/hr — book online.",
  headline: "Doctor Escort Service Across Ontario",
  subheadline: "A vetted personal support worker accompanies your loved one to doctor appointments — pickup, transport, waiting, and safe return home. Book in under 2 minutes.",
  breadcrumbTrail: [
    { name: "Home Care Services", url: "/home-care-services" },
    { name: "Doctor Escort Service", url: "/doctor-escort-service" },
  ],
  faqs: [
    { question: "What is a doctor escort service?", answer: "A doctor escort service is when a personal support worker picks up your loved one, transports them to a medical appointment, waits during the visit, takes notes if requested, and returns them safely home." },
    { question: "How much does a doctor escort service cost in Ontario?", answer: "Doctor escort service through PSW Direct starts at $35/hr — including transport time, waiting time, and the safe return trip. There are no contracts or hidden fees." },
    { question: "Can the PSW take notes during the appointment?", answer: "Yes. With your permission, the PSW can take notes during the appointment so you and your family stay fully informed about diagnoses, prescriptions, and follow-up steps." },
    { question: "Is the vehicle included in the doctor escort service?", answer: "Many PSWs provide vehicle-included escort. You can also book non-driving escort if you prefer to use rideshare, family transport, or a wheelchair-accessible vehicle." },
    { question: "Can I book a recurring doctor escort service?", answer: "Yes. PSW Direct supports recurring weekly or monthly doctor escort bookings — for dialysis, oncology, physiotherapy, or any regular medical appointment." },
  ],
};

const DoctorEscortServicePage = () => <HighConvertLandingPage config={config} />;
export default DoctorEscortServicePage;

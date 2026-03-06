// Shared SEO helpers used across multiple SEO page components

export const langName = (code: string) => {
  const map: Record<string, string> = {
    en: "English", fr: "French", es: "Spanish", pt: "Portuguese",
    zh: "Chinese", hi: "Hindi", ar: "Arabic", tl: "Tagalog",
    ta: "Tamil", ur: "Urdu", pa: "Punjabi", bn: "Bengali",
    ko: "Korean", ja: "Japanese", de: "German", it: "Italian",
    ru: "Russian", pl: "Polish", uk: "Ukrainian", so: "Somali",
    am: "Amharic", sw: "Swahili", ha: "Hausa", yo: "Yoruba",
    ig: "Igbo", tw: "Twi", fa: "Farsi", tr: "Turkish",
    vi: "Vietnamese", th: "Thai", el: "Greek", nl: "Dutch",
    ro: "Romanian", hu: "Hungarian", cs: "Czech", hr: "Croatian",
    sr: "Serbian", bg: "Bulgarian", he: "Hebrew", km: "Khmer",
    my: "Burmese", ne: "Nepali", si: "Sinhala", ml: "Malayalam",
    te: "Telugu", kn: "Kannada", gu: "Gujarati", mr: "Marathi",
  };
  return map[code] || code;
};

/**
 * Build FAQPage JSON-LD for city/service pages
 */
export const buildFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

/**
 * Generate city-specific FAQ items
 */
export const getCityFAQs = (city: string) => [
  {
    question: `What does a Personal Support Worker do in ${city}?`,
    answer: `A Personal Support Worker (PSW) in ${city} provides in-home care services including personal hygiene assistance, mobility support, companionship, meal preparation, medication reminders, and accompaniment to medical appointments. All PSW Direct caregivers serving ${city} are credential-verified and police-checked.`,
  },
  {
    question: `How much does home care cost in ${city}?`,
    answer: `Home care through PSW Direct in ${city} starts at $30 per hour for personal care and companionship visits. Doctor escort services start at $35 per hour. There are no contracts, agency fees, or hidden charges.`,
  },
  {
    question: `Can I book overnight PSW care in ${city}?`,
    answer: `Yes, PSW Direct offers overnight care and 24-hour home care in ${city}. You can book a PSW for nighttime supervision, bathroom assistance, repositioning, and emergency response through our online platform.`,
  },
  {
    question: `Is dementia care available 24 hours in ${city}?`,
    answer: `Yes, PSW Direct provides 24-hour dementia care and Alzheimer's care in ${city}. Our trained PSWs offer structured routines, cognitive stimulation, safety monitoring, and compassionate personal care around the clock.`,
  },
  {
    question: `How do I book a Personal Support Worker in ${city}?`,
    answer: `Booking a PSW in ${city} through PSW Direct is simple: 1) Visit PSADIRECT.CA and post your care needs, 2) Get matched with a vetted PSW in your area, 3) Care begins at your scheduled time. No contracts required.`,
  },
];

/**
 * Generate service-specific FAQ items
 */
export const getServiceFAQs = (serviceLabel: string, city: string) => [
  {
    question: `What is ${serviceLabel.toLowerCase()} and who needs it?`,
    answer: `${serviceLabel} involves professional in-home support provided by a trained Personal Support Worker. It is ideal for seniors, individuals recovering from surgery, or anyone needing assistance with daily living activities in ${city}.`,
  },
  {
    question: `How much does ${serviceLabel.toLowerCase()} cost in ${city}?`,
    answer: `${serviceLabel} through PSW Direct in ${city} starts at $30 per hour. There are no agency fees, contracts, or hidden charges. Book online in minutes.`,
  },
  {
    question: `Can I book ${serviceLabel.toLowerCase()} for my parent in ${city}?`,
    answer: `Yes, you can book ${serviceLabel.toLowerCase()} for a family member in ${city} through PSW Direct. Simply visit PSADIRECT.CA, select "Someone Else," and provide the care details. All PSWs are vetted and police-checked.`,
  },
];

/**
 * SEO footer links (coverage, directory, join team)
 */
export const seoFooterLinks = [
  { to: "/psw-directory", label: "PSW Directory" },
  { to: "/coverage", label: "Coverage Map" },
  { to: "/join-team", label: "Become a PSW" },
  { to: "/guides", label: "Care Guides" },
];

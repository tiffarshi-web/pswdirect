// Language Configuration for PSW Direct
// Manages language preferences for PSWs and Clients

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// Comprehensive list of languages common in Ontario/Canada
export const AVAILABLE_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ur", name: "Urdu", nativeName: "اردو" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "zh", name: "Mandarin Chinese", nativeName: "普通话" },
  { code: "zh-yue", name: "Cantonese", nativeName: "粵語" },
  { code: "tl", name: "Tagalog/Filipino", nativeName: "Tagalog" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "fa", name: "Persian/Farsi", nativeName: "فارسی" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "so", name: "Somali", nativeName: "Soomaali" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "he", name: "Hebrew", nativeName: "עברית" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "sr", name: "Serbian", nativeName: "Српски" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
];

// Get language by code
export const getLanguageByCode = (code: string): Language | undefined => {
  return AVAILABLE_LANGUAGES.find(lang => lang.code === code);
};

// Get language name by code
export const getLanguageName = (code: string): string => {
  const lang = getLanguageByCode(code);
  return lang ? lang.name : code;
};

// Search languages by name
export const searchLanguages = (query: string): Language[] => {
  if (!query.trim()) return AVAILABLE_LANGUAGES;
  
  const lowerQuery = query.toLowerCase();
  return AVAILABLE_LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(lowerQuery) ||
    lang.nativeName.toLowerCase().includes(lowerQuery) ||
    lang.code.toLowerCase().includes(lowerQuery)
  );
};

// PSW Language Profile (stored in localStorage)
export interface PSWLanguageProfile {
  pswId: string;
  languages: string[]; // Up to 5 language codes
  updatedAt: string;
}

// Get all PSW language profiles
export const getPSWLanguageProfiles = (): PSWLanguageProfile[] => {
  const stored = localStorage.getItem("pswdirect_psw_languages");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

// Save PSW language profiles
const savePSWLanguageProfiles = (profiles: PSWLanguageProfile[]): void => {
  localStorage.setItem("pswdirect_psw_languages", JSON.stringify(profiles));
};

// Get a specific PSW's language profile
export const getPSWLanguages = (pswId: string): string[] => {
  const profiles = getPSWLanguageProfiles();
  const profile = profiles.find(p => p.pswId === pswId);
  return profile?.languages || ["en"]; // Default to English
};

// Update a PSW's language profile
export const updatePSWLanguages = (pswId: string, languages: string[]): PSWLanguageProfile => {
  const profiles = getPSWLanguageProfiles();
  const existingIndex = profiles.findIndex(p => p.pswId === pswId);
  
  const newProfile: PSWLanguageProfile = {
    pswId,
    languages: languages.slice(0, 5), // Max 5 languages
    updatedAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = newProfile;
  } else {
    profiles.push(newProfile);
  }
  
  savePSWLanguageProfiles(profiles);
  return newProfile;
};

// Check if a PSW speaks a specific language
export const pswSpeaksLanguage = (pswId: string, languageCode: string): boolean => {
  const languages = getPSWLanguages(pswId);
  return languages.includes(languageCode);
};

// Check if a PSW matches any of the client's preferred languages
export const pswMatchesClientLanguages = (pswId: string, clientLanguages: string[]): boolean => {
  const pswLanguages = getPSWLanguages(pswId);
  return clientLanguages.some(lang => pswLanguages.includes(lang));
};

// Get PSWs who speak a specific language
export const getPSWsWhoSpeak = (languageCode: string): string[] => {
  const profiles = getPSWLanguageProfiles();
  return profiles
    .filter(p => p.languages.includes(languageCode))
    .map(p => p.pswId);
};

// Get PSWs who match any of the given languages
export const getPSWsMatchingLanguages = (languages: string[]): string[] => {
  const profiles = getPSWLanguageProfiles();
  return profiles
    .filter(p => p.languages.some(lang => languages.includes(lang)))
    .map(p => p.pswId);
};

// Smart notification timing - tracks when job was posted
export interface JobLanguageTracking {
  bookingId: string;
  preferredLanguages: string[];
  postedAt: string;
  languageMatchNotifiedAt?: string;
  allNotifiedAt?: string; // When opened to all PSWs
}

// Get job language tracking
export const getJobLanguageTracking = (): JobLanguageTracking[] => {
  const stored = localStorage.getItem("pswdirect_job_language_tracking");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

// Save job language tracking
const saveJobLanguageTracking = (tracking: JobLanguageTracking[]): void => {
  localStorage.setItem("pswdirect_job_language_tracking", JSON.stringify(tracking));
};

// Add tracking for a new job
export const trackJobLanguage = (bookingId: string, preferredLanguages: string[]): JobLanguageTracking => {
  const tracking = getJobLanguageTracking();
  
  const newTracking: JobLanguageTracking = {
    bookingId,
    preferredLanguages,
    postedAt: new Date().toISOString(),
    languageMatchNotifiedAt: new Date().toISOString(),
  };
  
  // Remove existing if any
  const filtered = tracking.filter(t => t.bookingId !== bookingId);
  filtered.push(newTracking);
  saveJobLanguageTracking(filtered);
  
  return newTracking;
};

// Check if job should be open to all PSWs (after 2 hours)
export const shouldOpenToAllPSWs = (bookingId: string): boolean => {
  const tracking = getJobLanguageTracking();
  const jobTracking = tracking.find(t => t.bookingId === bookingId);
  
  if (!jobTracking) return true; // No tracking = open to all
  if (jobTracking.preferredLanguages.length === 0) return true; // No preference = open to all
  
  const postedAt = new Date(jobTracking.postedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff >= 2;
};

// Mark job as opened to all
export const markJobOpenedToAll = (bookingId: string): void => {
  const tracking = getJobLanguageTracking();
  const index = tracking.findIndex(t => t.bookingId === bookingId);
  
  if (index >= 0) {
    tracking[index].allNotifiedAt = new Date().toISOString();
    saveJobLanguageTracking(tracking);
  }
};

// Get job tracking info
export const getJobTracking = (bookingId: string): JobLanguageTracking | undefined => {
  const tracking = getJobLanguageTracking();
  return tracking.find(t => t.bookingId === bookingId);
};

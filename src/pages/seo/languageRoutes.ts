export interface LanguageRoute {
  slug: string;
  code: string;
  label: string;
}

export const languageRoutes: LanguageRoute[] = [
  { slug: "psw-language-english", code: "en", label: "English" },
  { slug: "psw-language-french", code: "fr", label: "French" },
  { slug: "psw-language-punjabi", code: "pa", label: "Punjabi" },
  { slug: "psw-language-hindi", code: "hi", label: "Hindi" },
  { slug: "psw-language-urdu", code: "ur", label: "Urdu" },
  { slug: "psw-language-tamil", code: "ta", label: "Tamil" },
  { slug: "psw-language-gujarati", code: "gu", label: "Gujarati" },
  { slug: "psw-language-mandarin", code: "zh", label: "Mandarin Chinese" },
  { slug: "psw-language-cantonese", code: "zh-yue", label: "Cantonese" },
  { slug: "psw-language-tagalog", code: "tl", label: "Tagalog" },
  { slug: "psw-language-spanish", code: "es", label: "Spanish" },
  { slug: "psw-language-portuguese", code: "pt", label: "Portuguese" },
  { slug: "psw-language-italian", code: "it", label: "Italian" },
  { slug: "psw-language-polish", code: "pl", label: "Polish" },
  { slug: "psw-language-ukrainian", code: "uk", label: "Ukrainian" },
  { slug: "psw-language-russian", code: "ru", label: "Russian" },
  { slug: "psw-language-arabic", code: "ar", label: "Arabic" },
  { slug: "psw-language-farsi", code: "fa", label: "Farsi" },
  { slug: "psw-language-korean", code: "ko", label: "Korean" },
  { slug: "psw-language-vietnamese", code: "vi", label: "Vietnamese" },
  { slug: "psw-language-bengali", code: "bn", label: "Bengali" },
  { slug: "psw-language-telugu", code: "te", label: "Telugu" },
  { slug: "psw-language-marathi", code: "mr", label: "Marathi" },
  { slug: "psw-language-somali", code: "so", label: "Somali" },
  { slug: "psw-language-amharic", code: "am", label: "Amharic" },
  { slug: "psw-language-swahili", code: "sw", label: "Swahili" },
  { slug: "psw-language-greek", code: "el", label: "Greek" },
  { slug: "psw-language-turkish", code: "tr", label: "Turkish" },
];

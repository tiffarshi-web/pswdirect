import { SEO_REDIRECTS, resolveLegacySeoPath } from "../../src/pages/seo/legacyRedirects";
import { seoRoutes, homeCareCityRoutes } from "../../src/pages/seo/seoRoutes";
import { cityServiceRoutes } from "../../src/pages/seo/cityServiceRoutes";
import { additionalCityServiceRoutes } from "../../src/pages/seo/additionalCityServiceRoutes";
import { languageRoutes } from "../../src/pages/seo/languageRoutes";
import { languageCityRoutes } from "../../src/pages/seo/languageCityRoutes";
import { languageServiceCityRoutes } from "../../src/pages/seo/languageServiceCityRoutes";
import { emergencyCareRoutes } from "../../src/pages/seo/emergencyCareRoutes";
import { pswJobCityRoutes } from "../../src/pages/seo/pswJobRoutes";
import { questionRoutes } from "../../src/pages/seo/questionRoutes";
import { homeCareKeywordRoutes } from "../../src/pages/seo/homeCareKeywordRoutes";
import { privateHomeCareCityRoutes } from "../../src/pages/seo/privateHomeCareRoutes";
import { pswWorkerCityRoutes } from "../../src/pages/seo/pswWorkerCityRoutes";
import { caregiverCityRoutes } from "../../src/pages/seo/caregiverCityRoutes";
import { cityNearMeRoutes } from "../../src/pages/seo/cityNearMeRoutes";
import { expandedCityServiceRoutes } from "../../src/pages/seo/expandedCityServiceRoutes";
import { FAMILY_INTENT_SLUGS } from "../../src/pages/seo/familyIntentRoutes";
import { homeCareLanguageRoutes } from "../../src/pages/seo/homeCareLanguageRoutes";

const all = new Set<string>();
const push=(rs:any[])=>rs.forEach(r=>all.add(typeof r==="string"?r:r.slug));
push(seoRoutes);push(homeCareCityRoutes);push(cityServiceRoutes);push(additionalCityServiceRoutes);
push(languageRoutes);push(languageCityRoutes);push(languageServiceCityRoutes);push(emergencyCareRoutes);
push(pswJobCityRoutes);push(questionRoutes);push(homeCareKeywordRoutes);push(privateHomeCareCityRoutes);
push(pswWorkerCityRoutes);push(caregiverCityRoutes);push(cityNearMeRoutes);push(expandedCityServiceRoutes);
push(FAMILY_INTENT_SLUGS as any);push(homeCareLanguageRoutes);
console.log("total registry slugs:", all.size);
const missing:string[]=[];
for (const [from,to] of SEO_REDIRECTS) if(!all.has(to)) missing.push(`${from} -> ${to}`);
console.log("redirects with MISSING destination:", missing.length, missing.slice(0,10));
// redirect sources still present as routes
const stillRouted=[...SEO_REDIRECTS.keys()].filter(s=>all.has(s));
console.log("redirect sources still in registries:", stillRouted.length, stillRouted.slice(0,5));
// chains
const chains=[...SEO_REDIRECTS.entries()].filter(([,to])=>SEO_REDIRECTS.has(to));
console.log("redirect chains:", chains.length);
// caregiver-city aliases in registry?
const cgAlias=[...all].filter(s=>/^[a-z]+-caregiver-/.test(s)&&resolveLegacySeoPath("/"+s));
console.log("caregiver aliases resolvable & in registry:", cgAlias.length, cgAlias.slice(0,5));
// sample checks
["psw-barrie-overnight-care","overnight-psw-north-york","psw-north-york-overnight-care","psw-sault-ste-marie-personal-care","psw-sarnia-personal-care","spanish-psw-brampton","marathi-psw-cliffside","tamil-caregiver-london","russian-caregiver-courtice","marathi-caregiver-hamilton"].forEach(s=>{
  console.log(s,"=> resolve:",resolveLegacySeoPath("/"+s),"| inRegistry:",all.has(s),"| destExists:",all.has((resolveLegacySeoPath("/"+s)||"").slice(1)));
});

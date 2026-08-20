import { SEO_REDIRECTS } from "../../src/pages/seo/legacyRedirects";
import { seoRoutes, homeCareCityRoutes } from "../../src/pages/seo/seoRoutes";
import { cityServiceRoutes } from "../../src/pages/seo/cityServiceRoutes";
import { additionalCityServiceRoutes } from "../../src/pages/seo/additionalCityServiceRoutes";
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
const regs:Record<string,any[]>={seoRoutes,homeCareCityRoutes,cityServiceRoutes,additionalCityServiceRoutes,languageServiceCityRoutes,emergencyCareRoutes,pswJobCityRoutes,questionRoutes,homeCareKeywordRoutes,privateHomeCareCityRoutes,pswWorkerCityRoutes,caregiverCityRoutes,cityNearMeRoutes,expandedCityServiceRoutes};
for(const [n,rs] of Object.entries(regs)){
  const hits=rs.map((r:any)=>r.slug).filter((s:string)=>SEO_REDIRECTS.has(s));
  if(hits.length) console.log(n, hits.length, hits.slice(0,3));
}

import { expandedCityServiceRoutes } from "../../src/pages/seo/expandedCityServiceRoutes";
const s=expandedCityServiceRoutes.map(r=>r.slug);
console.log("family-caregiver-relief count:", s.filter(x=>x.startsWith("family-caregiver-relief-")).length, s.filter(x=>x.startsWith("family-caregiver-relief-")).slice(0,3));
console.log("services:", [...new Set(expandedCityServiceRoutes.map(r=>r.service))]);

import { Heart, Utensils, Activity, Users, Stethoscope, Home, ShieldCheck, HeartHandshake } from "lucide-react";

interface Props {
  city?: string;
  service?: string;
}

// Hospitals / landmark anchors per city for unique local relevance text.
const CITY_LANDMARKS: Record<string, { hospitals: string[]; areas: string[]; region: string }> = {
  Toronto: { hospitals: ["Toronto General Hospital", "Sunnybrook Health Sciences Centre", "Mount Sinai Hospital"], areas: ["North York", "Scarborough", "Etobicoke", "East York"], region: "the Greater Toronto Area" },
  Mississauga: { hospitals: ["Trillium Health Partners – Mississauga Hospital", "Credit Valley Hospital"], areas: ["Streetsville", "Port Credit", "Erin Mills", "Meadowvale"], region: "Peel Region" },
  Brampton: { hospitals: ["Brampton Civic Hospital", "Peel Memorial Centre"], areas: ["Bramalea", "Heart Lake", "Mount Pleasant"], region: "Peel Region" },
  Vaughan: { hospitals: ["Mackenzie Health Vaughan Hospital"], areas: ["Woodbridge", "Maple", "Thornhill", "Kleinburg"], region: "York Region" },
  Markham: { hospitals: ["Markham Stouffville Hospital"], areas: ["Unionville", "Cornell", "Milliken"], region: "York Region" },
  Barrie: { hospitals: ["Royal Victoria Regional Health Centre"], areas: ["Allandale", "Painswick", "Innishore"], region: "Simcoe County" },
  Hamilton: { hospitals: ["Hamilton General Hospital", "Juravinski Hospital", "St. Joseph's Healthcare"], areas: ["Stoney Creek", "Ancaster", "Dundas"], region: "the Hamilton-Niagara region" },
  Ottawa: { hospitals: ["The Ottawa Hospital", "Civic Campus", "Queensway Carleton Hospital"], areas: ["Kanata", "Orléans", "Nepean", "Barrhaven"], region: "the National Capital Region" },
  London: { hospitals: ["London Health Sciences Centre", "Victoria Hospital"], areas: ["Byron", "Westmount", "Masonville"], region: "Middlesex County" },
  Oshawa: { hospitals: ["Lakeridge Health Oshawa"], areas: ["North Oshawa", "Eastdale", "Donevan"], region: "Durham Region" },
  Whitby: { hospitals: ["Lakeridge Health Whitby"], areas: ["Brooklin", "Port Whitby"], region: "Durham Region" },
  Oakville: { hospitals: ["Oakville Trafalgar Memorial Hospital"], areas: ["Bronte", "Glen Abbey", "Kerr Village"], region: "Halton Region" },
  Burlington: { hospitals: ["Joseph Brant Hospital"], areas: ["Aldershot", "Alton", "Millcroft"], region: "Halton Region" },
  Kitchener: { hospitals: ["Grand River Hospital", "St. Mary's General Hospital"], areas: ["Doon", "Forest Heights"], region: "the Waterloo Region" },
  Scarborough: { hospitals: ["Scarborough Health Network"], areas: ["Agincourt", "Malvern", "Bendale"], region: "east Toronto" },
  "North York": { hospitals: ["North York General Hospital"], areas: ["Willowdale", "Don Mills", "Bayview Village"], region: "north Toronto" },
  Etobicoke: { hospitals: ["Etobicoke General Hospital"], areas: ["Mimico", "Long Branch", "Rexdale"], region: "west Toronto" },
};

const FALLBACK = { hospitals: ["the local hospital and community health centre"], areas: ["surrounding neighbourhoods"], region: "the region" };

const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const INTRO_VARIANTS = [
  (city: string, h: string) =>
    `Finding dependable home care in ${city} shouldn't feel overwhelming. PSW Direct connects local families with vetted personal support workers who specialize in elderly care, dementia support, and post-hospital recovery — including discharges from ${h}. Whether your parent needs a few hours of companionship a week or round-the-clock supervision, our caregivers arrive prepared, screened, and ready to help. No call centres, no contracts, no agency markup — just compassionate, on-demand care booked in minutes.`,
  (city: string, h: string) =>
    `Caring for an aging parent in ${city} brings unique challenges — from managing dementia behaviours to coordinating recovery after a stay at ${h}. PSW Direct gives ${city} families immediate access to qualified PSWs who can step in for personal care, mobility support, medication reminders, and overnight supervision. Every caregiver on our platform is credential-verified and police-checked, so you know your loved one is in safe, experienced hands from the very first visit.`,
  (city: string, h: string) =>
    `When a loved one in ${city} needs help at home, every day counts. PSW Direct is built for ${city} families navigating real situations — a sudden hospital discharge from ${h}, advancing dementia, recovery from surgery, or simply the quiet exhaustion of being a primary caregiver. Our vetted personal support workers provide compassionate, professional support that lets seniors stay safely in their own homes, with the dignity and routine they deserve.`,
];

const LOCAL_VARIANTS = [
  (city: string, h: string, areas: string, region: string) =>
    `Our ${city} caregivers regularly support clients discharged from ${h}, as well as families across ${areas}. Coverage extends throughout ${region}, so whether you're arranging care for a downtown condo or a quiet residential street, a vetted PSW can usually be at the door within hours.`,
  (city: string, h: string, areas: string, region: string) =>
    `From neighbourhoods near ${h} to surrounding communities like ${areas}, our PSWs know the streets, the hospitals, and the local pharmacies. That local familiarity matters most after a hospital stay, when timing, transport, and routine all need to fall into place quickly across ${region}.`,
];

const HELP_ITEMS = [
  { icon: Heart, title: "Personal Care", desc: "Bathing, dressing, grooming, toileting, and continence support — delivered with patience and dignity." },
  { icon: Utensils, title: "Meal Preparation", desc: "Nutritious meals tailored to dietary needs, plus help with feeding, hydration, and medication reminders." },
  { icon: Activity, title: "Mobility & Transfers", desc: "Safe transfers, walking support, fall prevention, and gentle exercise to maintain strength and independence." },
  { icon: HeartHandshake, title: "Companionship", desc: "Conversation, light recreation, and emotional support that ease isolation and lift the spirit." },
  { icon: Stethoscope, title: "Post-Hospital Recovery", desc: "Wound-care monitoring, follow-up appointments, and gentle help getting back on your feet after surgery." },
  { icon: Home, title: "Light Housekeeping", desc: "Tidying, laundry, and keeping the living space safe, clean, and comfortable." },
];

const WHO_ITEMS = [
  { icon: Users, title: "Seniors living alone", desc: "Older adults who want to age in place safely with help during the day, evening, or overnight." },
  { icon: HeartHandshake, title: "Families needing support", desc: "Adult children juggling work, kids, and caregiving who need reliable backup for a parent's daily routine." },
  { icon: ShieldCheck, title: "Post-surgery patients", desc: "Anyone recovering from surgery or a hospital stay who needs short-term help with mobility, hygiene, and meals." },
  { icon: Heart, title: "Dementia & Alzheimer's clients", desc: "Loved ones who benefit from structured routines, safety supervision, and patient, trained caregivers." },
];

const LongFormSEOContent = ({ city, service }: Props) => {
  const loc = city || "Ontario";
  const meta = (city && CITY_LANDMARKS[city]) || FALLBACK;
  const seed = hashStr(loc + (service ?? ""));
  const intro = INTRO_VARIANTS[seed % INTRO_VARIANTS.length](loc, meta.hospitals[0]);
  const local = LOCAL_VARIANTS[seed % LOCAL_VARIANTS.length](
    loc,
    meta.hospitals.slice(0, 2).join(" and "),
    meta.areas.join(", "),
    meta.region,
  );

  return (
    <section className="px-4 py-10 md:py-14 max-w-4xl mx-auto space-y-10">
      {/* Strong intro */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Compassionate Home Care for {loc} Families
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{intro}</p>
      </div>

      {/* Who this is for */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Who This Service Is For</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {WHO_ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border">
              <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What PSWs help with */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">What Our PSWs Help With</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HELP_ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card rounded-lg p-4 border border-border">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Local relevance */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Serving {loc} &amp; Surrounding Areas</h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{local}</p>
      </div>
    </section>
  );
};

export default LongFormSEOContent;

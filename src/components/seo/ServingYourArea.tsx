import { MapPin, Zap, Users, Network } from "lucide-react";
import { getNearbyCities } from "@/lib/seoCityData";

interface ServingYourAreaProps {
  city: string;
}

/**
 * Local-SEO authority block. References the city, surrounding towns,
 * and a notable local hospital/landmark when known.
 */

// Notable hospital / landmark per city for E-E-A-T signal.
// Generic regional fallback used when city not listed.
const CITY_LANDMARKS: Record<string, { landmark: string; region: string }> = {
  Toronto: { landmark: "Toronto General Hospital and Sunnybrook Health Sciences Centre", region: "the Greater Toronto Area" },
  Mississauga: { landmark: "Trillium Health Partners – Mississauga Hospital", region: "Peel Region" },
  Brampton: { landmark: "Brampton Civic Hospital", region: "Peel Region" },
  Vaughan: { landmark: "Mackenzie Health Vaughan Hospital", region: "York Region" },
  Markham: { landmark: "Markham Stouffville Hospital", region: "York Region" },
  "Richmond Hill": { landmark: "Mackenzie Richmond Hill Hospital", region: "York Region" },
  Barrie: { landmark: "Royal Victoria Regional Health Centre", region: "Simcoe County" },
  Hamilton: { landmark: "Hamilton General Hospital and Juravinski Hospital", region: "the Hamilton-Niagara region" },
  Oakville: { landmark: "Oakville Trafalgar Memorial Hospital", region: "Halton Region" },
  Burlington: { landmark: "Joseph Brant Hospital", region: "Halton Region" },
  Ottawa: { landmark: "The Ottawa Hospital and Civic Campus", region: "the National Capital Region" },
  Kitchener: { landmark: "Grand River Hospital", region: "the Waterloo Region" },
  Waterloo: { landmark: "Grand River Hospital", region: "the Waterloo Region" },
  Cambridge: { landmark: "Cambridge Memorial Hospital", region: "the Waterloo Region" },
  London: { landmark: "London Health Sciences Centre", region: "Middlesex County" },
  Windsor: { landmark: "Windsor Regional Hospital", region: "Essex County" },
  Guelph: { landmark: "Guelph General Hospital", region: "Wellington County" },
  Kingston: { landmark: "Kingston Health Sciences Centre", region: "the Kingston region" },
  Peterborough: { landmark: "Peterborough Regional Health Centre", region: "Peterborough County" },
  Oshawa: { landmark: "Lakeridge Health Oshawa", region: "Durham Region" },
  Whitby: { landmark: "Lakeridge Health", region: "Durham Region" },
  Ajax: { landmark: "Ajax Pickering Hospital", region: "Durham Region" },
  Pickering: { landmark: "Ajax Pickering Hospital", region: "Durham Region" },
  Scarborough: { landmark: "Scarborough Health Network", region: "east Toronto" },
  "North York": { landmark: "North York General Hospital", region: "north Toronto" },
  Etobicoke: { landmark: "Etobicoke General Hospital", region: "west Toronto" },
  "St. Catharines": { landmark: "St. Catharines Hospital", region: "the Niagara region" },
  "Niagara Falls": { landmark: "Niagara Falls Hospital", region: "the Niagara region" },
  Sudbury: { landmark: "Health Sciences North", region: "Greater Sudbury" },
  "Thunder Bay": { landmark: "Thunder Bay Regional Health Sciences Centre", region: "northwestern Ontario" },
};

const PARAGRAPH_VARIANTS = [
  (city: string, lm: string, region: string, nearby: string) =>
    `We proudly provide home care services across ${city}, including areas near ${lm}, and surrounding communities such as ${nearby}, supporting families throughout ${region}.`,
  (city: string, lm: string, region: string, nearby: string) =>
    `Our network of vetted personal support workers serves ${city} and the surrounding communities of ${nearby}, with rapid response near ${lm} and across ${region}.`,
  (city: string, lm: string, region: string, nearby: string) =>
    `Families in ${city} — including those discharged from ${lm} — can book a trusted PSW within minutes. We also cover nearby towns like ${nearby} across ${region}.`,
  (city: string, lm: string, region: string, nearby: string) =>
    `From neighbourhoods near ${lm} to the wider ${region}, PSW Direct delivers same-day in-home care across ${city} and surrounding areas including ${nearby}.`,
];

const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const ServingYourArea = ({ city }: ServingYourAreaProps) => {
  const meta = CITY_LANDMARKS[city] ?? {
    landmark: `local hospitals and community centres in ${city}`,
    region: "Ontario",
  };
  const nearbyList = getNearbyCities(city).slice(0, 4);
  const nearbyText = nearbyList.length > 0 ? nearbyList.join(", ") : "neighbouring Ontario communities";

  const seed = hashStr(city);
  const paragraph = PARAGRAPH_VARIANTS[seed % PARAGRAPH_VARIANTS.length](
    city,
    meta.landmark,
    meta.region,
    nearbyText,
  );

  const bullets = [
    { icon: Zap, text: `Fast response times in ${city} — most requests matched within minutes` },
    { icon: Users, text: `Local PSWs available who know ${city} neighbourhoods` },
    {
      icon: Network,
      text: nearbyList.length > 0
        ? `Coverage in nearby towns: ${nearbyList.slice(0, 3).join(", ")}`
        : `Coverage across ${meta.region}`,
    },
  ];

  return (
    <section
      className="px-4 py-12 border-t border-border bg-muted/20"
      aria-label={`Service area information for ${city}`}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          Serving Your Area in {city}
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed mb-6">
          {paragraph}
        </p>
        <ul className="grid sm:grid-cols-3 gap-3">
          {bullets.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-start gap-2 bg-card rounded-lg p-3 border border-border"
            >
              <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ServingYourArea;

import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { SEO_CITIES, cityToSlug } from "@/lib/seoCityData";

interface PrivateHomeCareSectionProps {
  city: string;
  /** Hide the internal linking section (e.g. when the parent already has one) */
  hideInternalLinks?: boolean;
}

const LANGUAGES = [
  "Punjabi", "Hindi", "Urdu", "Tagalog", "Arabic", "Mandarin", "Spanish",
  "Tamil", "Gujarati", "Italian", "Portuguese", "French", "Vietnamese",
  "Russian", "Polish", "Greek", "Korean", "Japanese", "Bengali", "Malayalam",
  "Telugu", "Marathi", "Sinhala", "Nepali", "Somali", "Amharic", "Turkish",
  "German", "Dutch", "Thai", "Khmer", "Indonesian",
];

/**
 * Shared SEO content block injected into every city landing page.
 * Targets: "home care {city}", "in-home caregiver {city}",
 * "personal support worker {city}", "hire a PSW {city}".
 */
const PrivateHomeCareSection = ({ city, hideInternalLinks = false }: PrivateHomeCareSectionProps) => {
  const currentSlug = cityToSlug(city);

  return (
    <>
      {/* Home Care Content Section */}
      <section className="px-4 py-12 bg-background border-t border-border">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Home Care Services in {city}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              PSW Direct provides home care and in-home caregiver support for seniors,
              individuals recovering from surgery, and anyone needing assistance with daily living
              in {city}. Whether you're looking to hire a PSW for a few hours a week or need a
              full-time in-home personal support worker, our platform connects you with vetted
              caregivers quickly and affordably.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              As a private caregiver service, PSW Direct eliminates the overhead of traditional
              home care agencies. Families in {city} can book a personal support worker online
              starting at $30 per hour — compared to $55+ at conventional agencies. There are
              no long-term contracts, no hidden fees, and every caregiver on our platform is
              credential-verified and police-checked before being approved.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our in-home care services in {city} include companionship, personal hygiene
              assistance, meal preparation, mobility support, medication reminders, post-hospital
              recovery care, overnight supervision, and doctor escort services. If you need to
              hire a PSW in {city}, PSW Direct makes it simple — post your care needs, get
              matched with an available in-home personal support worker, and care begins at your
              scheduled time.
            </p>
          </div>

          {/* Language Coverage */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">
                Multilingual Caregivers in {city}
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              PSW Direct's caregivers in {city} speak 35+ languages, making it easier for
              families to find a personal support worker who communicates in their preferred
              language. Whether you need a private caregiver who speaks your loved one's
              first language or an in-home care worker who can bridge cultural gaps, our
              multilingual team is here to help.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Languages available:</strong>{" "}
              {LANGUAGES.join(", ")}, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Internal Linking to Other Ontario City Pages */}
      {!hideInternalLinks && (
        <section className="px-4 py-10 bg-muted/30 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-foreground mb-4 text-center">
              Home Care Across Ontario
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              PSW Direct connects families with private caregivers and personal support workers
              in communities across Ontario. Find in-home care near you:
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {SEO_CITIES.filter((c) => c.key !== currentSlug)
                .slice(0, 20)
                .map((c) => (
                  <Link
                    key={c.key}
                    to={`/home-care-${c.key}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Home Care in {c.label}
                  </Link>
                ))}
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
              {SEO_CITIES.filter((c) => c.key !== currentSlug)
                .slice(0, 12)
                .map((c) => (
                  <Link
                    key={`psw-${c.key}`}
                    to={`/psw-${c.key}`}
                    className="text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    PSWs in {c.label}
                  </Link>
                ))}
              <Link
                to="/ontario-psw-locations"
                className="text-xs text-primary font-medium hover:underline"
              >
                View All Ontario Locations →
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default PrivateHomeCareSection;

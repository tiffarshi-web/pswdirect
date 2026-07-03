import { Link } from "react-router-dom";
import { MapPin, HeartPulse, Building2, HelpCircle, Clock, ShieldCheck, Activity, Users, Stethoscope, Landmark, Bus } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { cityToSlug, getNearbyCities } from "@/lib/seoCityData";
import { getLocalHospitals, hasLocalHospitals } from "@/lib/localHospitalData";
import {
  getWhyChooseParagraphs,
  getCommonNeeds,
  getAvailabilityCopy,
  getAuthorityCopy,
  getInlineLinkParagraph,
  getLocalFAQs,
  getRotatedNearbyCommunities,
} from "@/lib/localContentEngine";
import { buildFAQSchema } from "@/lib/seoShared";
import { SITE_URL } from "@/lib/seoUtils";

/**
 * SEO Phase 2 — Unique local authority block.
 *
 * Purely additive. Renders below existing content on city+service and city-only
 * SEO templates. Uses deterministic (city, service) hashing so content is stable
 * across SSR / crawler visits but varies from page to page.
 *
 * Emits its own FAQPage / Place / AdministrativeArea JSON-LD without touching
 * existing schema blocks on the parent page.
 */

interface Props {
  city: string;
  /** Service key (e.g. "post-surgery-care"). Optional — city-only pages omit it. */
  service?: string;
  /** Human label for the current service, used in copy. */
  serviceLabel?: string;
  /** Canonical URL of the parent page — used inside emitted schema. */
  canonicalUrl?: string;
}

/** Parse `[Label](/route)` markers into React nodes. */
function renderInlineLinks(text: string) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <Link key={`il-${idx++}`} to={m[2]} className="text-primary hover:underline font-medium">
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const LocalAuthorityContent = ({ city, service, serviceLabel, canonicalUrl }: Props) => {
  const citySlug = cityToSlug(city);
  const nearbyAll = getNearbyCities(city);
  const nearby = getRotatedNearbyCommunities(nearbyAll, city, service, 6);
  const hospitals = getLocalHospitals(city);
  const showHospitals = hasLocalHospitals(city);

  const whyChoose = getWhyChooseParagraphs(city, service);
  const commonNeeds = getCommonNeeds(city, service);
  const availability = getAvailabilityCopy(city, service);
  const authority = getAuthorityCopy(city, service);
  const inlineLinks = getInlineLinkParagraph(city, citySlug, service);
  const localFAQs = getLocalFAQs(city, service);

  const url = canonicalUrl ?? `${SITE_URL}/`;
  const areaServedSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceLabel ? `${serviceLabel} in ${city}` : `Home Care in ${city}`,
    provider: { "@type": "Organization", name: "PSW Direct", url: SITE_URL },
    areaServed: [
      {
        "@type": "City",
        name: city,
        containedInPlace: { "@type": "AdministrativeArea", name: "Ontario", "@id": "https://en.wikipedia.org/wiki/Ontario" },
      },
      ...nearby.map((n) => ({ "@type": "Place", name: n })),
    ],
    url,
  };

  return (
    <>
      <Helmet>
        {/* Additional AreaServed / Place schema — does not replace existing schema */}
        <script type="application/ld+json">{JSON.stringify(areaServedSchema)}</script>
        {/* Second FAQPage — Google supports multiple, and this one is scoped to the local FAQs */}
        <script type="application/ld+json">{JSON.stringify(buildFAQSchema(localFAQs))}</script>
      </Helmet>

      {/* Why families in {city} choose PSW Direct */}
      <section className="px-4 py-12 border-t border-border bg-background" aria-label={`Why families in ${city} choose PSW Direct`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Why families in {city} choose PSW Direct
          </h2>
          {whyChoose.map((p, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-4">{p}</p>
          ))}
          <p className="text-muted-foreground leading-relaxed mb-2">
            {renderInlineLinks(inlineLinks)}
          </p>
        </div>
      </section>

      {/* Common care needs in {city} */}
      <section className="px-4 py-12 border-t border-border bg-muted/40" aria-label={`Common care needs in ${city}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-primary" />
            Common care needs in {city}
          </h2>
          <ul className="space-y-3">
            {commonNeeds.map((need, i) => (
              <li key={`${need.key}-${i}`} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <span className="text-muted-foreground leading-relaxed">{need.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Serving {city} & Nearby Communities */}
      {nearby.length > 0 && (
        <section className="px-4 py-12 border-t border-border bg-background" aria-label={`Serving ${city} and nearby communities`}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              Serving {city} & Nearby Communities
            </h2>
            <p className="text-muted-foreground mb-5">
              PSWs dispatched to {city} routinely serve families throughout:
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground">
              {nearby.map((n) => (
                <li key={n} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Local hospitals — only when verified data exists */}
      {showHospitals && (
        <section className="px-4 py-12 border-t border-border bg-muted/40" aria-label={`Hospitals and healthcare facilities near ${city}`}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Local hospitals and healthcare facilities
            </h2>
            <p className="text-muted-foreground mb-5">
              PSWs supporting hospital-to-home transitions in {city} regularly work with families
              discharged from the following facilities:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
              {hospitals.map((h) => (
                <li key={h.name} className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                  <span>
                    {h.name}
                    {h.proximity ? <span className="text-xs opacity-70"> ({h.proximity} {city})</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-4 opacity-70">
              PSW Direct is not affiliated with any hospital listed. Facilities are named here
              for informational purposes only.
            </p>
          </div>
        </section>
      )}

      {/* Service availability in {city} */}
      <section className="px-4 py-12 border-t border-border bg-background" aria-label={`Service availability in ${city}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Service availability in {city}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">{availability}</p>
          <p className="text-muted-foreground leading-relaxed">{authority}</p>
        </div>
      </section>

      {/* Local FAQ */}
      <section className="px-4 py-12 border-t border-border bg-muted/40" aria-label={`Frequently asked questions about care in ${city}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            {city} — Frequently asked questions
          </h2>
          <div className="space-y-5">
            {localFAQs.map((f, i) => (
              <div key={i} className="border-b border-border pb-4 last:border-0">
                <h3 className="font-semibold text-foreground mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default LocalAuthorityContent;

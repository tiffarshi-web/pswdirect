import { Helmet } from "react-helmet-async";
import {
  ShieldCheck,
  FileCheck2,
  ClipboardList,
  Lock,
  Pill,
  Stethoscope,
  BookOpen,
  Users,
} from "lucide-react";
import { BUSINESS_CONTACT, BUSINESS_POSTAL_ADDRESS } from "@/lib/contactConfig";
import { SITE_URL, OG_IMAGE } from "@/lib/seoUtils";

interface Props {
  city: string;
  serviceLabel?: string;
  canonicalUrl?: string;
}

/**
 * SEO Phase 7 — EEAT (Experience, Expertise, Authoritativeness, Trust).
 *
 * Purely additive. Renders factual EEAT sections and emits enriched
 * LocalBusiness + Service JSON-LD scoped to the parent page's canonical URL.
 *
 * Claims policy: only facts verifiable from platform behaviour or Ontario
 * regulations are stated here. No fabricated insurance amounts, no invented
 * "years of experience" figures, no unverifiable certifications.
 */
const EEATContent = ({ city, serviceLabel, canonicalUrl }: Props) => {
  const service = serviceLabel ?? "Home Care";
  const url = canonicalUrl ?? SITE_URL;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness", "HealthAndBeautyBusiness"],
    "@id": `${SITE_URL}#organization`,
    name: "PSW Direct",
    alternateName: "PSW Direct — Ontario Personal Support Workers",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    image: OG_IMAGE,
    telephone: BUSINESS_CONTACT.phoneInternational,
    priceRange: "$$",
    address: {
      ...BUSINESS_POSTAL_ADDRESS,
      postalCode: BUSINESS_CONTACT.postalCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS_CONTACT.lat,
      longitude: BUSINESS_CONTACT.lng,
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Ontario, Canada",
    },
    knowsAbout: [
      "Personal Support Worker services",
      "Home Care",
      "Senior Care",
      "Dementia Care",
      "Alzheimer's Care",
      "Post-Surgery Recovery",
      "Rehabilitation support",
      "Hospital Discharge Planning",
      "Palliative Care support",
      "Respite Care",
      "Companion Care",
      "Medication reminders",
      "Fall Prevention",
      "Mobility Assistance",
      "Ontario Health atHome",
      "PHIPA",
    ],
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "certification",
        name: "Ontario PSW Certificate verification",
        recognizedBy: { "@type": "Organization", name: "Ministry of Colleges and Universities (Ontario)" },
      },
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "background check",
        name: "Vulnerable Sector Screening (police background check)",
        recognizedBy: { "@type": "Organization", name: "Canadian Police Information Centre (CPIC)" },
      },
    ],
    slogan: "Vetted Personal Support Workers, same-day across Ontario.",
  };

  const service_schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: service,
    name: `${service} in ${city}, Ontario`,
    provider: { "@id": `${SITE_URL}#organization` },
    areaServed: [
      { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } },
    ],
    audience: { "@type": "PeopleAudience", audienceType: "Seniors, post-surgical patients, family caregivers" },
    termsOfService: `${SITE_URL}/terms`,
    hoursAvailable: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "CAD",
      price: "35",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceCurrency: "CAD",
        price: "35",
        unitCode: "HUR",
        unitText: "per hour",
      },
      availability: "https://schema.org/InStock",
      areaServed: { "@type": "City", name: city },
      url,
    },
    url,
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(localBusiness)}</script>
        <script type="application/ld+json">{JSON.stringify(service_schema)}</script>
      </Helmet>

      {/* PSW screening & Ontario regulations */}
      <section
        className="px-4 py-12 border-t border-border bg-background"
        aria-label={`How PSW Direct screens caregivers serving ${city}`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            How we screen every PSW serving {city}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            PSW Direct is an Ontario-based platform. Every caregiver we
            dispatch to {city} completes the same multi-step verification
            before their first shift, and re-verification on an ongoing basis
            once active on the platform.
          </p>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Ontario PSW certificate.</strong> We verify the
                caregiver holds a Personal Support Worker certificate issued
                by an Ontario college or a Ministry of Colleges and
                Universities-approved private career college. Nurses (RN/RPN)
                on the platform are verified against the College of Nurses of
                Ontario public register.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Government-issued photo ID.</strong> Every caregiver
                uploads a valid provincial photo ID matching the name on their
                credentials. Identity is re-confirmed at each in-home check-in
                using a geofenced sign-in.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Vulnerable Sector Screening (VSC).</strong> A recent
                police background check — including the Vulnerable Sector
                component — is required. VSC certificates on the platform are
                tracked with an expiry rule of one year; caregivers whose VSC
                lapses are automatically flagged and cannot be dispatched
                until it is renewed.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>References and interview.</strong> Applicants
                complete a written screening and are interviewed by our team
                before activation. Deactivation for cause is enforced through
                a disciplinary system that tracks flags, warnings, and
                incident reports.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Ongoing compliance.</strong> PSWs must keep
                identification, VSC, and eligibility to work documents
                current. Missing or expired documents suspend their ability
                to accept new shifts.
              </span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4 opacity-70">
            PSW Direct verifies documents at onboarding and monitors expiries
            on an ongoing basis. Verification is not a substitute for
            regulated clinical oversight, which is provided by publicly
            regulated professionals in the client's circle of care.
          </p>
        </div>
      </section>

      {/* Caregiver qualifications & experience */}
      <section
        className="px-4 py-12 border-t border-border bg-muted/40"
        aria-label={`Caregiver qualifications and experience serving ${city}`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Professional caregiver qualifications
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            PSWs on the platform serving {city} bring Ontario-recognised PSW
            training and hands-on care experience across a range of settings —
            private homes, retirement residences, long-term care, hospital
            transitions, and community programs. Because we let families
            review each caregiver's profile before confirming a booking, the
            experience most relevant to your loved one — dementia routines,
            post-operative mobility, palliative comfort care, or complex
            transfers — is visible before care starts, not after.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Where a booking calls for a Registered Nurse (RN) or Registered
            Practical Nurse (RPN) — for example, medication administration or
            wound care — we match a nurse whose current registration is
            verified on the College of Nurses of Ontario public register.
          </p>
        </div>
      </section>

      {/* Care standards & Ontario regulations */}
      <section
        className="px-4 py-12 border-t border-border bg-background"
        aria-label={`Ontario care standards and regulations`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Care standards and Ontario regulations we follow
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>PHIPA (Personal Health Information Protection Act, 2004).</strong>{" "}
                Client health information is handled in line with Ontario's
                PHIPA rules — including least-privilege access, encrypted
                storage, and audit logging.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Home Care and Community Services Act framework.</strong>{" "}
                Publicly funded home care in Ontario is coordinated by
                Ontario Health atHome. PSW Direct is a private provider and
                complements — rather than replaces — this framework.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Health Protection and Promotion Act.</strong>{" "}
                PSWs follow infection-prevention practices consistent with
                Public Health Ontario guidance, including hand hygiene, PPE
                use where indicated, and staying home when unwell.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Ontario Employment Standards and Occupational Health &amp; Safety Acts.</strong>{" "}
                We operate within Ontario's employment and workplace safety
                rules, including safe-lift practices and refusal-of-unsafe-work
                protections for caregivers.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Care planning */}
      <section
        className="px-4 py-12 border-t border-border bg-muted/40"
        aria-label={`Care planning process for ${city}`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Our care planning process
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Every booking in {city} is anchored in a written care plan the
            family sees before the first shift starts. The plan captures:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
            <li>• Care recipient details and preferred name</li>
            <li>• Care tasks (personal care, mobility, meal prep, etc.)</li>
            <li>• Medication reminder times, if any</li>
            <li>• Mobility aids and transfer method</li>
            <li>• Dementia routines, triggers, and comfort tools</li>
            <li>• Emergency contact and escalation preferences</li>
            <li>• Access instructions and pets on site</li>
            <li>• Communication preferences with family</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            After each visit, the PSW completes a digital care sheet
            documenting what was done and any observations to share with
            family. Care plans are updated by family or admin as needs change,
            with a full audit trail behind the scenes.
          </p>
        </div>
      </section>

      {/* Client safety & privacy */}
      <section
        className="px-4 py-12 border-t border-border bg-background"
        aria-label={`Client safety and privacy policies`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Client safety and privacy policies
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Geofenced check-in and check-out.</strong> The PSW's
                sign-in is location-verified against the {city} service
                address before the shift starts, which prevents remote or
                falsified time entries.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Client PII protection.</strong> Caregivers see only
                the first name and address of the client they are booked
                with. Full contact details are visible only to authorised
                administrators. Client and caregiver messages are relayed
                through the platform, not shared numbers.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Payment security.</strong> Card payments are
                processed by Stripe. PSW Direct does not store full card
                numbers or CVV values on our servers.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Contact-info guardrails.</strong> The booking flow
                blocks personal phone numbers and email addresses inside
                free-text booking instructions — clients and caregivers stay
                inside our audit-logged communication channel.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <span>
                <strong>Incident reporting.</strong> Any safety concern
                during a {city} shift is escalated to the office line at{" "}
                <a href={BUSINESS_CONTACT.phoneTel} className="text-primary hover:underline">
                  {BUSINESS_CONTACT.phone}
                </a>
                . For a medical emergency, call 911 first.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Medication assistance */}
      <section
        className="px-4 py-12 border-t border-border bg-muted/40"
        aria-label={`Medication assistance policy`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" />
            Medication assistance policy
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Within the Ontario scope of practice, PSWs assist with — but do
            not independently administer — most prescription medication.
            Specifically, our PSWs in {city} can:
          </p>
          <ul className="space-y-2 text-muted-foreground mb-4">
            <li>• Remind the client to take medication at the scheduled time</li>
            <li>• Open pre-packaged blister packs or dosettes filled by a pharmacy</li>
            <li>• Hand the client a glass of water and observe self-administration</li>
            <li>• Document what was taken (or missed) in the digital care sheet</li>
            <li>• Alert family or the office if doses are missed or refused</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Injections, controlled-substance administration, and complex
            medication regimens are performed by a Registered Nurse (RN) or
            Registered Practical Nurse (RPN) whose registration is verified
            on the College of Nurses of Ontario public register. If your
            care plan requires nursing-level medication administration, book
            a nurse visit instead of a PSW visit.
          </p>
        </div>
      </section>

      {/* Hospital discharge expertise */}
      <section
        className="px-4 py-12 border-t border-border bg-background"
        aria-label={`Hospital discharge expertise for ${city}`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            Hospital discharge expertise
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Hospital-to-home transitions are one of the highest-risk moments
            in a senior's care journey. PSW Direct handles same-day and
            next-day discharge coverage across {city}, and our PSWs are
            experienced with:
          </p>
          <ul className="space-y-2 text-muted-foreground mb-4">
            <li>• Post-operative mobility support and safe transfers</li>
            <li>• Reinforcing physiotherapy exercise plans between sessions</li>
            <li>• Wound and dressing care reminders (nurse-led when clinical)</li>
            <li>• Medication reminders through the first 14 days home</li>
            <li>• Escort to follow-up appointments and diagnostic imaging</li>
            <li>• Fall-prevention setup — clearing pathways, using transfer belts</li>
            <li>• Reporting concerning symptoms to the family and, where appropriate, 811 or 911</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            We regularly work alongside Ontario Health atHome case managers
            and hospital discharge planners in {city} to arrange coverage
            before the ambulance leaves the hospital.
          </p>
        </div>
      </section>

      {/* Insurance & responsibility — hedged, no fabricated figures */}
      <section
        className="px-4 py-12 border-t border-border bg-muted/40"
        aria-label={`Insurance and responsibility framework`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Insurance and responsibility
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            PSW Direct operates as an Ontario platform matching families with
            Personal Support Workers. Caregivers on the platform are
            responsible for maintaining professional coverage appropriate to
            their engagement type, and PSW Direct maintains platform-level
            commercial coverage consistent with operating an on-demand
            services marketplace in Ontario.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            For coverage specifics — certificates, limits, and named
            insured — contact our office at{" "}
            <a href={BUSINESS_CONTACT.phoneTel} className="text-primary hover:underline">
              {BUSINESS_CONTACT.phone}
            </a>
            . We provide current coverage information on written request for
            corporate accounts, retirement residences, and third-party
            payers.
          </p>
        </div>
      </section>
    </>
  );
};

export default EEATContent;
